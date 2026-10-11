# atlas-redteam · Microservicio de reportes (BoxLang)

Genera el **reporte de seguridad HTML** a partir del JSON que produce el
red-team de Python (`atlas-redteam`), enriqueciendo cada hallazgo con
**mitigaciones de MITRE ATLAS**. Es la pieza de reportería del reto
**05 / BREAK ME**, escrita en **BoxLang**.

El diseño reproduce el reporte del harness de Python (medidor de riesgo,
chips de severidad, cobertura de técnicas ATLAS y tabla de hallazgos +
remediación), con soporte claro/oscuro.

> Movido acá desde `boxlang-reports/` (raíz del repo) pa seguir la
> convención de microservicios del proyecto — ver [README raíz](../../README.md).

## Docker

```bash
cp .env.example .env 2>/dev/null || true   # no necesita variables, pero por consistencia
../../scripts/compose.sh up --build reports
curl -s "http://localhost:8082/report.bxm?sample=1" | head -c 200
```

`report.bxm` tiene CORS habilitado (`Access-Control-Allow-Origin: *` +
preflight `OPTIONS`) — lo llama el frontend directo desde el navegador con
el JSON que arma `core`'s `/api/execute.bxm`.

**Gotcha encontrado**: `<bx:comment>...</bx:comment>` como tag NO existe en
este runtime de BoxLang corriendo bajo MiniServer — tira
`Component [comment] could not be found`. Se cambió por el comentario de
plantilla real: `<!--- ... --->`.

## Estructura

```
boxlang-reports/
  Application.bx            Config de la app + mapping /lib
  index.bxm                 Landing con instrucciones y demo
  report.bxm                Endpoint web: POST JSON -> HTML  (o ?sample=1)
  render.bxs                CLI: boxlang render.bxs <in.json> <out.html>
  lib/
    ReportService.bx        Clase: enrich() + render() + helpers de diseño
    report-view.bxm         Plantilla HTML (el diseño)
  data/
    atlas-mitigations.json  Mapa técnica ATLAS -> mitigaciones (134 técnicas)
  samples/
    sample-report.json      Resultado red-team de ejemplo (agente vulnerable)
  reference-expected-output.html   Cómo debe verse el reporte (referencia)
```

## Requisitos

- **BoxLang 1.x** y, para el modo web, el **MiniServer**.
  Instalación rápida: <https://boxlang.ortusbooks.com/getting-started/installation>
  (en Windows, el instalador deja `boxlang` y `boxlang-miniserver` en el PATH).
- Java 21+ (lo trae el instalador de BoxLang o tu JDK).

## Uso

### 1) Como microservicio web (MiniServer)

Desde esta carpeta:

```bash
boxlang-miniserver          # Windows: boxlang-miniserver.bat
```

Luego:

- Demo:  `http://localhost:8080/report.bxm?sample=1`
- Landing: `http://localhost:8080/` (index.bxm)
- Tu propio JSON por POST:

```bash
curl -X POST http://localhost:8080/report.bxm \
     -H "Content-Type: application/json" \
     --data-binary @mi-resultado.json  > reporte.html
```

### 2) Como CLI

```bash
boxlang render.bxs samples/sample-report.json reporte.html
# sin argumentos usa el sample y escribe report.html
boxlang render.bxs
```

### 3) Desde código BoxLang

```java
svc  = new lib.ReportService( expandPath( "data/atlas-mitigations.json" ) )
html = svc.render( jsonDeserialize( fileRead( "samples/sample-report.json" ) ) )
fileWrite( "reporte.html", html )
```

## Flujo completo (Python -> BoxLang)

```bash
# 1) El red-team de Python evalúa al agente y exporta el JSON
python scripts/run_eval.py --target vulnerable --out resultado   # -> resultado.json

# 2) BoxLang convierte ese JSON en el reporte HTML
boxlang render.bxs resultado.json reporte.html
```

## Contrato de datos (JSON de entrada)

El servicio espera el objeto que produce `run_eval(...).to_dict()` del harness:

```jsonc
{
  "target": "demo-vulnerable",
  "catalog_version": "2026.09",
  "started_at": "2026-10-10 21:33:00",
  "rounds": 1,
  "summary": {
    "probes_run": 9,
    "vulnerabilities": 9,
    "risk_score": 100,
    "by_severity": { "critical": 2, "high": 3, "medium": 3, "low": 1 },
    "by_category": { "prompt_injection": { "total": 2, "vulnerable": 2 } }
  },
  "atlas_coverage": { "AML.T0051": { "name": "LLM Prompt Injection", "tested": 3, "vulnerable": 3 } },
  "findings": [
    {
      "vulnerable": true, "severity": "high",
      "probe_name": "...", "probe_id": "...", "channel": "...",
      "atlas_technique": "AML.T0051", "atlas_technique_name": "LLM Prompt Injection",
      "atlas_tactics": ["Execution"], "rationale": "...", "evidence": "..."
    }
  ]
}
```

Las mitigaciones no vienen en el JSON: el servicio las resuelve con
`data/atlas-mitigations.json` según `atlas_technique`.

## Notas de implementación

- La plantilla mantiene el CSS **fuera** de `<bx:output>` para que los colores
  hex (`#rrggbb`) no necesiten escape; los colores dinámicos llegan como valores
  que ya contienen `#`. Dentro de `<bx:output>`, los `#` literales se escriben
  `##` (ej. en el chip "0 hallazgos").
- Todo el texto dinámico se escapa con `encodeForHTML()`.
- `ReportService.enrich()` precalcula todo (banda de riesgo, filas, colores,
  mitigaciones) para que la vista sea solo presentación.

## Atribución

Técnicas y mitigaciones © [MITRE ATLAS](https://github.com/mitre-atlas/atlas-data),
Apache-2.0.
