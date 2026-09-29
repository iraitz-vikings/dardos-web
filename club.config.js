// Todo lo que es propio de un club concreto (nombre, logos, contacto,
// dominio, colores de la app instalada, textos de portada...) vive aquí, en
// un único sitio. Para montar la web de otro club a partir de esta se
// cambia este archivo (y los recursos de public/ indicados abajo) sin tocar
// el resto del código — ver NUEVO-CLUB.md.
//
// Lo leen tanto el código React (src/club.js lo reexporta) como
// vite.config.js, que con estos datos genera en cada build/dev los
// archivos que no pasan por React: index.html (título, Open Graph,
// favicons), manifest.json, manifest-admin.json, robots.txt, sitemap.xml y
// club-config.js (config para el service worker y push-token-db.js).
//
// Por eso este archivo tiene que ser JavaScript "plano": nada de
// import.meta.env ni imports de Vite.
//
// Otros recursos del club que NO están aquí:
//   - Colores y fondo de la web: bloque :root de src/club.css.
//   - Captura del mapa del footer: public/mapa-club.webp.
//   - favicon.ico de reserva (el que piden los navegadores por su cuenta):
//     public/favicon.ico.

const CLOUD = "https://res.cloudinary.com/lodi1y1k";

// Imágenes base en Cloudinary (sin transformación: las transformaciones de
// tamaño/formato se añaden abajo, en cada uso).
const LOGO = "v1789382590/vikings-logo-transparente-2026"; // escudo con fondo transparente
const LOGO_ICONO = "v1789382604/vikings-logo-icono-2026"; // escudo cuadrado opaco (iconos de app)
const LOGO_ADMIN = "v1789816550/IMG-20260910-WA0004_o3n7ly"; // icono propio de la app de admin

