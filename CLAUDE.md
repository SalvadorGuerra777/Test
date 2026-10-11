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

**Pendiente en `core`**: solo produce la *estrategia* (qué probes aplican y
por qué). Falta la ejecución real: entregar cada probe al agente del
usuario final (vía HTTP a un endpoint que el usuario provea, o algún otro
canal) y llamar `judge_response` del MCP pa anotar hallazgos. Esa es la
siguiente pieza a construir en este servicio.

### `services/_template-python` y `services/_template-boxlang`

Plantillas base pa nuevos servicios. Copiar, renombrar carpeta, reemplazar
`change_me`, ajustar `.env`. (El servicio BoxLang real ya existe en
`services/core`, estas plantillas son solo pa servicios adicionales.)

## Decisiones pendientes / siguiente paso

- ~~Conseguir una `MINIMAX_API_KEY` real~~ — ya la tenemos, demo funcionando.
- En `core`: implementar la entrega real de probes al agente del usuario
  final + scoring con `judge_response`, y devolver un reporte agregado
  (puede delegar en `atlas_redteam.report` o en el servicio de reportes
  Python del compañero).
- Servicio de reportes (a cargo del compañero): copiar `_template-python`
  (no reinventar estructura).
