// core's address is deploy-time config, not something a user should be able
// to repoint from the browser — baked in at build time via a Vite env var
// (see services/frontend/Dockerfile and docker-compose.yml), falling back to
// the local dev stack's default port. The browser never talks to the
// reports service directly: core renders reports server-side
// (api/report-view.bxm).
export const CORE_URL = (import.meta.env.VITE_CORE_URL || 'http://localhost:8081').replace(/\/+$/, '');
