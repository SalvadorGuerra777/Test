"""
Security report generation (JSON + self-contained HTML).

The HTML report is a single file with no external dependencies: an executive
summary, a risk gauge, breakdowns by severity / category / ATLAS technique,
and a detailed finding table with remediation guidance pulled from ATLAS
mitigations.
"""

from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any

from .catalog import AtlasCatalog, load_catalog
from .harness import EvalReport

_SEV_COLOR = {
    "critical": "#b4232c", "high": "#d9641e", "medium": "#c99700",
    "low": "#2f7d4f", "info": "#4a6a8a",
}
_RISK_BAND = [(0, "Minimal", "#2f7d4f"), (20, "Low", "#2f7d4f"),
              (40, "Moderate", "#c99700"), (60, "Elevated", "#d9641e"),
              (80, "Severe", "#b4232c"), (101, "Critical", "#b4232c")]


def _band(score: int) -> tuple[str, str]:
    for threshold, label, color in _RISK_BAND:
        if score < threshold:
            return label, color
    return "Critical", "#b4232c"


def write_json(report: EvalReport, path: str | Path) -> Path:
    path = Path(path)
    path.write_text(json.dumps(report.to_dict(), indent=2), encoding="utf-8")
    return path


def _remediation(technique_id: str, catalog: AtlasCatalog) -> list[str]:
    tech = catalog.get_technique(technique_id)
    if not tech:
        return []
    out = []
    for mid in tech.mitigations:
        m = catalog.get_mitigation(mid)
        if m:
            out.append(f"{m.id} — {m.name}")
    return out


def write_html(report: EvalReport, path: str | Path,
               catalog: AtlasCatalog | None = None) -> Path:
    catalog = catalog or load_catalog()
    path = Path(path)
    d = report.to_dict()
    s = d["summary"]
    score = s["risk_score"]
    band_label, band_color = _band(score)
    e = html.escape

    sev_rows = "".join(
        f'<div class="chip" style="--c:{_SEV_COLOR.get(k,"#888")}">'
        f'<b>{v}</b> {e(k)}</div>'
        for k, v in sorted(s["by_severity"].items(),
                           key=lambda kv: list(_SEV_COLOR).index(kv[0])))

    cat_rows = "".join(
        f"<tr><td>{e(c)}</td><td>{v['vulnerable']}/{v['total']}</td>"
        f"<td><div class='bar'><i style='width:{(v['vulnerable']/v['total']*100) if v['total'] else 0:.0f}%'></i></div></td></tr>"
        for c, v in sorted(d["summary"]["by_category"].items()))

    atlas_rows = "".join(
        f"<tr><td><code>{e(tid)}</code></td><td>{e(info['name'])}</td>"
        f"<td>{info['vulnerable']}/{info['tested']}</td></tr>"
        for tid, info in sorted(d["atlas_coverage"].items()))

    finding_rows = ""
    for f in d["findings"]:
        if not f["vulnerable"]:
            continue
        rem = _remediation(f["atlas_technique"], catalog)
        rem_html = ("<ul>" + "".join(f"<li>{e(r)}</li>" for r in rem) + "</ul>"
                    if rem else "<em>See ATLAS mitigations</em>")
        finding_rows += f"""
        <tr>
          <td><span class="pill" style="--c:{_SEV_COLOR.get(f['severity'],'#888')}">{e(f['severity'])}</span></td>
          <td><b>{e(f['probe_name'])}</b><br><small>{e(f['probe_id'])} · {e(f['channel'])}</small></td>
          <td><code>{e(f['atlas_technique'])}</code> {e(f['atlas_technique_name'])}<br>
              <small>Tactics: {e(', '.join(f['atlas_tactics']) or '—')}</small></td>
          <td>{e(f['rationale'])}<br><small class="ev">{e(f['evidence'][:80])}</small></td>
          <td>{rem_html}</td>
        </tr>"""

    if not finding_rows:
        finding_rows = ('<tr><td colspan="5" class="ok">No vulnerabilities detected — '
                        'the target defended every probe.</td></tr>')

    doc = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ATLAS Red-Team Report — {e(d['target'])}</title>
