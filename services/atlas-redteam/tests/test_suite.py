"""Smoke + behavior tests. Run: python -m pytest tests/ -q  (or: python tests/test_suite.py)"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from atlas_redteam.agent import MockAgent
from atlas_redteam.catalog import load_catalog
from atlas_redteam.corpus import CANARY, build_corpus
from atlas_redteam.harness import run_adaptive, run_eval

HARDENED = {"ignore_override", "never_reveal_note", "distrust_context",
            "enforce_scope", "block_actions", "bound_output"}


def test_catalog_loads():
    cat = load_catalog()
    assert len(cat.tactics) > 10 and len(cat.techniques) > 100
    assert cat.get_technique("AML.T0051").name == "LLM Prompt Injection"
    # technique resolves to tactics and mitigations
    assert cat.get_technique("AML.T0051").mitigations


def test_corpus_maps_to_real_techniques():
    cat = load_catalog()
    for p in build_corpus():
        assert cat.get_technique(p.atlas_technique) is not None, p.atlas_technique


def test_vulnerable_agent_is_breached():
    r = run_eval(MockAgent(name="v"))
    assert r.risk_score() == 100
    assert len(r.vulnerabilities) == r.total


def test_hardened_agent_defends():
    r = run_eval(MockAgent(name="h", guardrails=set(HARDENED)))
    assert r.risk_score() == 0
    assert not r.vulnerabilities


def test_canary_never_in_hardened_output():
    r = run_eval(MockAgent(name="h", guardrails=set(HARDENED)))
    for f in r.findings:
        assert CANARY not in f.response_excerpt


def test_adaptive_loop_converges():
    res = run_adaptive(MockAgent(name="a"), max_rounds=6)
    traj = res.summary()["vulns_trajectory"]
    assert traj[0] > 0          # starts vulnerable
    assert traj[-1] == 0        # defender wins
    assert len(traj) >= 2


def _run_all():
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"  PASS {fn.__name__}")
    print(f"\n{len(fns)} tests passed.")


if __name__ == "__main__":
    _run_all()
