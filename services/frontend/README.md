# frontend

**Rexor's web UI.** Vite + React, plain CSS (no component library) — ports
the [Rexor design system](https://claude.ai/artifact/VSptAyxd4JAA4hQvBRmae8)
(`src/styles/tokens.css`, `src/styles/rexor.css`, logo SVGs in `public/`)
directly into real code instead of a hosted artifact.

## What it does

Two-step flow against [`core`](../core):

1. **Plan** — target type + description → `POST /api/run.bxm` → renders the
   markdown test plan `core` comes back with, and auto-extracts probe ids
   (pattern `XXX-999`) from it into the next step's field.
2. **Execute** — define your target's HTTP contract (URL, method, headers,
   a JSON `bodyTemplate` with `{{PROMPT}}` where the attack goes, and a
   `responsePath` to pull the reply out of the target's JSON response) →
   `POST /api/execute.bxm` → renders each finding (severity, vulnerable/
   defended, rationale, the target's actual response).

The `targetAdapter` fields exist because real targets don't share one HTTP
shape — an n8n webhook for a WhatsApp bot expects its own JSON in and
replies with its own JSON out. See [`services/core/README.md`](../core/README.md#2-execute--postapiexecutebxm)
for the exact contract.

The core service URL is configurable in the UI (defaults to
`http://localhost:8081`, remembered in `localStorage`) — not baked in at
build time, so the same build works against anyone's local stack.

## Run

```bash
npm install
npm run dev          # http://localhost:5173, needs core + atlas-redteam running
```

Or as part of the shared stack:

```bash
../../scripts/compose.sh up --build frontend core atlas-redteam
```

## Verified

Built with `npm run build` (no errors) and driven end-to-end with a real
headless browser (Playwright) against the real `core`/`atlas-redteam`
containers: submitted a target, got a real MiniMax-generated plan rendered
from markdown, probe ids auto-extracted, ran them against a local mock
webhook shaped like an n8n response, and got back real findings (5/6
vulnerable, correct severity badges, evidence shown) with zero console
errors. Screenshots aren't committed; rerun the Playwright script in the
session that built this if you need to re-verify visually.
