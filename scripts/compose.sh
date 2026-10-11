#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

NETWORK=microservices
docker network inspect "$NETWORK" >/dev/null 2>&1 || docker network create "$NETWORK"

FILES=()
for f in services/*/docker-compose.yml; do
  [[ "$f" == services/_template-*/docker-compose.yml ]] && continue
  FILES+=(-f "$f")
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No hay servicios en services/ (copia una carpeta services/_template-* para empezar)" >&2
  exit 1
fi

docker compose "${FILES[@]}" "$@"
