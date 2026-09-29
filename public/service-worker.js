// Service worker mínimo: solo existe para poder recibir avisos por Web
// Push y abrir la web al pulsarlos. No cachea nada (no es una PWA offline),
// así que no hay que tocarlo cada vez que se despliega una versión nueva.

// club-config.js (lo genera vite.config.js a partir de club.config.js)
// deja en self.CLUB_CONFIG la URL del backend, el nombre de la app y los
// iconos de los avisos — este archivo es estático (no pasa por Vite) y no
// puede importar módulos. push-token-db.js define
// guardarTokenResuscripcionPush/leerTokenResuscripcionPush en self (ver ese
// archivo) — comparte código con SocioPerfil.jsx.
importScripts("/club-config.js", "/push-token-db.js");

const CLUB_SW = self.CLUB_CONFIG;
const API_URL_SW = CLUB_SW.apiUrl;

function claveVapidABytesSW(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Normalizada = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64Normalizada);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = { titulo: CLUB_SW.nombreApp, cuerpo: event.data ? event.data.text() : "" };
  }

  const titulo = datos.titulo || CLUB_SW.nombreApp;
  const opciones = {
    body: datos.cuerpo || "",
    icon: CLUB_SW.iconoAviso,
    // "badge" es el icono monocromo de la barra de estado en Android: el SO
    // solo mira el canal alfa (transparencia) y pinta de blanco todo lo
    // opaco, ignorando el color y el relieve interior. El escudo circular
    // es una moneda maciza (opaca de borde a borde salvo el fondo ya
    // quitado), así que Android solo veía "un círculo relleno" y lo pintaba
    // como un blob/cuadrado blanco sin forma reconocible. Por eso aquí
    // usamos un icono aparte, pensado para esto (club.config.js →
    // imagenes.badgeAviso): una silueta plana con huecos reales de
    // transparencia, para que sí se vea una forma reconocible a tamaño
    // diminuto.
    badge: CLUB_SW.badgeAviso,
    data: { url: datos.url || "/" },
  };
  // Un tag por partido (lo pone el backend, ver enviarPushAJugador en
  // webPush.js): "tu partido empieza", "falta 1 minuto", el recordatorio del
  // día y el eliminado/campeón de ese mismo partido se SUSTITUYEN en el móvil
  // en vez de apilarse, así solo queda una notificación viva por partido.
  // Menos avisos acumulados sin tocar = menos probabilidades de que Chrome/
  // Android den la web por "molesta" y retiren el permiso solos (lo que pasó
  // en mitad de un torneo). renotify: que el aviso que sustituye a otro
  // vuelva a sonar/vibrar (sin él, el reemplazo llegaría en silencio).
  if (datos.tag) {
    opciones.tag = datos.tag;
    opciones.renotify = true;
  }
  // Imagen grande opcional (p.ej. eliminación/campeón de un cuadrante). No
  // todos los navegadores/sistemas la muestran (sobre todo en escritorio),
  // pero si no la soportan simplemente se ignora sin romper el resto del aviso.
  if (datos.imagen) opciones.image = datos.imagen;

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

// Revisión en segundo plano de la suscripción push, sin que el socio tenga
// que abrir la web: registrada desde SocioPerfil.jsx con
// periodicSync.register() cuando el navegador lo soporta y concede el
// permiso (hoy en día, Chrome/Android con la web instalada — ver
// notificaciones-se-desactivan-solas-2026-09-22.md). El propio navegador
// decide cada cuánto lo ejecuta de verdad, el intervalo pedido es solo
// orientativo.
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "revisar-suscripcion-push") {
    event.waitUntil(revisarSuscripcionPush());
  }
});

async function revisarSuscripcionPush() {
  try {
    const suscripcionActual = await self.registration.pushManager.getSubscription();
    if (suscripcionActual) return; // sigue activa, nada que hacer

    // Si el propio permiso de notificaciones también se perdió (no solo la
    // suscripción), no hay nada que hacer en silencio: hace falta que el
    // socio pulse "Activar avisos" otra vez desde su perfil.
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const token = await leerTokenResuscripcionPush();
    if (!token) return; // este dispositivo nunca llegó a guardar el token (versión antigua o nunca se activó)

    const resClave = await fetch(`${API_URL_SW}/api/notificaciones/vapid-public-key`);
    if (!resClave.ok) return;
    const { publicKey } = await resClave.json();

    const nuevaSuscripcion = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveVapidABytesSW(publicKey),
    });
    const datos = nuevaSuscripcion.toJSON();

    await fetch(`${API_URL_SW}/api/notificaciones/push/resuscribir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, endpoint: datos.endpoint, keys: datos.keys }),
    });
  } catch {
    // Si algo falla (sin red, VAPID no configurado, etc.) se queda
    // desactivado hasta la próxima ejecución periódica, o hasta que el
    // socio entre en "Mi perfil" (que también lo intenta, ver AvisosPush).
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if (ventana.url.includes(self.location.origin) && "focus" in ventana) {
          ventana.navigate(url);
          return ventana.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