export default {
  // ---------- Nombres ----------
  // Nombre completo (título de la web, Open Graph, manifest).
  nombre: "Vikings Club de Dardos",
  // Nombre corto del club: pestaña "de casa" en Competiciones, equipo por
  // defecto cuando no tiene nombre, textos alternativos de los logos.
  nombreCorto: "Vikings",
  // Nombre de la web instalada como app (short_name) y título por defecto de
  // los avisos push.
  nombreApp: "Vikings Dardos",
  // Marca de la barra de navegación: "<principal> <em>secundario</em>".
  marcaNav: { principal: "Vikings", secundario: "Darts Club" },
  // Nombre del marcador de dardos (zona de socios y página de torneo/liga).
  nombreMarcador: "VikingsCounter",

  // ---------- Web ----------
  // Dominio público, sin barra final (canonical, Open Graph, sitemap, robots).
  dominio: "https://www.vikingsdartsclub.es",
  // URL del backend en producción. En local se sobrescribe con VITE_API_URL.
  apiUrl: "https://dardos-club-backend-production.up.railway.app",
  descripcion: "Vikings Club de Dardos — noticias, crónicas y torneos del club.",
  descripcionRedes: "Noticias, crónicas y torneos del Vikings Club de Dardos.",
  // Descripción de la web instalada como app (manifest.json).
  descripcionApp: "Web del Vikings Club de Dardos — noticias, torneos y avisos del club.",
  // Color de fondo/tema de la app instalada y de la barra del navegador.
  colorTema: "#0e0f13",

  // ---------- App de admin (/admin se instala como app aparte) ----------
  admin: {
    nombre: "Vikings Dardos — Admin",
    nombreCorto: "Vikings Admin",
    descripcion: "Panel de administración del Vikings Club de Dardos.",
  },

  // ---------- Imágenes ----------
  imagenes: {
    // Escudo transparente: nav, portada y pantalla de carga.
    logo: `${CLOUD}/image/upload/f_auto,q_auto/${LOGO}.png`,
    // Escudo del admin (pantalla de login y pantalla de carga de /admin).
    logoAdmin: `${CLOUD}/image/upload/e_background_removal/e_trim/b_transparent,c_pad,h_512,w_512/f_png/${LOGO_ADMIN}.png`,
    // Insignia del bloque "Próximo torneo" cuando el torneo no tiene la suya.
    insigniaTorneo: `${CLOUD}/image/upload/v1785705038/dardos-club/ykdezhnoze0porj7fk8q.jpg`,
    // Imagen para compartir en redes (WhatsApp, Facebook...).
    redes: `${CLOUD}/image/upload/c_fill,g_auto,h_512,w_512/f_png/${LOGO_ICONO}.png`,
    // Favicons de la web y del admin.
    favicon: {
      ico: `${CLOUD}/image/upload/b_transparent,c_pad,h_32,w_32/f_ico/${LOGO}.ico`,
      png16: `${CLOUD}/image/upload/b_transparent,c_pad,h_16,w_16/f_png/${LOGO}.png`,
      png32: `${CLOUD}/image/upload/b_transparent,c_pad,h_32,w_32/f_png/${LOGO}.png`,
      apple: `${CLOUD}/image/upload/c_fill,g_auto,h_180,w_180/f_png/${LOGO_ICONO}.png`,
    },
    faviconAdmin: {
      ico: `${CLOUD}/image/upload/e_background_removal/e_trim/b_transparent,c_pad,h_32,w_32/f_ico/${LOGO_ADMIN}.ico`,
      png16: `${CLOUD}/image/upload/e_background_removal/e_trim/b_transparent,c_pad,h_16,w_16/f_png/${LOGO_ADMIN}.png`,
      png32: `${CLOUD}/image/upload/e_background_removal/e_trim/b_transparent,c_pad,h_32,w_32/f_png/${LOGO_ADMIN}.png`,
      // La foto del admin trae mucho margen alrededor de la moneda: se
      // recorta al 70% central para que ambos iconos se vean del mismo
      // tamaño relativo.
      apple: `${CLOUD}/image/upload/c_crop,g_center,h_0.7,w_0.7/c_fill,g_auto,h_180,w_180/f_png/${LOGO_ADMIN}.png`,
    },
    // Iconos de la app instalada (manifest.json / manifest-admin.json).
    iconosApp: {
      192: `${CLOUD}/image/upload/c_fill,g_auto,h_192,w_192/r_38/f_png/${LOGO_ICONO}.png`,
      512: `${CLOUD}/image/upload/c_fill,g_auto,h_512,w_512/r_102/f_png/${LOGO_ICONO}.png`,
    },
    iconosAppAdmin: {
      192: `${CLOUD}/image/upload/c_crop,g_center,h_0.7,w_0.7/c_fill,g_auto,h_192,w_192/r_38/f_png/${LOGO_ADMIN}.png`,
      512: `${CLOUD}/image/upload/c_crop,g_center,h_0.7,w_0.7/c_fill,g_auto,h_512,w_512/r_102/f_png/${LOGO_ADMIN}.png`,
    },
    // Avisos push: icono a color y "badge" (silueta monocroma con huecos
    // transparentes que Android pinta en blanco en la barra de estado — un
    // escudo macizo se vería como un círculo blanco sin forma).
    iconoAviso: `${CLOUD}/image/upload/c_fill,g_auto,h_192,w_192/f_png/${LOGO_ICONO}.png`,
    badgeAviso: `${CLOUD}/image/upload/b_transparent,c_pad,h_96,w_96/f_png/v1789828140/vikings-notif-badge-silueta-2026-v5.png`,
  },

  // ---------- Contacto (footer) ----------
  contacto: {
    email: "vikingsdartsclub@hotmail.com",
    direccion: ["Aita Donostia Kalea, Nº 2 (trasera)", "20100 Errenteria, Gipuzkoa"],
    // Enlace que abre Google Maps (la captura del mapa es public/mapa-club.webp).
    mapaUrl: "https://www.google.com/maps?q=43.310774,-1.912812",
    mapaAlt: "Mapa: ubicación del club en Errenteria",
  },
  redes: {
    facebook: "https://www.facebook.com/Vikingsdartsclub/",
  },

  // ---------- Multimedia ----------
  // Vídeo de YouTube de la portada (id de 11 caracteres). null = sin vídeo.
  videoPortadaYoutube: "RV6ZBv9Y8wo",
  // Música de fondo de la galería pública. null = sin música.
  audioGaleria: `${CLOUD}/video/upload/v1786204416/Sons_of_the_Northern_Light_h7lq9t.mp3`,

  // ---------- Bloque "Próximo torneo" sin torneo destacado ----------
  // Lo que se enseña en la portada mientras el admin no ha elegido un
  // torneo destacado.
  torneoPorDefecto: {
    nombre: "II Open Villa Errenteria",
    diaInicio: "10",
    diaFin: "11",
    mesAnio: "Octubre 2026",
  },
  // Nota bajo el bloque "Próximo torneo" (siempre visible).
  notaTorneo: "Vikings is coming. Próximamente más información: inscripciones, horarios y categorías.",

  // ---------- Avisos push ----------
  // Nombre de la base de datos IndexedDB del token de re-suscripción (ver
  // public/push-token-db.js). Cambiarlo en un club que ya está en
  // producción haría perder el token guardado en los móviles de los socios.
  pushTokenDb: "vikings-push-token-db",

  // ---------- Textos propios del club, por idioma ----------
  // Sustituyen a los de src/i18n.jsx con la misma clave. Aquí van solo los
  // que llevan el nombre o el tono del club; el resto de textos de la web
  // son genéricos y están en i18n.jsx.
  textos: {
    es: {
      "hero.eyebrow": "Vikings · Club de dardos",
      "hero.title1": "La incursión",
      "hero.title2": "ya ha comenzado",
      "hero.subtitle": "Noticias, fotos de eventos y crónicas del club. Un solo lugar para seguir todo lo que pasa dentro y fuera de la diana.",
      "video.eyebrow": "Vikings TV",
      "footer.copy": "Vikings Darts Club",
    },
    eu: {
      "hero.eyebrow": "Vikings · Dardo kluba",
      "hero.title1": "Erasoaldia",
      "hero.title2": "hasi da",
      "hero.subtitle": "Berriak, ekitaldien argazkiak eta klubaren kronikak. Diana barruan zein kanpoan gertatzen den guztia jarraitzeko toki bakarra.",
      "video.eyebrow": "Vikings TV",
      "footer.copy": "Vikings Darts Club",
    },
    fr: {
      "hero.eyebrow": "Vikings · Club de fléchettes",
      "hero.title1": "L'incursion",
      "hero.title2": "a déjà commencé",
      "hero.subtitle": "Actualités, photos d'événements et chroniques du club. Un seul endroit pour suivre tout ce qui se passe autour de la cible.",
      "video.eyebrow": "Vikings TV",
      "footer.copy": "Vikings Darts Club",
    },
  },
};
