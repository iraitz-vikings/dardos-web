import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import CLUB from "./club.config.js";

// Archivos de la web que no pasan por React y que dependen del club
// (nombre, iconos, dominio...). Antes estaban escritos a mano en public/;
// ahora se generan a partir de club.config.js, tanto en `npm run dev`
// (servidos al vuelo) como en `npm run build` (escritos en dist/).
function archivosDelClub(apiUrl) {
  const manifest = (datos, iconos, ruta) =>
    JSON.stringify(
      {
        name: datos.nombre,
        short_name: datos.nombreCorto,
        description: datos.descripcion,
        id: ruta,
        start_url: ruta,
        scope: ruta,
        display: "standalone",
        background_color: CLUB.colorTema,
        theme_color: CLUB.colorTema,
        icons: [192, 512].map((lado) => ({
          src: iconos[lado],
          sizes: `${lado}x${lado}`,
          type: "image/png",
          purpose: "any",
        })),
      },
      null,
      2
    ) + "\n";

  const paginasSitemap = [
    { ruta: "/", frecuencia: "weekly", prioridad: "1.0" },
    { ruta: "/galeria", frecuencia: "weekly", prioridad: "0.6" },
    { ruta: "/historico", frecuencia: "monthly", prioridad: "0.5" },
    { ruta: "/aviso-legal", frecuencia: "yearly", prioridad: "0.2" },
    { ruta: "/privacidad", frecuencia: "yearly", prioridad: "0.2" },
  ];
  const hoy = new Date().toISOString().slice(0, 10);

  // Config para los scripts clásicos de public/ (service-worker.js y
  // push-token-db.js), que no pueden importar módulos: la dejan en
  // self.CLUB_CONFIG (window en la página, self en el service worker).
  const configScripts = {
    apiUrl,
    nombreApp: CLUB.nombreApp,
    iconoAviso: CLUB.imagenes.iconoAviso,
    badgeAviso: CLUB.imagenes.badgeAviso,
    pushTokenDb: CLUB.pushTokenDb,
  };

  return {
    "manifest.json": {
      tipo: "application/manifest+json",
      contenido: manifest(
        { nombre: CLUB.nombre, nombreCorto: CLUB.nombreApp, descripcion: CLUB.descripcionApp },
        CLUB.imagenes.iconosApp,
        "/"
      ),
    },
    "manifest-admin.json": {
      tipo: "application/manifest+json",
      contenido: manifest(CLUB.admin, CLUB.imagenes.iconosAppAdmin, "/admin"),
    },
    "robots.txt": {
      tipo: "text/plain",
      contenido: `User-agent: *\nAllow: /\nDisallow: /socios\n\nSitemap: ${CLUB.dominio}/sitemap.xml\n`,
    },
    "sitemap.xml": {
      tipo: "application/xml",
      contenido:
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        paginasSitemap
          .map(
            (p) =>
              `  <url>\n    <loc>${CLUB.dominio}${p.ruta}</loc>\n    <lastmod>${hoy}</lastmod>\n` +
              `    <changefreq>${p.frecuencia}</changefreq>\n    <priority>${p.prioridad}</priority>\n  </url>\n`
          )
          .join("") +
        `</urlset>\n`,
    },
    "club-config.js": {
      tipo: "text/javascript",
      contenido:
        `// Generado por vite.config.js a partir de club.config.js — no editar a mano.\n` +
        `self.CLUB_CONFIG = ${JSON.stringify(configScripts, null, 2)};\n`,
    },
  };
}

function escaparHtml(texto) {
  return String(texto).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// index.html lleva marcadores {{ruta.en.club.config}} (p.ej. {{nombre}},
// {{imagenes.favicon.ico}}) que se rellenan aquí. Un marcador que no
// existe en club.config.js rompe el build a propósito, para no publicar
// una página con "{{...}}" a la vista.
function rellenarIndexHtml(html) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, ruta) => {
    const valor = ruta.split(".").reduce((obj, clave) => obj?.[clave], CLUB);
    if (valor == null || typeof valor === "object") {
      throw new Error(`index.html: "{{${ruta}}}" no existe en club.config.js`);
    }
    return escaparHtml(valor);
  });
}

function pluginClub(apiUrl) {
  const archivos = archivosDelClub(apiUrl);
  return {
    name: "club",
    transformIndexHtml: { order: "pre", handler: rellenarIndexHtml },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const archivo = archivos[(req.url || "").split("?")[0].replace(/^\//, "")];
        if (!archivo) return next();
        res.setHeader("Content-Type", `${archivo.tipo}; charset=utf-8`);
        res.end(archivo.contenido);
      });
    },
    generateBundle() {
      for (const [fileName, { contenido }] of Object.entries(archivos)) {
        this.emitFile({ type: "asset", fileName, source: contenido });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), pluginClub(env.VITE_API_URL || CLUB.apiUrl)],
    build: {
      outDir: "dist",
    },
  };
});
