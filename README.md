# Break Me — ANIA x Ortus Hackathon (Reto 05)

AI red-teaming platform: usa IA pa hacer pentesting/red-teaming automático a
otra IA. Arquitectura de microservicios — cada equipo trabaja aislado en su
propia carpeta bajo `services/`, sin tocar archivos compartidos.

Ver [CLAUDE.md](./CLAUDE.md) pa contexto completo del reto, decisiones y
estado del proyecto.

## Para el jurado

**Rexor** hace red-teaming automático a otra IA. Le describís tu bot en
lenguaje natural ("quiero testear mi chatbot de soporte, tiene una tool de
reembolsos y un RAG de políticas"), y la plataforma:

1. consulta el catálogo oficial **MITRE ATLAS** (vía MCP) y elige qué
   técnicas de ataque aplican a ese tipo de IA;
2. arma un plan con probes concretos y justifica cada uno;
3. los dispara contra el endpoint HTTP real de tu bot;
4. evalúa cada respuesta de forma determinística (sin LLM, no alucina
   hallazgos) y genera un reporte HTML con riesgo, cobertura ATLAS y
   mitigaciones.

### Cómo usamos BoxLang y BoxLang AI

- `services/core` está escrito en **BoxLang** y es el orquestador de todo
  el producto.
- **BoxLang AI (`bx-ai`)** hace trabajo real, no decorativo:
  - `aiAgent` con MiniMax arma el plan de ataque usando como tools el MCP
    de `atlas-redteam` (catálogo ATLAS + corpus de probes).
  - `MCPServer()` + `aiTool()` exponen las acciones de la plataforma
    (`list_target_types`, `create_test_plan`, `run_probes`) como **MCP
    propio**.
  - Un segundo `aiAgent` (el asistente de chat) se conecta a ese MCP propio
    y maneja la plataforma entera desde la conversación: pregunta lo que
    falte, arma el plan y corre los ataques.
- `services/reports` también es BoxLang: renderiza el reporte HTML.

### Levantarlo

Requisitos: Docker con Compose v2 y una shell bash (Linux, macOS, o WSL /
Git Bash en Windows). Una API key de MiniMax.

```bash
git clone https://github.com/SalvadorGuerra777/Test.git && cd Test
cp services/core/.env.example services/core/.env              # poné tu MINIMAX_API_KEY
cp services/atlas-redteam/.env.example services/atlas-redteam/.env
./scripts/compose.sh up --build -d
```

Abrí **http://localhost:5173**. La primera vez tarda unos minutos en
construir las imágenes.

| Servicio | URL local |
|---|---|
| frontend | http://localhost:5173 |
| core (API + MCP propio) | http://localhost:8081 |
| reports | http://localhost:8082 |
| atlas-redteam (MCP) | http://localhost:8765 |

### Probarlo

**Necesitás un bot objetivo** con un endpoint HTTP que reciba JSON y
responda JSON **en la misma request** (síncrono). Si tu bot corre en tu
máquina, desde los contenedores se llega con
`http://host.docker.internal:<puerto>`.

**Opción A — Chat (vista por defecto):** escribí qué querés testear. Ejemplo:

> Quiero testear mi chatbot de soporte. Recibe POST en
> `http://host.docker.internal:5678/webhook/bot` con body
> `{"mensaje": "..."}` y responde `[{"output": "..."}]`. Armá el plan y
> corrélo.

Si falta algo (tipo de bot, URL, formato del body, dónde viene la
respuesta), el asistente lo pregunta. Al terminar muestra el resumen de
hallazgos y un botón **View full report**.

**Opción B — Formulario (toggle "Form" arriba a la derecha):** paso a paso.
Elegís tipo de target y descripción → **Launch attack** genera el plan →
marcás los probes, ponés URL, body template (con `{{PROMPT}}` donde va el
ataque) y response path → **Run attacks on target** → **View report**.

Todos los reportes quedan en la columna **Reports** de la derecha, y los
chats en **History**. Sobreviven reinicios del stack.

**Ojo con n8n:** si tu bot es un webhook de n8n en modo "Respond
Immediately", la respuesta HTTP es solo un ack y todos los probes salen
"defended" en falso. Usá un nodo **Respond to Webhook** al final del flujo
que devuelva la respuesta real del LLM.

### Limitaciones

- El target tiene que ser request→response HTTP síncrono; canales asíncronos
  (WhatsApp, colas) necesitan un webhook síncrono al frente.
- Los probes de inyección indirecta (documentos, salida de tools) se mandan
  como mensaje directo, porque el adapter solo conoce el endpoint de chat
  del bot, no su RAG ni sus tools.
- La evaluación es por reglas (canary, marcadores, patrones): sin falsos
  positivos inventados por un LLM, pero puede no detectar fallas sutiles.
- Sin autenticación ni multiusuario: pensado como herramienta local.
- El plan lo genera un LLM y puede variar entre corridas.

### Créditos

- Equipo: **David Diaz** y **Salvador Guerra**.
- Catálogo de técnicas y mitigaciones: [MITRE ATLAS](https://atlas.mitre.org).
- [BoxLang](https://boxlang.io) y [BoxLang AI](https://ai.ortusbooks.com) de Ortus Solutions.
- LLM: MiniMax vía `bx-ai`.
- Hackathon ANIA x Ortus, Reto 05 "Break Me".

## Arquitectura

```mermaid
flowchart LR
    user(["Usuario<br/>navegador"])
    target["AI objetivo<br/>(bot del usuario)"]
    minimax["MiniMax<br/>LLM vía bx-ai"]

    subgraph net["Red Docker: microservices"]
        frontend["frontend<br/>Vite + React :5173"]
        core["core<br/>BoxLang + bx-ai :8081<br/>MCP propio 'rexor'"]
        atlas["atlas-redteam<br/>Python, MCP :8765<br/>catálogo MITRE ATLAS"]
        reports["reports<br/>BoxLang :8082<br/>render HTML"]
    end

    user -->|HTTPS| frontend
    frontend -->|"chat · run · execute<br/>historial · report-view"| core
    core -->|"MCP: técnicas, probes,<br/>judge_response"| atlas
    core -->|"aiAgent (chat + plan)"| minimax
    core -->|"POST JSON, red interna"| reports
    core ==>|"probes HTTP (targetAdapter)"| target

    classDef attack stroke:#c8102e,stroke-width:2px,color:#c8102e
    class target attack
    linkStyle 5 stroke:#c8102e,stroke-width:2px
```

- El navegador **solo habla con `core`**. `core` arma el plan con un
  `aiAgent` (MiniMax) conectado por MCP a `atlas-redteam` y a su propio MCP
  server (`list_target_types`, `create_test_plan`, `run_probes`), ataca al
  bot del usuario por HTTP, archiva chats y reportes, y le pide el HTML a
  `reports` por la red interna.
- Línea roja = tráfico de ataque hacia la IA objetivo; la evaluación de cada
  respuesta (`judge_response`) es determinística, sin LLM.

## Servicios

| Servicio | Stack | Qué hace |
|---|---|---|
| [`atlas-redteam`](./services/atlas-redteam) | Python, MCP | Catálogo MITRE ATLAS + toolkit de probes/attack corpus, expuesto como servidor MCP. Fuente de verdad de "qué ataques existen" y "cómo evaluar una respuesta". |
| [`core`](./services/core) | BoxLang + bx-ai (MiniMax) | Orquestador: dado el tipo de IA a testear, consulta el MCP de `atlas-redteam` pa elegir técnicas/probes (`/api/run.bxm`), ejecuta esos probes contra la IA real del usuario vía un adapter HTTP configurable (`/api/execute.bxm`), y expone todo eso como MCP propio + un asistente de chat (`/api/chat.bxm`). Guarda historial de chats y reportes. Es el componente que cumple el requisito BoxLang + BoxLang AI del reto. |
| [`frontend`](./services/frontend) | Vite + React | UI: chat AI-driven (por defecto) o formulario clásico paso a paso, historial de chats/reportes, y visor de reportes (renderizados server-side por `core`). |
| [`reports`](./services/reports) | BoxLang (MiniServer) | Convierte el JSON de hallazgos (de `core` o del harness Python) en un reporte HTML con mitigaciones ATLAS. |
| [`_template-python`](./services/_template-python) | Python/FastAPI | Plantilla base pa nuevos servicios Python. |
| [`_template-boxlang`](./services/_template-boxlang) | BoxLang (MiniServer) | Plantilla base pa el servicio BoxLang/BoxLang AI (requisito del reto). |

## Reglas de convivencia (evitar conflictos de merge)

Cada microservicio es auto-contenido: su propio `Dockerfile`, `docker-compose.yml`
y `.env` (no se commitea). Nadie edita un compose/Dockerfile compartido.

### Crear un servicio nuevo

1. Copiá la plantilla que corresponda:
   - `services/_template-python` — Python (FastAPI).
   - `services/_template-boxlang` — BoxLang.
2. Renombrá la copia a `services/<tu-servicio>`.
3. Reemplazá `change_me` por el nombre real del servicio en `docker-compose.yml`
   (y en `app/main.py` si es Python).
4. En `docker-compose.yml`, actualizá `build:` y `env_file:` pa que apunten
   a `./services/<tu-servicio>/...` (no al nombre de la plantilla) — el
   script de abajo levanta todos los servicios en un solo proyecto desde la
   raíz del repo, así que las rutas son relativas a la raíz, no a tu carpeta.
5. Copiá `.env.example` a `.env` y ajustá valores.
6. Elegí un puerto de host libre en tu `docker-compose.yml`.

### Levantar todo

```bash
./scripts/compose.sh up --build
```

El script descubre automáticamente todos los `services/*/docker-compose.yml`
(menos las plantillas `_template-*`) y los levanta juntos en la red compartida
`microservices`. Agregar o quitar un servicio no requiere tocar ningún archivo
central.
