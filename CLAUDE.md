# Break Me — contexto del proyecto

Hackathon ANIA x Ortus, **Reto 05: "Break Me"**, sábado 10 – domingo 11 de
octubre de 2026. Entrega: domingo 11 oct 3:00pm (hora El Salvador), vía Devpost.

## Qué estamos construyendo

Producto que usa IA pa hacer **pentesting/red-teaming automático a otra IA**.
Flujo objetivo: el usuario final indica qué tipo de IA/agente quiere testear →
nuestra solución extrae del catálogo MITRE ATLAS (vía MCP) los tipos de ataque
relevantes → decide cuáles aplicar según el target → ejecuta las pruebas →
genera reporte de hallazgos.

## Reglas del hackathon (confirmadas, no asumir más allá de esto)

- **No** se exige que el 100% de la solución esté en BoxLang.
- Requisitos reales:
  1. "Utilizar BoxLang en la implementación" — al menos un componente real en
     BoxLang.
  2. "Integrar BoxLang AI (`bx-ai`) en una funcionalidad real de la solución"
     — tiene que hacer algo de verdad en el producto (agente, chat, RAG...),
     no ser decorativo.
  3. Usar un asistente de IA (Claude Code, etc.) **para escribir código no
     cuenta** como cumplir el requisito #2 — eso es solo herramienta de
     desarrollo, permitido pero no suma.
- Entrega en Devpost debe incluir: reto seleccionado, descripción, cómo se
  usó BoxLang + BoxLang AI, repo con acceso al jurado, README con setup,
  capturas/demo, créditos y limitaciones.
- Presentación ante jurado: 15 min por equipo, domingo 11 oct después de
  3:00pm.

## Arquitectura: microservicios, sin conflictos de merge

Cada servicio vive en `services/<nombre>/`, auto-contenido: su propio
`Dockerfile`, `docker-compose.yml`, `.env` (no se commitea). Nadie edita un
compose/Dockerfile compartido — así cada quien trabaja su servicio sin pisar
al resto del equipo. Ver instrucciones de uso en el [README raíz](./README.md).

`scripts/compose.sh` autodescubre todos los `services/*/docker-compose.yml`
(ignorando las plantillas `_template-*`) y los levanta juntos en la red
Docker compartida `microservices`.

## Servicios actuales

### `services/atlas-redteam` (Python, MCP) — ya integrado

Microservicio que vino de un repo aparte del equipo (`atlas_redteam/`), movido
acá y empaquetado con Docker siguiendo nuestra convención. Es la pieza que
responde al reto: catálogo MITRE ATLAS + toolkit de red-teaming, expuesto
como **servidor MCP**.

- Carga el catálogo oficial ATLAS (`data/ATLAS-latest.yaml`, versión 2026.09:
  16 tácticas, 208 técnicas, 40 mitigaciones, 73 casos de estudio).
- Expone tools MCP de dos tipos:
  - **Referencia ATLAS**: `atlas_stats`, `atlas_search`, `atlas_get_tactic`,
    `atlas_get_technique`, `atlas_list_techniques`, `atlas_get_mitigation`,
    `atlas_get_case_study` — esto es lo que la IA orquestadora usa pa
    **extraer qué tipos de ataque existen**.
  - **Toolkit de red-team**: `list_probes`, `get_probe`, `judge_response`,
    `run_demo_eval`, `run_demo_adaptive` — corpus de probes seguros
    (canary secrets, marcadores benignos, sin exploits reales) + juez de
    respuestas + loop adaptativo attacker/defender.
- Corre standalone (`python -m atlas_redteam.mcp_server --http`, puerto
  8765) o dentro del stack (`services/atlas-redteam/docker-compose.yml`,
  alcanzable como `http://atlas-redteam:8765` desde otros servicios en la
  red `microservices`).
