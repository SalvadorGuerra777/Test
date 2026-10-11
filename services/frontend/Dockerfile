FROM node:20-alpine AS build
WORKDIR /app
# Deploy-time addresses for the core/reports services, baked into the JS
# bundle at build time (Vite inlines import.meta.env.VITE_* at build, there's
# no runtime config for a static build) — override via --build-arg or by
# exporting these before `./scripts/compose.sh build frontend`.
ARG VITE_CORE_URL=http://localhost:8081
ARG VITE_REPORTS_URL=http://localhost:8082
ENV VITE_CORE_URL=$VITE_CORE_URL
ENV VITE_REPORTS_URL=$VITE_REPORTS_URL
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
