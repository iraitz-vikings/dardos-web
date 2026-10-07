import { useState } from "react";

// Aviso en el panel de admin instalado como app (2026-10-07). La web se
// instala como dos apps de Android sobre el mismo dominio: la del club
// (scope "/") y la del admin (scope "/admin", ver main.jsx). Con una web
// instalada, Chrome deja el permiso de notificaciones del dominio en manos
// de la app de Android, y al abrir la app de admin (que nunca lo había
// pedido) lo igualaba al suyo: "Por defecto". Eso borraba el permiso y la
// suscripción de la app del club, y los avisos "se desactivaban solos"
// cada vez que se usaba el admin (confirmado con Iraitz). Pidiendo el
// permiso también aquí, las dos apps lo tienen concedido y no hay nada que
// igualar. Aquí solo hace falta el permiso: los avisos se siguen activando
// desde la zona de socios.
function estadoPermiso() {
  if (typeof Notification === "undefined") return null;
  const instalada =
    window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  if (!instalada) return null;
  return Notification.permission;
}

export default function AvisoPermisoAdmin() {
  const [permiso, setPermiso] = useState(estadoPermiso);

  if (!permiso || permiso === "granted") return null;

  async function pedir() {
    try {
      setPermiso(await Notification.requestPermission());
    } catch {
      setPermiso(estadoPermiso());
    }
  }

  return (
    <p className="admin-msg admin-msg-error" style={{ display: "flex", gap: ".6rem", alignItems: "center", flexWrap: "wrap" }}>
      {permiso === "denied" ? (
        <span>
          Esta app de admin tiene las notificaciones bloqueadas, y eso también desactiva los avisos de la app del club en
          este móvil. Actívalas en Ajustes de Android → Aplicaciones → {document.title} → Notificaciones.
        </span>
      ) : (
        <>
          <span>
            Permite las notificaciones también en esta app de admin. Si no, al abrirla se desactivan los avisos de la
            app del club en este móvil. Pulsa "Permitir" en la ventana que sale.
          </span>
          <button type="button" className="admin-link-btn" onClick={pedir}>Permitir notificaciones</button>
        </>
      )}
    </p>
  );
}
