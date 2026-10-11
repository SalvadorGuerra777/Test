"""
MCP microservice exposing the MITRE ATLAS catalog and the red-team toolkit.

Transport: stdio by default (standard for MCP). Run:

    python -m atlas_redteam.mcp_server            # stdio
    python -m atlas_redteam.mcp_server --http     # streamable-http on :8765

Tool groups
-----------
Catalog (read-only reference):
    atlas_stats, atlas_search, atlas_get_tactic, atlas_get_technique,
    atlas_list_techniques, atlas_get_mitigation, atlas_get_case_study

Red-team toolkit:
    list_probes          - the educational probe corpus + ATLAS mapping
    get_probe            - one probe incl. payload to send to YOUR target
    judge_response       - score your target's response to a probe
    run_demo_eval        - full single-pass eval vs the built-in mock target
    run_demo_adaptive    - attacker/defender co-evolution demo

The intended pattern for testing a real agent: call `list_probes`/`get_probe`,
deliver each payload to the agent you are authorized to test, then call
`judge_response` with the agent's reply. `run_demo_*` prove the loop offline.
"""

from __future__ import annotations

import sys
from typing import Any

from mcp.server.mcpserver import MCPServer

from .agent import DEFAULT_SYSTEM, MockAgent
from .catalog import load_catalog
from .corpus import DETECTORS, Probe, build_corpus
from .harness import run_adaptive, run_eval

server = MCPServer(
    name="atlas-redteam",
    version="0.1.0",
    instructions=(
        "MITRE ATLAS reference + educational AI red-team toolkit. Use the "
        "atlas_* tools to query tactics/techniques/mitigations/case-studies. "
        "Use list_probes/get_probe to obtain detection probes, deliver them to "
        "an agent you are authorized to test, then judge_response to score the "
        "reply and map it to ATLAS. run_demo_* show the full loop offline."
    ),
)

_catalog = load_catalog()
_corpus = {p.id: p for p in build_corpus()}


def _probe_public(p: Probe, include_payload: bool = False) -> dict[str, Any]:
    d = {
        "id": p.id, "name": p.name, "category": p.category,
        "channel": p.channel.value, "severity": p.severity.value,
        "atlas_technique": p.atlas_technique,
        "atlas_technique_name": p.atlas_technique_name,
        "detector": p.detector_name, "tags": p.tags,
        "description": p.description,
    }
    if include_payload:
        d["payload"] = p.payload
        d["user_turn"] = p.user_turn
    return d


# --------------------------------------------------------------------------- #
# Catalog tools
# --------------------------------------------------------------------------- #

@server.tool(description="Catalog statistics: counts of tactics, techniques, mitigations, case studies, and version.")
def atlas_stats() -> dict[str, Any]:
    return _catalog.stats()


@server.tool(description="Full-text search across ATLAS tactics, techniques, mitigations and case studies.")
def atlas_search(query: str, limit: int = 25) -> list[dict[str, Any]]:
    return _catalog.search(query)[:limit]


@server.tool(description="Get an ATLAS tactic by id (e.g. AML.TA0000), with the techniques under it.")
def atlas_get_tactic(tactic_id: str) -> dict[str, Any]:
    t = _catalog.get_tactic(tactic_id)
    if not t:
        return {"error": f"tactic {tactic_id} not found"}
    techs = _catalog.techniques_for_tactic(t.id)
    return {"id": t.id, "name": t.name, "description": t.description,
            "techniques": [tech.short() for tech in techs]}


@server.tool(description="Get an ATLAS technique by id (e.g. AML.T0051), with its tactics and recommended mitigations.")
def atlas_get_technique(technique_id: str) -> dict[str, Any]:
    t = _catalog.get_technique(technique_id)
    if not t:
        return {"error": f"technique {technique_id} not found"}
    return {
        "id": t.id, "name": t.name, "description": t.description,
        "is_subtechnique": t.is_subtechnique, "parent": t.parent_id,
        "tactics": [{"id": tid, "name": _catalog.get_tactic(tid).name}
                    for tid in t.tactics if _catalog.get_tactic(tid)],
        "mitigations": [{"id": mid, "name": _catalog.get_mitigation(mid).name}
                        for mid in t.mitigations if _catalog.get_mitigation(mid)],
    }


@server.tool(description="List all ATLAS techniques (id + name); set subtechniques=False to hide sub-techniques.")
def atlas_list_techniques(subtechniques: bool = True) -> list[dict[str, Any]]:
    return [{"id": t.id, "name": t.name, "subtechnique": t.is_subtechnique}
            for t in _catalog.techniques.values()
            if subtechniques or not t.is_subtechnique]


