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
    icon: "https://res.cloudinary.com/lodi1y1k/image/upload/v1786283841/vikings-logo-transparente_bjtv7c.png",
    badge: "https://res.cloudinary.com/lodi1y1k/image/upload/v1786283841/vikings-logo-transparente_bjtv7c.png",
    data: { url: datos.url || "/" },
  };

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