- Detalle completo: [services/atlas-redteam/README.md](./services/atlas-redteam/README.md).
- **Fix importante que le hicimos**: el server corría con
  `transport="streamable-http"` sin `stateless_http=True`. El cliente MCP de
  bx-ai no hace el handshake de sesión que exige el SDK oficial por default,
  así que fallaba con `Bad Request: Missing session ID`. Ya está arreglado
  en `atlas_redteam/mcp_server.py` — **no revertir ese flag**.

### `services/core` (BoxLang + bx-ai, provider MiniMax) — ya integrado, MVP funcional

El orquestador. Cumple el requisito #1/#2 del reto (BoxLang + BoxLang AI en
una función real). Flujo implementado:

1. `POST /api/run.bxm` con `{ targetType, targetDescription }`.
2. Arma un `aiAgent` conectado al MCP de `atlas-redteam`
   (`mcpServers: [ATLAS_MCP_URL]`) — el agente recibe como tools tanto la
   referencia ATLAS como el toolkit de probes.
3. El agente (modelo MiniMax) elige técnicas/probes relevantes y devuelve
   un plan.
4. Responde `{ ok, targetType, plan }`.

**Verificado end-to-end con key real de MiniMax** (ya tenemos la key, está
en `services/core/.env`, gitignored — pedírsela a David si la necesitan
local). Corrida real: `atlas-redteam` + `core` levantados juntos en la red
Docker, `POST /api/run.bxm` con un target de ejemplo (chatbot de soporte
con tools de refund/order-lookup + RAG) devolvió un plan completo y
correcto: técnicas ATLAS reales (AML.T0051 prompt injection, T0053 tool
invocation, T0054 jailbreak, T0056 system prompt extraction, T0057 data
leakage, T0070 RAG poisoning, T0084 discover config), probes concretos del
corpus (`ACT-001`, `PI-DOC-001`, `PI-DOC-002`, `PI-DIRECT-001`, `SCOPE-001`,
`INFO-001`) con rationale, y orden de ejecución recomendado. El agente usó
las tools MCP reales de `atlas-redteam` (no alucinó técnicas/ids). Esto ya
es demo-able tal cual para el jurado.
Detalle completo + gotchas de BoxLang/bx-ai encontrados (y cómo se
resolvieron) en [services/core/README.md](./services/core/README.md) —
vale la pena leerlo antes de tocar este servicio, documenta varias cosas
donde la documentación oficial de bx-ai está desactualizada o incompleta
respecto a la versión instalada (3.5.0).

