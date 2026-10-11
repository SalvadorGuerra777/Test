#!/usr/bin/env python3
"""
End-to-end MCP client demo: spawns the atlas-redteam MCP server over stdio,
lists tools, queries the ATLAS catalog, and drives the full red-team loop
(get_probe -> deliver to a target -> judge_response) the way a real MCP
orchestrator would.
"""
from __future__ import annotations

import asyncio
import json

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

# A stand-in "target under test" the client controls. In a real run this is
# your chatbot/agent. Here we inline the vulnerable mock so the demo is
# self-contained end-to-end through the MCP boundary.
from atlas_redteam.agent import DEFAULT_SYSTEM, MockAgent, make_turn
from atlas_redteam.corpus import build_corpus

_CORPUS = {p.id: p for p in build_corpus()}


async def _text(session: ClientSession, tool: str, **args) -> object:
    res = await session.call_tool(tool, args)
    # The SDK returns content blocks; structured result is in .structured_content.
    structured = getattr(res, "structured_content", None)
    if structured is not None:
        # tools returning a list are wrapped as {"result": [...]}
        return structured.get("result", structured) if isinstance(structured, dict) else structured
    return "".join(getattr(b, "text", "") for b in res.content)


async def main() -> None:
    params = StdioServerParameters(command="python", args=["-m", "atlas_redteam.mcp_server"])
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = await session.list_tools()
            print(f"Connected. {len(tools.tools)} tools available.\n")

            stats = await _text(session, "atlas_stats")
            print("ATLAS catalog:", json.dumps(stats, indent=2), "\n")

            tech = await _text(session, "atlas_get_technique", technique_id="AML.T0051")
            print("Technique AML.T0051:", tech.get("name"),
                  "| mitigations:", [m["id"] for m in tech.get("mitigations", [])], "\n")

            probes = await _text(session, "list_probes")
            print(f"Probe corpus: {len(probes)} probes\n")

            # Drive the loop against the client-controlled target.
            target = MockAgent(name="client-target")  # vulnerable
            breached = 0
            print("Running probes through the MCP judge:")
            for pid in _CORPUS:
                probe = _CORPUS[pid]
                turn = make_turn(probe, system=DEFAULT_SYSTEM)
                response = target.respond(turn)         # <- your agent here
                verdict = await _text(session, "judge_response",
                                      probe_id=pid, response=response)
                flag = "VULN" if verdict["vulnerable"] else "ok  "
                breached += int(verdict["vulnerable"])
                print(f"  [{flag}] {pid:14} {verdict['atlas_technique']:11} "
                      f"{verdict['rationale'][:46]}")
            print(f"\nResult: {breached}/{len(_CORPUS)} probes breached the target.")


if __name__ == "__main__":
    asyncio.run(main())
