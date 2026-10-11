# Break Me — ANIA x Ortus Hackathon (Reto 05)

AI red-teaming platform: usa IA pa hacer pentesting/red-teaming automático a
otra IA. Arquitectura de microservicios — cada equipo trabaja aislado en su
propia carpeta bajo `services/`, sin tocar archivos compartidos.

Ver [CLAUDE.md](./CLAUDE.md) pa contexto completo del reto, decisiones y
estado del proyecto.

## Servicios

| Servicio | Stack | Qué hace |
|---|---|---|
| [`atlas-redteam`](./services/atlas-redteam) | Python, MCP | Catálogo MITRE ATLAS + toolkit de probes/attack corpus, expuesto como servidor MCP. Fuente de verdad de "qué ataques existen" y "cómo evaluar una respuesta". |
| [`core`](./services/core) | BoxLang + bx-ai (MiniMax) | Orquestador: dado el tipo de IA a testear, consulta el MCP de `atlas-redteam` pa elegir técnicas/probes, y usa un `aiAgent` pa producir el plan de análisis. Es el componente que cumple el requisito BoxLang + BoxLang AI del reto. |
| [`_template-python`](./services/_template-python) | Python/FastAPI | Plantilla base pa nuevos servicios Python (ej. servicio de reportes). |
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
4. Copiá `.env.example` a `.env` y ajustá valores.
5. Elegí un puerto de host libre en tu `docker-compose.yml`.

### Levantar todo

```bash
./scripts/compose.sh up --build
```

El script descubre automáticamente todos los `services/*/docker-compose.yml`
(menos las plantillas `_template-*`) y los levanta juntos en la red compartida
`microservices`. Agregar o quitar un servicio no requiere tocar ningún archivo
central.
