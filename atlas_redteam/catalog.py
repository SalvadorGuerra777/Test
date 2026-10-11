"""
MITRE ATLAS catalog loader.

ATLAS (Adversarial Threat Landscape for AI Systems) is MITRE's public,
educational knowledge base of adversary tactics and techniques against
AI-enabled systems — the AI counterpart to MITRE ATT&CK.

Source data: https://github.com/mitre-atlas/atlas-data (Apache-2.0).
This module loads the distributed `ATLAS-latest.yaml` and exposes a clean,
queryable in-memory model: tactics, techniques (+ sub-techniques),
mitigations and case studies, with the technique<->tactic and
technique<->mitigation relationships resolved.
"""

from __future__ import annotations

import functools
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

# Pinned catalog shipped with the package for reproducible evaluations.
DEFAULT_CATALOG = Path(__file__).resolve().parent.parent / "data" / "ATLAS-latest.yaml"


@dataclass(frozen=True)
class Tactic:
    id: str
    name: str
    description: str

    def short(self) -> str:
        return f"{self.id} — {self.name}"


@dataclass(frozen=True)
class Technique:
    id: str
    name: str
    description: str
    is_subtechnique: bool
    parent_id: str | None
    tactics: tuple[str, ...]          # resolved tactic ids
    mitigations: tuple[str, ...]      # resolved mitigation ids

    def short(self) -> str:
        return f"{self.id} — {self.name}"


@dataclass(frozen=True)
class Mitigation:
    id: str
    name: str
    description: str
    techniques: tuple[str, ...] = ()


@dataclass(frozen=True)
class ProcedureStep:
    step_id: str
    technique_id: str
    tactic_id: str | None
    description: str
    leads_to: tuple[str, ...]


@dataclass(frozen=True)
class CaseStudy:
    id: str
    name: str
    summary: str
    target: str | None
    actor: str | None
    date: str | None
    procedure: tuple[ProcedureStep, ...]

    def technique_ids(self) -> list[str]:
        return sorted({s.technique_id for s in self.procedure})


@dataclass
class AtlasCatalog:
    version: str
    tactics: dict[str, Tactic] = field(default_factory=dict)
    techniques: dict[str, Technique] = field(default_factory=dict)
    mitigations: dict[str, Mitigation] = field(default_factory=dict)
    case_studies: dict[str, CaseStudy] = field(default_factory=dict)

    # ---- lookups -----------------------------------------------------------
    def get_technique(self, tid: str) -> Technique | None:
        return self.techniques.get(tid.strip().upper())

    def get_tactic(self, tid: str) -> Tactic | None:
        return self.tactics.get(tid.strip().upper())

    def get_mitigation(self, mid: str) -> Mitigation | None:
        return self.mitigations.get(mid.strip().upper())

    def get_case_study(self, cid: str) -> CaseStudy | None:
        return self.case_studies.get(cid.strip().upper())

    def techniques_for_tactic(self, tactic_id: str) -> list[Technique]:
        tactic_id = tactic_id.strip().upper()
        return [t for t in self.techniques.values() if tactic_id in t.tactics]

    def search(self, query: str, kinds: tuple[str, ...] = ("technique", "tactic", "case_study", "mitigation")) -> list[dict[str, Any]]:
        """Case-insensitive substring search across names and descriptions."""
        q = query.strip().lower()
        hits: list[dict[str, Any]] = []
        if "tactic" in kinds:
            for t in self.tactics.values():
                if q in t.name.lower() or q in t.description.lower():
                    hits.append({"kind": "tactic", "id": t.id, "name": t.name})
        if "technique" in kinds:
            for t in self.techniques.values():
                if q in t.name.lower() or q in t.description.lower():
                    hits.append({"kind": "technique", "id": t.id, "name": t.name,
                                 "subtechnique": t.is_subtechnique})
        if "mitigation" in kinds:
            for m in self.mitigations.values():
                if q in m.name.lower() or q in m.description.lower():
                    hits.append({"kind": "mitigation", "id": m.id, "name": m.name})
        if "case_study" in kinds:
            for c in self.case_studies.values():
                if q in c.name.lower() or q in c.summary.lower():
                    hits.append({"kind": "case_study", "id": c.id, "name": c.name})
        return hits

    def stats(self) -> dict[str, int | str]:
        return {
            "version": self.version,
            "tactics": len(self.tactics),
            "techniques": len(self.techniques),
            "subtechniques": sum(1 for t in self.techniques.values() if t.is_subtechnique),
            "mitigations": len(self.mitigations),
            "case_studies": len(self.case_studies),
        }


