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

1. `POST /api/run.bxm` with `{ targetType, targetDescription }`.
2. Builds an `aiAgent` wired to the `atlas-redteam` MCP server
   (`mcpServers: [ATLAS_MCP_URL]`) — the agent gets ATLAS reference tools
   (`atlas_search`, `atlas_get_technique`, ...) and the red-team toolkit
   (`list_probes`, `get_probe`, `judge_response`, ...) as callable tools.
3. The agent (MiniMax model) picks relevant techniques/probes and returns a
   plan.
4. Response: `{ ok, targetType, plan }`.

Delivering the selected probes to the actual target AI and scoring its
responses (`judge_response`) is the next step, not yet wired here — this
service currently produces the *strategy*, matching what was asked for
first.

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
