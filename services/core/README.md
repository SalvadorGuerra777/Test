# core

**Orchestrator microservice.** BoxLang + [bx-ai](https://ai.ortusbooks.com), provider
**MiniMax**. Given a target AI to red-team, it consults the
[`atlas-redteam`](../atlas-redteam) MCP server to pick the relevant MITRE
ATLAS techniques/probes, then uses an `aiAgent` (bx-ai) to produce the
analysis/test plan.

Everything below was verified by hand against the real images/modules
(`ortussolutions/boxlang:cli-alpine` / `miniserver-alpine`, `bx-ai@3.5.0`,
the real `atlas-redteam` MCP server) — not assumed from docs, which in a
few places (see Gotchas) turned out to be stale or incomplete for this
module version.

## Flow

Two steps: **plan**, then **execute**. The planning step uses an LLM
(strategic, picks what to test); the execution step is plain deterministic
code (delivers the attack, scores the reply) — no LLM in that loop, so it
never hallucinates a finding.

### 1. Plan — `POST /api/run.bxm`

`{ targetType, targetDescription }` →
Builds an `aiAgent` wired to the `atlas-redteam` MCP server
(`mcpServers: [ATLAS_MCP_URL]`) — the agent gets ATLAS reference tools
(`atlas_search`, `atlas_get_technique`, ...) and the red-team toolkit
(`list_probes`, `get_probe`, `judge_response`, ...) as callable tools. The
agent (MiniMax model) picks relevant techniques/probes and returns a plan.
Response: `{ ok, targetType, plan }` (`plan` is markdown text, including the
probe ids it picked).

### 2. Execute — `POST /api/execute.bxm`

Delivers the selected probes to **your** target AI and scores the replies.
Every target has its own HTTP contract (a REST API, an n8n webhook for
WhatsApp, whatever) — instead of assuming one, you describe it with a
`targetAdapter`:

```json
{
  "probeIds": ["PI-DIRECT-001", "ACT-001"],
  "targetAdapter": {
    "url": "https://your-n8n-host/webhook/abc123",
    "method": "POST",
    "headers": { "Authorization": "Bearer ..." },
    "bodyTemplate": { "mensaje": "{{PROMPT}}", "sessionId": "rexor-test" },
    "responsePath": "0.output"
  }
}
```

- `bodyTemplate` is a real JSON object matching whatever shape your target
  expects. `{{PROMPT}}` is replaced (anywhere in the structure, string
  values only) with the probe's actual attack text — the substitution walks
  the parsed JSON and re-serializes it, so quotes/newlines in the payload
  come out correctly escaped; it's not a text-template hack.
- `responsePath` is a dot-path into the target's JSON response, 0-indexed
  for arrays (JS/JSON convention), e.g. `0.output` for an n8n webhook that
  replies `[{"output": "..."}]`, or `choices.0.message.content` for an
  OpenAI-shaped response. Omit it (or pass `""`) to treat the whole response
  body as raw text.

For each probe id: `get_probe` (MCP) → substitute into `bodyTemplate` →
`bx:http` to `targetAdapter.url` → extract the reply via `responsePath` →
`judge_response` (MCP) with that text. Response:
`{ ok, findings: [ { probe_id, atlas_technique, severity, vulnerable, defended, rationale, evidence, mitigations, targetResponse }, ... ] }`.
A probe that fails (unreachable target, bad JSON) gets `{ probeId, error }`
in its slot instead of aborting the whole batch.

Verified end-to-end against a local mock webhook shaped like an n8n
response (`[{"output": "..."}]`) — real probe payload delivered, a real
injection correctly flagged `vulnerable: true` by the detector, and a
second run against an unreachable URL returned a clean per-probe error
instead of crashing. `bx:http` does **not** throw on connection failure
(unlike most BoxLang I/O) — it returns `statusCode`/`errorDetail` on the
result struct, so `execute.bxm` checks those instead of try/catch.

The two steps aren't wired together yet (the plan gives you probe ids as
prose inside markdown; execute wants an explicit array) — the frontend is
the place gluing them, by parsing the picked ids out of the plan or just
letting the user pick which ones to run.

## Run

```bash
cp .env.example .env   # set MINIMAX_API_KEY
../../scripts/compose.sh up --build core atlas-redteam
curl -s -X POST http://localhost:8081/api/run.bxm \
  -H "Content-Type: application/json" \
  -d '{"targetType":"chatbot","targetDescription":"customer support bot with order lookup tools"}'
```

`atlas-redteam` must be reachable on the `microservices` network for the
agent's MCP tools to load — if it's not up yet when `core` starts, the
agent still works but without ATLAS tools (bx-ai logs the connection
failure and degrades gracefully instead of crashing).

`core`'s container can reach a target running on your own machine (e.g. a
local n8n instance) via `http://host.docker.internal:<port>` — wired in
`docker-compose.yml` via `extra_hosts`.

## Gotchas found while building this (verified against the real images)

- **`install-bx-module` is broken in `ortussolutions/boxlang:cli-alpine`**:
  it looks for `helpers.sh` under `$SCRIPT_DIR/helpers` or
  `$BOXLANG_INSTALL_HOME/scripts/helpers`, but the image only ships it at
  `/tmp/helpers.sh`. Fixed in the `Dockerfile` by copying it into place
  before running the installer. Installs to `./boxlang_modules/bx-ai`
  (not `./modules/`).
- **MiniServer does not auto-load `boxlang.json`** from the webroot. It
  needs `BOXLANG_CONFIG=/path/to/boxlang.json` (env var) or
  `--configPath` — set via `ENV` in the `Dockerfile`.
- **bx-ai's `MCP()` client is not session-aware.** The official MCP Python
  SDK's streamable-http transport requires an `Mcp-Session-Id` handshake by
  default; bx-ai's client sends plain JSON-RPC POSTs with no session
  negotiation. Fixed on the `atlas-redteam` side by running the server with
  `stateless_http=True` (see `services/atlas-redteam/atlas_redteam/mcp_server.py`).
  Without that flag you get `Bad Request: Missing session ID`.
- **`aiAgent(... mcpServers: [...])` entries are plain URL strings** (or
  `{url, token, timeout, headers, user, password}` structs) — there is no
  `toolFilter` option in bx-ai 3.5.0 despite an example in the hosted docs;
  it always loads every tool the MCP server exposes via `tools/list`.
- **MiniMax provider**: identifier `"minimax"`, API key via
  `MINIMAX_API_KEY` env var (convention: `getSystemSetting("MINIMAX_API_KEY")`,
  also settable explicitly in `boxlang.json` as done here) or
  `${MINIMAX_API_KEY}` interpolation in `boxlang.json` (confirmed working).
  Default model is `MiniMax-M2.5-highspeed`. The module only declares
  `chat`, `stream`, `embeddings` as capabilities for MiniMax (no `tools` or
  `vision`, unlike what the hosted provider-comparison table claims) — tool
  calling works in practice here (it's OpenAI-compatible under the hood)
  but hasn't been exercised against the real MiniMax API, only against the
  `mock` provider with scripted tool calls.
- BoxLang script gotchas: it's `char(10)` not `chr(10)`; setting response
  headers/status from `<bx:script>` needs the `bx:header` prefix
  (`header name=...` alone throws "key not located in any scope").