def _derive_relationships(raw: dict[str, Any]) -> tuple[dict[str, set[str]], dict[str, set[str]], dict[str, str | None]]:
    """
    The dist YAML stores technique->tactic associations implicitly inside
    case-study `employs` steps, and technique->mitigation under per-object
    relationships. We resolve both into id->set maps. Also returns
    subtechnique parent map derived from the dotted id convention
    (AML.T0051.000 is a sub-technique of AML.T0051).
    """
    tech_tactics: dict[str, set[str]] = {}
    tech_mitigs: dict[str, set[str]] = {}
    parents: dict[str, str | None] = {}

    rels = raw.get("relationships", {})
    # rels is keyed by source id -> {relationship-type: [entries]}
    for _src, groups in rels.items():
        if not isinstance(groups, dict):
            continue
        for rtype, entries in groups.items():
            for e in entries or []:
                target = e.get("target")
                tactic = e.get("tactic")
                if rtype == "employs" and target and tactic:
                    tech_tactics.setdefault(target, set()).add(tactic)
                if rtype == "mitigates":
                    # mitigation -> technique
                    mid = e.get("source")
                    if mid and target:
                        tech_mitigs.setdefault(target, set()).add(mid)

    # Sub-technique parent from dotted id convention.
    for tid in raw.get("techniques", {}):
        if tid.count(".") == 2:  # AML.Txxxx.yyy
            parents[tid] = tid.rsplit(".", 1)[0]
        else:
            parents[tid] = None

    return tech_tactics, tech_mitigs, parents


@functools.lru_cache(maxsize=4)
def load_catalog(path: str | Path | None = None) -> AtlasCatalog:
    """Load and cache the ATLAS catalog from a dist YAML file."""
    path = Path(path) if path else DEFAULT_CATALOG
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))

    version = str(raw.get("collection", {}).get("version", "unknown"))
    cat = AtlasCatalog(version=version)

    for tid, t in raw.get("tactics", {}).items():
        cat.tactics[tid] = Tactic(id=tid, name=t.get("name", tid),
                                  description=t.get("description", ""))

    tech_tactics, tech_mitigs, parents = _derive_relationships(raw)

    for tid, t in raw.get("techniques", {}).items():
        parent = parents.get(tid)
        cat.techniques[tid] = Technique(
            id=tid,
            name=t.get("name", tid),
            description=t.get("description", ""),
            is_subtechnique=parent is not None,
            parent_id=parent,
            tactics=tuple(sorted(tech_tactics.get(tid, set()))),
            mitigations=tuple(sorted(tech_mitigs.get(tid, set()))),
        )

    # Build reverse mitigation->technique list.
    mitig_tech: dict[str, set[str]] = {}
    for tech_id, mids in tech_mitigs.items():
        for mid in mids:
            mitig_tech.setdefault(mid, set()).add(tech_id)

    for mid, m in raw.get("mitigations", {}).items():
        cat.mitigations[mid] = Mitigation(
            id=mid, name=m.get("name", mid),
            description=m.get("description", ""),
            techniques=tuple(sorted(mitig_tech.get(mid, set()))),
        )

    # Case studies: pull procedure steps from relationships `employs`.
    rels = raw.get("relationships", {})
    for cid, c in raw.get("case-studies", {}).items():
        steps: list[ProcedureStep] = []
        groups = rels.get(cid, {})
        for e in (groups.get("employs", []) if isinstance(groups, dict) else []):
            steps.append(ProcedureStep(
                step_id=e.get("step-id", ""),
                technique_id=e.get("target", ""),
                tactic_id=e.get("tactic"),
                description=e.get("description", ""),
                leads_to=tuple(e.get("leads-to", []) or []),
            ))
        steps.sort(key=lambda s: s.step_id)
        cat.case_studies[cid] = CaseStudy(
            id=cid,
            name=c.get("name", cid),
            summary=c.get("description", ""),
            target=c.get("target"),
            actor=c.get("actor"),
            date=c.get("date"),
            procedure=tuple(steps),
        )

    return cat


if __name__ == "__main__":
    cat = load_catalog()
    print("ATLAS catalog loaded:", cat.stats())
    pi = cat.get_technique("AML.T0051")
    print("\nExample:", pi.short() if pi else "n/a")
    if pi:
        print("  tactics:", [cat.get_tactic(t).name for t in pi.tactics if cat.get_tactic(t)])