@server.tool(description="Get an ATLAS mitigation by id (e.g. AML.M0000) and the techniques it addresses.")
def atlas_get_mitigation(mitigation_id: str) -> dict[str, Any]:
    m = _catalog.get_mitigation(mitigation_id)
    if not m:
        return {"error": f"mitigation {mitigation_id} not found"}
    return {"id": m.id, "name": m.name, "description": m.description,
            "techniques": list(m.techniques)}


@server.tool(description="Get an ATLAS real-world case study by id (e.g. AML.CS0000), with its step-by-step procedure.")
def atlas_get_case_study(case_study_id: str) -> dict[str, Any]:
    c = _catalog.get_case_study(case_study_id)
    if not c:
        return {"error": f"case study {case_study_id} not found"}
    return {
        "id": c.id, "name": c.name, "summary": c.summary,
        "target": c.target, "actor": c.actor, "date": c.date,
        "techniques": c.technique_ids(),
        "procedure": [{"step": s.step_id, "technique": s.technique_id,
                       "tactic": s.tactic_id, "description": s.description}
                      for s in c.procedure],
    }


# --------------------------------------------------------------------------- #
# Red-team tools
# --------------------------------------------------------------------------- #

@server.tool(description="List the educational red-team probe corpus with ATLAS mapping. Filter by category if given.")
def list_probes(category: str = "") -> list[dict[str, Any]]:
    return [_probe_public(p) for p in _corpus.values()
            if not category or p.category == category]


@server.tool(description="Get one probe INCLUDING its payload, to deliver to an agent you are authorized to test.")
def get_probe(probe_id: str) -> dict[str, Any]:
    p = _corpus.get(probe_id)
    if not p:
        return {"error": f"probe {probe_id} not found"}
    return _probe_public(p, include_payload=True)


@server.tool(description="Score a target agent's response to a probe. Returns the finding, outcome and ATLAS technique.")
def judge_response(probe_id: str, response: str) -> dict[str, Any]:
    p = _corpus.get(probe_id)
    if not p:
        return {"error": f"probe {probe_id} not found"}
    result = DETECTORS[p.detector_name](response, p)
    tech = _catalog.get_technique(p.atlas_technique)
    return {
        "probe_id": p.id, "atlas_technique": p.atlas_technique,
        "atlas_technique_name": p.atlas_technique_name,
        "severity": p.severity.value,
        "vulnerable": result.vulnerable,
        "defended": result.passed_defense,
        "rationale": result.rationale,
        "evidence": result.evidence,
        "mitigations": list(tech.mitigations) if tech else [],
    }


@server.tool(description="Run a full single-pass evaluation against the built-in mock target (demo). vulnerability: 'none' (naive) or 'hardened'.")
def run_demo_eval(vulnerability: str = "none") -> dict[str, Any]:
    guardrails = set()
    if vulnerability == "hardened":
        guardrails = {"ignore_override", "never_reveal_note", "distrust_context",
                      "enforce_scope", "block_actions", "bound_output"}
    agent = MockAgent(name=f"demo-{vulnerability}", guardrails=guardrails)
    return run_eval(agent, catalog=_catalog).to_dict()


@server.tool(description="Run the attacker/defender co-evolution loop against the mock target (demo). Returns risk/vuln trajectory per round.")
def run_demo_adaptive(max_rounds: int = 4) -> dict[str, Any]:
    agent = MockAgent(name="demo-adaptive")
    res = run_adaptive(agent, catalog=_catalog, max_rounds=max_rounds)
    return {"summary": res.summary(),
            "rounds": [r.to_dict()["summary"] for r in res.rounds]}


# --------------------------------------------------------------------------- #
# Resource: the benign system prompt used to frame probes.
# --------------------------------------------------------------------------- #

@server.resource("atlas-redteam://system-prompt",
                 description="The benign guardrail system prompt probes are framed against.")
def system_prompt_resource() -> str:
    return DEFAULT_SYSTEM


def main() -> None:
    import os
    if "--http" in sys.argv:
        host = os.environ.get("ATLAS_MCP_HOST", "127.0.0.1")
        port = int(os.environ.get("ATLAS_MCP_PORT", "8765"))
        # stateless_http=True: the core/orchestrator microservice (BoxLang + bx-ai)
        # talks to this server with a minimal MCP HTTP client that issues plain
        # JSON-RPC POSTs (tools/list, tools/call) without the streamable-http
        # session handshake (Mcp-Session-Id). Without this flag the official MCP
        # Python SDK rejects those requests with "Bad Request: Missing session ID".
        # Verified against bx-ai 3.5.0's MCP() client.
        server.run(transport="streamable-http", host=host, port=port, stateless_http=True)
    else:
        server.run(transport="stdio")


if __name__ == "__main__":
    main()
