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
- **Pendiente**: este servicio es el catálogo/herramienta de ataques; falta
  el orquestador (probablemente el servicio BoxLang) que consuma este MCP,
  decida qué ataques usar según el target, y dispare las pruebas contra la
  IA del usuario final. Ese es el siguiente bloque a construir.

### `services/_template-python` y `services/_template-boxlang`

Plantillas base pa nuevos servicios. Copiar, renombrar carpeta, reemplazar
`change_me`, ajustar `.env`. El servicio BoxLang es el candidato natural pa
el orquestador que cumple el requisito #1/#2 de las reglas (usa `bx-ai`
en una función real: decidir y ejecutar ataques).

## Decisiones pendientes / siguiente paso

- Definir el componente BoxLang + `bx-ai` que:
  1. Pregunte al usuario qué tipo de IA/agente quiere testear.
  2. Consuma el MCP de `atlas-redteam` pa listar técnicas aplicables.
  3. Decida y ejecute el subconjunto de ataques relevante.
  4. Agregue resultados y arme el reporte final (puede delegar en
     `atlas_redteam.report` o un servicio de reportes Python aparte).
- Si se necesita un tercer servicio de reportes en Python, copiar
  `_template-python` (no reinventar estructura).
