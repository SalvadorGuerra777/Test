FROM python:3.12-slim AS base

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY pyproject.toml .
COPY atlas_redteam ./atlas_redteam
COPY data ./data
RUN pip install --no-cache-dir .

EXPOSE 8765

ENV ATLAS_MCP_HOST=0.0.0.0 \
    ATLAS_MCP_PORT=8765

CMD ["python", "-m", "atlas_redteam.mcp_server", "--http"]
