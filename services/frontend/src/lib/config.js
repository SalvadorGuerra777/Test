// Core/reports addresses are deploy-time config, not something a user should
// be able to repoint from the browser — baked in at build time via Vite env
// vars (see services/frontend/Dockerfile and docker-compose.yml), falling
// back to the local dev stack's default ports.
export const CORE_URL = (import.meta.env.VITE_CORE_URL || 'http://localhost:8081').replace(/\/+$/, '');
export const REPORTS_URL = (import.meta.env.VITE_REPORTS_URL || 'http://localhost:8082').replace(/\/+$/, '');
