import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";
import PerfilJugadorModal from "./PerfilJugadorModal.jsx";
import { agruparPorSocio } from "./agruparJugadores.js";
import { API_URL } from "./config.js";


export default function JugadoresClub() {
  const { t } = useLang();
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);
  // "socios" (Miembros) e "invitados" (Amigos) son los nombres internos de
  // siempre (agruparJugadores.js, sin cambios) — la etiqueta que ve el
  // socio/miembro es la única cosa que cambia aquí.
  const [pestana, setPestana] = useState("socios");

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/jugadores/directorio`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtrados = jugadores.filter((j) => j.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const { socios, invitados } = agruparPorSocio(filtrados);
  const listaActual = pestana === "socios" ? socios : invitados;

  const tarjeta = (j) => (
    <div
      key={j.id}
      className="jugador-tarjeta"
      style={{ padding: "1rem" }}
      role="button"
      tabIndex={0}
      onClick={() => setSeleccionado(j)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSeleccionado(j);
        }
      }}
    >
      {j.avatarUrl ? (
        <img
          src={j.avatarUrl}
          alt={j.nombre}
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", margin: "0 auto .6rem" }}
        />
      ) : (
        <div
          style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto .6rem",
            background: "var(--iron-2)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", color: "var(--bone)",
          }}
        >
          {j.nombre.charAt(0).toUpperCase()}
        </div>
      )}
      <strong style={{ display: "block" }}>{j.nombre}</strong>
      {j.apodo && <em style={{ fontSize: ".85em", color: "var(--steel)" }}>"{j.apodo}"</em>}
      {j.bio && <p style={{ fontSize: ".82em", marginTop: ".5rem" }}>{j.bio}</p>}
    </div>
  );

  return (
    <div>
      <h3>{t("zona.jugadores")}</h3>
      <input
        type="text"
        placeholder={t("jugadoresClub.buscarPlaceholder")}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />

      {cargando && <p className="chronicle-status">{t("jugadoresClub.cargando")}</p>}

      {!cargando && (
        <>
          <div className="admin-tabs" style={{ marginBottom: "1rem" }}>
            <button
              type="button"
              className={`admin-tab ${pestana === "socios" ? "admin-tab-active" : ""}`}
              onClick={() => setPestana("socios")}
            >
              {t("nav.socios")} ({socios.length})
            </button>
            <button
              type="button"
              className={`admin-tab ${pestana === "invitados" ? "admin-tab-active" : ""}`}
              onClick={() => setPestana("invitados")}
            >
              {t("jugadoresClub.amigos")} ({invitados.length})
            </button>
          </div>

          {listaActual.length === 0 && (
            <p className="chronicle-status">
              {pestana === "socios" ? t("jugadoresClub.vacioMiembros") : t("jugadoresClub.vacioAmigos")}
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
            {listaActual.map(tarjeta)}
          </div>
        </>
      )}

      {seleccionado && <PerfilJugadorModal jugador={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  );
}
