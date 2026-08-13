import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function CalendarioSocio() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/competiciones-externas/calendario`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDatos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="chronicle-status">Cargando calendario…</p>;
  if (!datos) return <p className="chronicle-status">No se pudo cargar el calendario.</p>;

  return (
    <div>
      <h3>Calendario de esta semana</h3>

      <h4>Partidos de ligas externas confirmados</h4>
      {datos.externos.length === 0 && <p className="chronicle-status">Ningún partido confirmado esta semana.</p>}
      <ul>
        {datos.externos.map((p) => (
          <li key={p.id} className="admin-list-item">
            <div>
              <strong>{p.equipo} vs {p.rival || "?"}</strong>
              <span style={{ display: "block", fontSize: ".8em" }}>
                {formatHora(p.fecha)} · {p.maquina || "sin máquina"} · {p.torneo} ({p.plataforma})
              </span>
            </div>
          </li>
        ))}
      </ul>

      <h4 style={{ marginTop: "1.5rem" }}>Enfrentamientos internos en curso ahora</h4>
      {datos.internos.length === 0 && <p className="chronicle-status">Ninguno marcado "en curso" ahora mismo.</p>}
      <ul>
        {datos.internos.map((p) => (
          <li key={p.id} className="admin-list-item">
            <div>
              <strong>{p.jugador1 || "?"} vs {p.jugador2 || "?"}</strong>
              <span style={{ display: "block", fontSize: ".8em" }}>{p.maquina || "sin máquina"} · {p.nombre}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className="admin-hint" style={{ marginTop: "1rem" }}>
        Referencia de días de la semana: {DIAS.join(" · ")}
      </p>
    </div>
  );
}
