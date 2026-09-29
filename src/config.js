import { CLUB } from "./club.js";

// URL del servidor del club, en un único sitio (antes estaba copiada en 36
// archivos, auditoría 2026-09-26). En producción sale de club.config.js; en
// local se cambia con VITE_API_URL. public/service-worker.js no pasa por
// Vite: recibe la misma URL por /club-config.js (lo genera vite.config.js).
export const API_URL = import.meta.env.VITE_API_URL || CLUB.apiUrl;
