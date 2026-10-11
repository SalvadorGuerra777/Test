# atlas-redteam · Microservicio de reportes (BoxLang)

Genera el **reporte de seguridad corporativo** (HTML, exportable a PDF) a
partir del JSON que produce el red-team de Python (`atlas-redteam`),
enriqueciendo cada hallazgo con **mitigaciones de MITRE ATLAS** y un
crosswalk a **OWASP Top 10 for LLM Applications 2025**. Es la pieza de
reportería del reto **05 / BREAK ME**, escrita en **BoxLang**.

## Diseño: plantilla del design system Rexor, no un reporte ad-hoc

El reporte se construye con los tokens y componentes de reportería del
**design system Rexor** (el mismo que usa `services/frontend`), para que
sea consistente con el resto del producto y se vea como un entregable
B2B serio — ver `project/REPORTS.md` del design system para la spec
completa (estructura, tipografía, severidad, redacción de evidencia).

- `assets/tokens.css` — tokens de color/tipografía/espaciado/página del
  design system, traducidos a variables CSS (solo tema claro: un PDF de
  seguridad siempre se exporta en claro, nunca oscuro).
- `assets/bundle.css` — las clases `rx-r-*` (ReportCover, ReportPage,
  RiskSummary, SeverityBar, tablas, FindingDetail...) tal como las define
  el bundle de componentes del design system — copiadas literal, no
  reinterpretadas.
- `assets/rexor-*.svg` — el logo/símbolo oficial, descargados del design
  system e incrustados inline en el HTML (sin red ni `<img src>` externo).
- `lib/ReportService.bx` arma la data (`enrich()`) y `lib/report-view.bxm`
  la pinta como HTML plano con esas mismas clases — **sin React**: el
  bundle de componentes del design system es React, pero un reporte
  servido por un endpoint BoxLang no necesita un runtime de React para
  verse igual; replicamos el marcado exacto que esos componentes generan.
  Esto también hace el render más robusto para imprimir (sin esperar a
  que hidrate JS antes de mandar a PDF).

### Estructura del reporte (orden fijo, cada sección en página nueva)

Portada → Document control → Executive summary (`RiskSummary` + severity
bar + recomendaciones) → Scope & methodology → Risk overview (tabla por
categoría + cobertura ATLAS) → Findings (un `FindingDetail` por hallazgo
vulnerable, evidencia con secretos enmascarados `CAN••••EAL`) →
Remediation plan (P0–P3) → Appendix (catálogo completo de sondas +
definiciones de severidad + glosario).

### Exportar a PDF

El HTML ya viene como páginas tamaño carta (816×1056px, `@page` en
`bundle.css`) con un botón **"Download PDF"** flotante que llama a
`window.print()`. En Chrome/Edge: **Print → Save as PDF**, con
**Background graphics activado** (el reporte ya fuerza
`print-color-adjust: exact` para que los colores de marca impriman aunque
esa casilla esté desmarcada). No hay generación de PDF del lado del
servidor — el runtime de BoxLang MiniServer (imagen `miniserver-alpine`)
no trae un módulo de PDF instalado, y agregar uno no es necesario: el
HTML ya es print-ready pixel-perfect.

**Limitación conocida**: el número de página ("Page n of m") se calcula
server-side asumiendo una página física por sección/hallazgo. Si una
tabla larga (ej. el catálogo de sondas en el apéndice, con muchas filas)
desborda una página física al imprimir, el conteo de "Page n of m" no se
ajusta a ese desborde — es la misma limitación que acepta el propio
design system Rexor para `ReportPage` (ver su `REPORTS.md`), no es un bug
introducido acá.

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

**Gotcha encontrado (interpolación `#...#`)**: en un `.bxm`, `#expr#` solo
se evalúa dentro de un `<bx:output>...</bx:output>` — fuera de uno, se
imprime literal (`#variables.css#` tal cual, sin resolver). El `##`
escapado para un `#` literal, en cambio, sí funciona en cualquier parte
del archivo. `lib/report-view.bxm` envuelve cada bloque dinámico (incluido
el `<style>#variables.bundleCss#</style>` del `<head>`) en su propio
`<bx:output>`.

