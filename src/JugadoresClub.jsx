import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function JugadoresClub() {
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/jugadores/directorio`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtrados = jugadores.filter((j) => j.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  return (
    <div>
      <h3>Jugadores del club</h3>
      <input
        type="text"
        placeholder="Buscar jugador…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />

      {cargando && <p className="chronicle-status">Cargando…</p>}
      {!cargando && filtrados.length === 0 && <p className="chronicle-status">No hay jugadores que coincidan.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
        {filtrados.map((j) => (
          <div key={j.id} className="admin-form" style={{ textAlign: "center", padding: "1rem" }}>
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
            {j.usuarioId && <div style={{ fontSize: ".7em", color: "var(--ember)", marginTop: ".3rem" }}>Socio</div>}
            {j.bio && <p style={{ fontSize: ".82em", marginTop: ".5rem" }}>{j.bio}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
