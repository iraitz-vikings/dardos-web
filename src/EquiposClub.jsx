import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";
import { API_URL } from "./config.js";


// Tarjeta de un equipo/pareja del club en la zona pública.
function TarjetaEquipo({ eq, t }) {
  return (
    <div className="admin-form" style={{ padding: "1rem" }}>
      {eq.escudoUrl && (
        <img src={eq.escudoUrl} alt={eq.nombre} style={{ width: 64, height: 64, objectFit: "contain", marginBottom: ".5rem" }} />
      )}
      <strong style={{ display: "block" }}>{eq.nombre}</strong>
      {eq.descripcion && <p style={{ fontSize: ".85em", margin: ".3rem 0" }}>{eq.descripcion}</p>}
      {eq.capitan && (
        <p style={{ fontSize: ".8em", color: "var(--ember)", margin: ".3rem 0" }}>{t("equiposClub.capitan")} {eq.capitan.nombre}</p>
      )}
      <ul style={{ marginTop: ".5rem" }}>
        {eq.miembros.map((m) => (
          <li key={m.id} style={{ fontSize: ".85em" }}>
            {m.jugador.nombre}{eq.capitanId === m.jugadorId ? " (C)" : ""}
          </li>
        ))}
        {eq.miembros.length === 0 && <li style={{ fontSize: ".85em", opacity: 0.7 }}>{t("equiposClub.sinJugadores")}</li>}
      </ul>
    </div>
  );
}

export default function EquiposClub() {
  const { t } = useLang();
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("equipos");

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/equipos-club`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setEquipos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  // Equipos (varios jugadores) y parejas (dos) en pestañas separadas.
  const parejas = equipos.filter((eq) => eq.tipo === "pareja");
  const equiposReales = equipos.filter((eq) => eq.tipo !== "pareja");
  const lista = vista === "parejas" ? parejas : equiposReales;

  const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" };

  return (
    <div>
      <h3>{t("zona.equipos")}</h3>

      <nav className="admin-tabs" style={{ marginBottom: "1.2rem" }}>
        <button
          type="button"
          className={`admin-tab ${vista === "equipos" ? "admin-tab-active" : ""}`}
          onClick={() => setVista("equipos")}
        >
          {t("equiposClub.equipos")}
        </button>
        <button
          type="button"
          className={`admin-tab ${vista === "parejas" ? "admin-tab-active" : ""}`}
          onClick={() => setVista("parejas")}
        >
          {t("equiposClub.parejas")}
        </button>
      </nav>

      {cargando && <p className="chronicle-status">{t("equiposClub.cargando")}</p>}
      {!cargando && lista.length === 0 && (
        <p className="chronicle-status">
          {vista === "parejas" ? t("equiposClub.vacioParejas") : t("equiposClub.vacioEquipos")}
        </p>
      )}

      {lista.length > 0 && (
        <div style={gridStyle}>
          {lista.map((eq) => (
            <TarjetaEquipo key={eq.id} eq={eq} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}