**Ejecución real ya implementada** — `POST /api/execute.bxm` cierra el loop
que faltaba: dado un array de `probeIds` + un `targetAdapter` (URL, method,
headers, `bodyTemplate` JSON con `{{PROMPT}}`, `responsePath`), entrega cada
probe al target real del usuario, extrae la respuesta y la puntúa con
`judge_response` (MCP). El `targetAdapter` existe porque cada target tiene
su propio contrato HTTP — ej. un webhook n8n de WhatsApp espera/devuelve su
propio JSON, no un formato fijo. Sin LLM en este loop (determinístico, no
alucina hallazgos). Verificado end-to-end contra un mock tipo n8n: probe
real entregado, inyección real detectada (`vulnerable: true`), y manejo de
error limpio si el target no responde. CORS (`Access-Control-Allow-Origin`
+ preflight OPTIONS) agregado a ambos endpoints pa que el frontend (corre
en el navegador) pueda llamarlos directo. Detalle completo del contrato en
[services/core/README.md](./services/core/README.md#2-execute--postapiexecutebxm).

### `services/frontend` (Vite + React) — ya integrado, MVP funcional

UI real en código (no artifact de Claude) usando el design system Rexor
portado a CSS/componentes propios (`src/styles/tokens.css`,
`src/styles/rexor.css`, logos en `public/`, ver
[services/frontend/README.md](./services/frontend/README.md)). Flujo: form
de target → `run.bxm` → muestra el plan (markdown) y auto-extrae los probe
ids → form del `targetAdapter` (precargado con un ejemplo estilo n8n) →
`execute.bxm` → tarjetas de hallazgos con severidad/vulnerable-defendido.
Verificado end-to-end con Playwright real (headless Chromium) contra
`core`+`atlas-redteam` corriendo: plan real de MiniMax, 5/6 hallazgos
vulnerables renderizados correctamente, cero errores de consola.

### `services/reports` (BoxLang, MiniServer) — ya integrado y conectado

Era `boxlang-reports/` en la raíz (lo subió el compañero sin seguir la
convención de microservicios) — movido a `services/reports/` y empaquetado
con Docker igual que los demás. `POST /report.bxm` con el JSON de
resultado (mismo contrato que `atlas_redteam.harness.EvalReport.to_dict()`
de Python) devuelve el reporte HTML con medidor de riesgo, cobertura ATLAS
y tabla de hallazgos+mitigaciones. CORS agregado pa que el frontend lo
llame directo.

**`core`'s `/api/execute.bxm` ahora arma ese JSON automáticamente** —
devuelve `{ ok, findings, report }`, donde `report` ya viene en el formato
exacto que `reports` espera (mismo cálculo de `risk_score` que el harness
Python: suma ponderada por severidad — info=0, low=1, medium=3, high=7,
critical=12 — de hallazgos vulnerables sobre el total posible). El frontend
solo hace `POST report a reports/report.bxm` y abre el HTML en pestaña
nueva (botón "Generate report", visible después de correr los ataques).
Verificado end-to-end con Playwright real: plan → ejecutar → reporte, los
tres pasos encadenados sin tocar nada a mano, cero errores de consola.

**Gotcha de `reports`**: tenía `<bx:comment>...</bx:comment>` como tag, que
no existe en este runtime bajo MiniServer (tira
`Component [comment] could not be found`) — cambiado a `<!--- ... --->`.

### `services/_template-python` y `services/_template-boxlang`

Plantillas base pa nuevos servicios. Copiar, renombrar carpeta, reemplazar
`change_me`, ajustar `.env`. (Los servicios BoxLang reales ya existen en
`services/core` y `services/reports`, estas plantillas son solo pa
servicios adicionales.)

## Gotcha grande: n8n/webhooks async no sirven tal cual para `execute.bxm`

Si tu target es un webhook n8n en modo **"Respond Immediately"**, la
respuesta HTTP es un ack genérico ("Workflow was started") — la respuesta
real del LLM se manda por otro canal (ej. de vuelta a WhatsApp), nunca
llega al body que `execute.bxm` lee. Resultado: todos los probes salen
"defended" aunque el bot esté totalmente desprotegido — el detector está
evaluando el ack, no la respuesta real.

**Fix necesario del lado del n8n del usuario**: el webhook tiene que
responder de forma síncrona — nodo "Respond to Webhook" al final del flow,
esperando a que el LLM termine, devolviendo su respuesta real en el body.
No es un bug de `execute.bxm`; es un requisito de cómo tiene que estar
configurado cualquier target para que el modelo request→response de Rexor
funcione. Mencionarlo en la demo/README si alguien más conecta un n8n.

## Decisiones pendientes / siguiente paso

- ~~Conseguir una `MINIMAX_API_KEY` real~~ — ya la tenemos, demo funcionando.
- ~~Ejecución real de probes contra el target~~ — hecho (`execute.bxm`).
- ~~Reacomodar `boxlang-reports/`~~ — hecho, es `services/reports/`.
- ~~Conectar el reporte final~~ — hecho, botón "Generate report" en el
  frontend, flujo completo plan→execute→report verificado.
- El artifact de Claude (`https://claude.ai/artifact/FWW6DfgT3byLT4sE13XFtZ`)
  que se hizo como primer borrador del frontend quedó obsoleto — el
  frontend real vive en `services/frontend/`. Pendiente borrar el artifact
  si nadie lo necesita.
- Si alguien conecta un target n8n: verificar que su webhook use "Respond
  to Webhook" síncrono (ver gotcha arriba), si no todos los findings salen
  falsos negativos.
