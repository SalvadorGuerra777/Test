# Stage 1: install the bx-ai module using the BoxLang CLI image.
# NOTE: install-bx-module ships broken in this image tag — it looks for
# helpers.sh under $SCRIPT_DIR/helpers or $BOXLANG_INSTALL_HOME/scripts/helpers,
# but the image only has it at /tmp/helpers.sh. Verified by hand against
# ortussolutions/boxlang:cli-alpine; the copy below is the fix.
FROM ortussolutions/boxlang:cli-alpine AS modules
WORKDIR /app
RUN mkdir -p /usr/local/bin/helpers \
    && cp /tmp/helpers.sh /usr/local/bin/helpers/helpers.sh \
    && install-bx-module bx-ai --local

# Stage 2: the actual runtime
FROM ortussolutions/boxlang:miniserver-alpine
WORKDIR /app
COPY --from=modules /app/boxlang_modules ./boxlang_modules
COPY boxlang.json ./boxlang.json
COPY index.bxm ./index.bxm
COPY Application.bx ./Application.bx
COPY api ./api
COPY models ./models

# MiniServer does NOT auto-load boxlang.json from the webroot (verified) —
# it needs this env var (or --configPath) to pick up modules.bxai.settings.
ENV BOXLANG_CONFIG=/app/boxlang.json

EXPOSE 8080
