import { useEffect } from "react";
import { useLang } from "./i18n.jsx";
import MediasFabricante from "./MediasFabricante.jsx";
import AceroJugador from "./AceroJugador.jsx";

// Ventanita (modal) con el perfil público de un jugador: foto, nombre, apodo,
// bio, medias de fabricante y estadísticas con la herramienta. Compartida por
// "Jugadores del club" (lista de socios/amigos) y por el cuadrante de
// torneos/ligas (al pulsar un nombre). `jugador` tiene el shape que devuelve
// /api/jugadores/directorio o /api/jugadores/:id/ficha.
export default function PerfilJugadorModal({ jugador, onClose }) {
  const { t } = useLang();
  // Escape cierra la ventana, como el resto de ventanas de la web.
  useEffect(() => {
    if (!jugador) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jugador, onClose]);
  if (!jugador) return null;
  const sinAlias = (jugador.idsFabricantes || []).filter((i) => (i.idExterno || "").trim()).length === 0;

  return (
    <div className="perfil-jugador-modal" onClick={onClose}>
      <div className="perfil-jugador-panel" onClick={(e) => e.stopPropagation()}>
        <div className="perfil-jugador-panel-header">
          <button type="button" className="admin-link-btn" onClick={onClose} autoFocus>{t("jugadoresClub.cerrar")}</button>
        </div>
        <div className="perfil-jugador-cabecera">
          {jugador.avatarUrl ? (
            <img
              src={jugador.avatarUrl}
              alt={jugador.nombre}
              style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "var(--iron-2)", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.6rem", color: "var(--bone)",
              }}
            >
              {jugador.nombre.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <strong style={{ display: "block", fontSize: "1.15rem" }}>{jugador.nombre}</strong>
            {jugador.apodo && <span style={{ display: "block", opacity: 0.85 }}>"{jugador.apodo}"</span>}
            {jugador.usuarioId && (
              <span style={{ fontSize: ".7em", color: "var(--ember)" }}>{t("jugadoresClub.miembroBadge")}</span>
            )}
          </div>
        </div>
        {jugador.bio && <p className="perfil-jugador-bio">{jugador.bio}</p>}
        <MediasFabricante idsFabricantes={jugador.idsFabricantes} />
        {sinAlias && <p className="chronicle-status">{t("jugadoresClub.sinAlias")}</p>}
        <AceroJugador jugadorId={jugador.id} token={localStorage.getItem("socioToken")} />
      </div>
    </div>
  );
}
