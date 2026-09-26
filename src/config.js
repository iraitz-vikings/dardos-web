// URL del servidor del club, en un único sitio (antes estaba copiada en 36
// archivos, auditoría 2026-09-26). En local se cambia con VITE_API_URL.
// Ojo: public/service-worker.js no pasa por Vite y tiene su propia copia.
export const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
