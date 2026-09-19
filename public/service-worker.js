// Service worker mínimo: solo existe para poder recibir avisos por Web
// Push y abrir la web al pulsarlos. No cachea nada (no es una PWA offline),
// así que no hay que tocarlo cada vez que se despliega una versión nueva.

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
    datos = { titulo: "Vikings Dardos", cuerpo: event.data ? event.data.text() : "" };
  }

  const titulo = datos.titulo || "Vikings Dardos";
  const opciones = {
    body: datos.cuerpo || "",
    icon: "https://res.cloudinary.com/lodi1y1k/image/upload/c_fill,g_auto,h_192,w_192/f_png/v1789382604/vikings-logo-icono-2026.png",
    // "badge" es el icono monocromo de la barra de estado en Android: el SO
    // solo mira el canal alfa (transparencia) y lo pinta en blanco/gris —
    // ignora el color. La versión anterior era un cuadrado opaco sin
    // transparencia (c_fill sobre fondo sólido), así que Android no
    // encontraba silueta que recortar y pintaba el cuadrado entero en
    // blanco. Usamos la versión con fondo transparente (b_transparent +
    // c_pad, como el favicon) y un tamaño más pequeño (96px, el recomendado
    // para badge) para que sí tenga alfa y se vea la silueta del escudo.
    badge: "https://res.cloudinary.com/lodi1y1k/image/upload/b_transparent,c_pad,h_96,w_96/f_png/v1789382590/vikings-logo-transparente-2026.png",
    data: { url: datos.url || "/" },
  };
  // Imagen grande opcional (p.ej. eliminación/campeón de un cuadrante). No
  // todos los navegadores/sistemas la muestran (sobre todo en escritorio),
  // pero si no la soportan simplemente se ignora sin romper el resto del aviso.
  if (datos.imagen) opciones.image = datos.imagen;

  event.waitUntil(self.registration.showNotification(titulo, opciones));
});

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