<style>
  :root {{ color-scheme: light dark;
    --bg:#f6f7f9; --card:#fff; --ink:#1a1d22; --mut:#5b6572; --line:#e3e6ea;
    --accent:#3355ff; }}
  @media (prefers-color-scheme: dark) {{ :root {{
    --bg:#0f1216; --card:#171b21; --ink:#e8ebef; --mut:#9aa6b3; --line:#262c34; }} }}
  * {{ box-sizing:border-box; }}
  body {{ margin:0; font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
    background:var(--bg); color:var(--ink); padding:24px 16px; }}
  .wrap {{ max-width:1000px; margin:0 auto; }}
  h1 {{ font-size:22px; margin:0 0 2px; }}
  .sub {{ color:var(--mut); margin:0 0 20px; font-size:13px; }}
  .card {{ background:var(--card); border:1px solid var(--line); border-radius:12px;
    padding:18px 20px; margin-bottom:16px; }}
  .grid {{ display:grid; grid-template-columns:200px 1fr; gap:20px; align-items:center; }}
  @media (max-width:640px) {{ .grid {{ grid-template-columns:1fr; }} }}
  .gauge {{ text-align:center; }}
  .gauge .num {{ font-size:52px; font-weight:800; line-height:1; color:{band_color}; }}
  .gauge .band {{ display:inline-block; margin-top:6px; padding:3px 10px; border-radius:20px;
    background:{band_color}; color:#fff; font-size:12px; font-weight:700; }}
  .chips {{ display:flex; flex-wrap:wrap; gap:8px; }}
  .chip {{ padding:5px 10px; border-radius:8px; border:1px solid var(--c);
    color:var(--c); font-size:13px; }}
  .chip b {{ font-size:15px; }}
  table {{ width:100%; border-collapse:collapse; font-size:13px; }}
  th,td {{ text-align:left; padding:8px 10px; border-bottom:1px solid var(--line);
    vertical-align:top; }}
  th {{ color:var(--mut); font-weight:600; font-size:11px; text-transform:uppercase;
    letter-spacing:.04em; }}
  code {{ background:rgba(128,128,128,.14); padding:1px 5px; border-radius:4px; font-size:12px; }}
  .pill {{ background:var(--c); color:#fff; padding:2px 9px; border-radius:20px;
    font-size:11px; font-weight:700; text-transform:uppercase; }}
  .bar {{ background:rgba(128,128,128,.18); border-radius:5px; height:9px; overflow:hidden; }}
  .bar i {{ display:block; height:100%; background:{band_color}; }}
  .ev {{ color:var(--mut); font-family:ui-monospace,monospace; }}
  .ok {{ text-align:center; color:#2f7d4f; padding:18px; }}
  h2 {{ font-size:14px; text-transform:uppercase; letter-spacing:.05em; color:var(--mut);
    margin:0 0 10px; }}
  ul {{ margin:4px 0; padding-left:18px; }}
  .foot {{ color:var(--mut); font-size:12px; text-align:center; margin-top:8px; }}
</style></head>
<body><div class="wrap">
  <h1>AI Red-Team Security Report</h1>
  <p class="sub">Target: <b>{e(d['target'])}</b> · MITRE ATLAS {e(d['catalog_version'])}
     · {e(d['started_at'])} · {d['rounds']} round(s)</p>

  <div class="card"><div class="grid">
    <div class="gauge">
      <div class="num">{score}</div>
      <div class="band">{band_label} risk</div>
    </div>
    <div>
      <p style="margin:0 0 10px"><b>{s['vulnerabilities']}</b> of <b>{s['probes_run']}</b>
         probes breached the target.</p>
      <div class="chips">{sev_rows or '<span class="chip" style="--c:#2f7d4f"><b>0</b> findings</span>'}</div>
    </div>
  </div></div>

  <div class="card">
    <h2>Results by test area</h2>
    <table><thead><tr><th>Category</th><th>Breached</th><th></th></tr></thead>
    <tbody>{cat_rows}</tbody></table>
  </div>

  <div class="card">
    <h2>MITRE ATLAS technique coverage</h2>
    <table><thead><tr><th>Technique</th><th>Name</th><th>Breached/Tested</th></tr></thead>
    <tbody>{atlas_rows}</tbody></table>
  </div>

  <div class="card">
    <h2>Findings &amp; remediation</h2>
    <table><thead><tr><th>Sev</th><th>Probe</th><th>ATLAS</th><th>Finding</th>
      <th>Suggested mitigations</th></tr></thead>
    <tbody>{finding_rows}</tbody></table>
  </div>

  <p class="foot">Generated by atlas-redteam · educational AI security evaluation ·
     techniques &amp; mitigations © MITRE ATLAS (Apache-2.0)</p>
</div></body></html>"""
    path.write_text(doc, encoding="utf-8")
    return path
