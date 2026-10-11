# frontend

**Rexor's web UI.** Vite + React, plain CSS (no component library) — ports
the [Rexor design system](https://claude.ai/artifact/VSptAyxd4JAA4hQvBRmae8)
(`src/styles/tokens.css`, `src/styles/rexor.css`, logo SVGs in `public/`)
directly into real code instead of a hosted artifact. Form components
(`src/components/{Field,TextField,TextAreaField,SelectField,CheckboxGroup}.jsx`)
port the system's form components' class names (`rx-field`, `rx-input`,
`rx-check`, `rx-fieldset`, …) and markup shape verbatim from the design
system's `project/components/bundle.css` — not hand-invented — so this
stays visually in sync with the system if it changes.

## What it does

Two-step flow against [`core`](../core):

1. **Plan** — target type(s) (checklist over a fixed high-level catalog:
   customer support chatbot, coding agent, RAG/knowledge assistant,
   autonomous task agent, voice assistant, multi-agent orchestrator — a real
   target is often more than one of these at once, e.g. an agent that's also
   RAG-backed, so it's multi-select, not a single pick) + free-text
   description → `POST /api/run.bxm` (sent as a comma-joined string — `core`
   just treats it as descriptive text) → renders the markdown test plan
   `core` comes back with, and parses the probe table into a checklist
   (falls back to bare probe ids if the model didn't reply with the
   expected table shape).
2. **Execute** — pick which probes to run (checkboxes, select all/none) and
   define your target's HTTP contract (URL, method, headers, a JSON
   `bodyTemplate` with `{{PROMPT}}` where the attack goes, and a
   `responsePath` to pull the reply out of the target's JSON response) →
   `POST /api/execute.bxm` → renders each finding (severity, vulnerable/
   defended, rationale, the target's actual response).

The `targetAdapter` fields exist because real targets don't share one HTTP
shape — an n8n webhook for a WhatsApp bot expects its own JSON in and
replies with its own JSON out. See [`services/core/README.md`](../core/README.md#2-execute--postapiexecutebxm)
for the exact contract.

## Configuring the backend addresses

`core`/`reports` URLs are **not** user-editable in the UI — they're
deploy-time config, baked into the static JS bundle at build time via Vite
env vars (`VITE_CORE_URL`, `VITE_REPORTS_URL`; default to the local dev
ports, `8081`/`8082`). There's no server behind this build to read a
runtime env var from, so this is the only place they can live. Override
them at build time:

```bash
VITE_CORE_URL=https://your-core-host VITE_REPORTS_URL=https://your-reports-host \
  ../../scripts/compose.sh build frontend
```

(`docker-compose.yml` passes them through as build args, defaulting to the
local ports when unset.)

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
from markdown, probe checklist populated, ran them against a mock webhook
shaped like an n8n response, and got back real findings with correct
severity badges and evidence, then generated the HTML report — all with
zero console errors. Also confirmed `VITE_CORE_URL`/`VITE_REPORTS_URL`
actually get inlined into the built bundle (grepped the output JS for a
marker value passed at build time) and that the bundle has no hardcoded
`localhost` URL when they're set. Screenshots aren't committed; rerun the
Playwright script in the session that built this if you need to re-verify
visually.