**Gotcha encontrado (closures de `.sort()`)**: un lambda `(a, b) -> ...`
pasado a `.sort()` **no cierra sobre variables locales externas** — solo
ve `a`/`b`. `mitCount[b] - mitCount[a]` revienta con
`The requested key [mitCount] was not located in any scope`. Fix: arma un
array de pares autocontenidos (`{name, count}`) y ordena por el campo del
propio elemento, nunca por una variable capturada del scope exterior.

**Gotcha encontrado (`fileWrite` con ruta relativa en CLI)**: `boxlang
render.bxs in.json out.html` con rutas relativas escribe `out.html` en un
directorio que **no** es el `cwd` del shell ni el directorio del script
(se perdía silenciosamente, sin error — el archivo que se leía después
era uno viejo de otra corrida). `fileRead` con ruta relativa sí resuelve
bien contra el `cwd`; solo `fileWrite` tiene este problema. Fix: envolver
toda ruta de entrada/salida en `expandPath()` en `render.bxs`/`demo.bxs`
(ya aplicado) — nunca pasar una ruta relativa cruda a `fileWrite` en un
script CLI de BoxLang.

## Estructura

```
services/reports/
  Application.bx            Config de la app + mapping /lib
  index.bxm                 Landing con instrucciones y demo
  report.bxm                Endpoint web: POST JSON -> HTML  (o ?sample=1)
  render.bxs                CLI: boxlang render.bxs <in.json> <out.html>
  demo.bxs                  CLI sin argumentos (rutas fijas)
  assets/
    tokens.css               Tokens Rexor (color/tipo/espaciado/página), tema claro
    bundle.css                Clases rx-r-* del design system (copiadas literal)
    rexor-mark-white.svg      Símbolo (portada, banda crimson)
    rexor-logo.svg             Lockup horizontal (pie de portada)
  lib/
    ReportService.bx         Clase: enrich() + render() + helpers de redacción/narrativa
    report-view.bxm          Plantilla HTML (cover + ReportPage por sección/hallazgo)
    partials/
      page-open.bxm           Header de página (título + clasificación)
      page-close.bxm          Footer de página (target · fecha · "Page n of m")
  data/
    atlas-mitigations.json  Mapa técnica ATLAS -> mitigaciones (134 técnicas)
    atlas-owasp-map.json    Crosswalk técnica ATLAS -> categoría OWASP LLM Top 10 2025
  samples/
    sample-report.json      Resultado red-team de ejemplo (agente vulnerable)
  reference-expected-output.html   Cómo debe verse el reporte (referencia, regenerar con render.bxs)
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
html = svc.render( jsonDeserialize( fileRead( expandPath( "samples/sample-report.json" ) ) ) )
fileWrite( expandPath( "reporte.html" ), html )   // ruta relativa cruda en fileWrite: ver gotcha arriba
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

- El CSS del design system (`assets/*.css`) vive en archivos aparte y se
  inyecta en el `<head>` ya resuelto (como valor de variable, vía
  `fileRead()` en `init()`), así que sus colores hex no interactúan para
  nada con el escape de `#` de BoxLang — ese problema solo existía cuando
  el CSS estaba escrito literal dentro del `.bxm` (ver el gotcha de
  interpolación más arriba).
- Todo el texto dinámico se escapa con `encodeForHTML()`.
- `ReportService.enrich()` precalcula todo (severidad, tablas, narrativa
  del resumen ejecutivo, plan de remediación, redacción de secretos) para
  que la vista (`report-view.bxm`) sea solo presentación — nunca decide
  nada, solo imprime lo que `enrich()` ya calculó.
- La evidencia de cada hallazgo enmascara cualquier secreto conocido del
  reporte completo (no solo el de su propio `evidence`) antes de
  imprimirlo — ver `redact()` / `knownSecrets` en `ReportService.bx`.

## Atribución

Técnicas y mitigaciones © [MITRE ATLAS](https://github.com/mitre-atlas/atlas-data),
Apache-2.0.
