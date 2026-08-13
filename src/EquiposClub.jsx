import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function EquiposClub() {
  const [equipos, setEquipos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/equipos-club`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setEquipos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h3>Equipos del club</h3>
      {cargando && <p className="chronicle-status">Cargando…</p>}
      {!cargando && equipos.length === 0 && <p className="chronicle-status">Todavía no hay equipos.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
        {equipos.map((eq) => (
          <div key={eq.id} className="admin-form" style={{ padding: "1rem" }}>
            {eq.escudoUrl && (
              <img src={eq.escudoUrl} alt={eq.nombre} style={{ width: 64, height: 64, objectFit: "contain", marginBottom: ".5rem" }} />
            )}
            <strong style={{ display: "block" }}>{eq.nombre}</strong>
            {eq.descripcion && <p style={{ fontSize: ".85em", margin: ".3rem 0" }}>{eq.descripcion}</p>}
            {eq.capitan && (
              <p style={{ fontSize: ".8em", color: "var(--ember)", margin: ".3rem 0" }}>Capitán: {eq.capitan.nombre}</p>
            )}
            <ul style={{ marginTop: ".5rem" }}>
              {eq.miembros.map((m) => (
                <li key={m.id} style={{ fontSize: ".85em" }}>
                  {m.jugador.nombre}{eq.capitanId === m.jugadorId ? " (C)" : ""}
                </li>
              ))}
              {eq.miembros.length === 0 && <li style={{ fontSize: ".85em", opacity: 0.7 }}>Sin jugadores todavía</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
