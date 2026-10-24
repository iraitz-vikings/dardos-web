import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import CLUB from "./club.config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const dist = path.join(__dirname, "dist");

// Cabeceras de seguridad (auditoría 2026-10-19). Los tokens de sesión
// (socio en localStorage, admin en sessionStorage) los puede leer cualquier
// script que llegue a ejecutarse en la página, así que la CSP es la red de
// seguridad por si algún día se cuela un XSS:
// - script-src 'self': solo los scripts de la propia web (el build de Vite
//   no mete scripts inline en index.html), nada inyectado ni de terceros.
// - connect-src: solo esta web y la API del club, para que un script
//   colado no pueda mandar los tokens a otro servidor.
// - img-src/media-src con https: porque las fotos, logos y avatares son
//   URLs que mete el admin (Cloudinary, webs de fabricantes...).
// - style-src 'unsafe-inline': React pinta muchos estilos con style={{…}}.
// - frame-src: solo los vídeos de YouTube (youtube-nocookie).
// - frame-ancestors 'self' (+ X-Frame-Options): nadie puede meter la web
//   dentro de un iframe en otra página para engañar con clics.
// Si se añade un servicio externo nuevo (otra API, otro reproductor de
// vídeo...), hay que añadir su origen aquí o el navegador lo bloqueará.
const apiOrigen = new URL(process.env.VITE_API_URL || CLUB.apiUrl).origin;
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigen}`,
  "frame-src https://www.youtube-nocookie.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set({
    "Content-Security-Policy": CSP,
    "X-Frame-Options": "SAMEORIGIN",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=15552000",
  });
  next();
});

app.use(express.static(dist));

// SPA fallback: cualquier ruta no encontrada sirve index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Web sirviendo en puerto ${PORT}`));

