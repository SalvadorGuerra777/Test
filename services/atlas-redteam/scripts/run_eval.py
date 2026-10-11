#!/usr/bin/env python3
"""
CLI: run the red-team evaluation and write JSON + HTML reports.

Examples
--------
    python scripts/run_eval.py --target vulnerable
    python scripts/run_eval.py --target hardened --out reports/hardened
    python scripts/run_eval.py --adaptive --rounds 5
"""
from __future__ import annotations

import argparse
from pathlib import Path

from atlas_redteam.agent import MockAgent
from atlas_redteam.catalog import load_catalog
from atlas_redteam.harness import run_adaptive, run_eval
from atlas_redteam.report import write_html, write_json

HARDENED = {"ignore_override", "never_reveal_note", "distrust_context",
            "enforce_scope", "block_actions", "bound_output"}


def main() -> None:
    ap = argparse.ArgumentParser(description="ATLAS AI red-team evaluation")
    ap.add_argument("--target", choices=["vulnerable", "hardened"], default="vulnerable",
                    help="built-in demo target profile")
    ap.add_argument("--adaptive", action="store_true", help="run attacker/defender loop")
    ap.add_argument("--rounds", type=int, default=4)
    ap.add_argument("--out", default="reports/report", help="output path prefix")
    args = ap.parse_args()

    catalog = load_catalog()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    if args.adaptive:
        agent = MockAgent(name="demo-adaptive")
        res = run_adaptive(agent, catalog=catalog, max_rounds=args.rounds)
        final = res.rounds[-1]
        print(f"Adaptive loop: {len(res.rounds)} rounds | "
              f"risk {res.summary()['risk_trajectory']} | "
              f"vulns {res.summary()['vulns_trajectory']}")
        write_json(final, f"{out}.json")
        write_html(final, f"{out}.html", catalog=catalog)
    else:
        guard = HARDENED if args.target == "hardened" else set()
        agent = MockAgent(name=f"demo-{args.target}", guardrails=guard)
        report = run_eval(agent, catalog=catalog)
        print(f"Target '{agent.name}': risk score {report.risk_score()} | "
              f"{len(report.vulnerabilities)}/{report.total} probes breached")
        write_json(report, f"{out}.json")
        write_html(report, f"{out}.html", catalog=catalog)

    print(f"Wrote {out}.json and {out}.html")


if __name__ == "__main__":
    main()
