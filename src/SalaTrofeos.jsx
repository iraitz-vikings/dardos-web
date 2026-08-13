import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function SalaTrofeos() {
  const [trofeos, setTrofeos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/trofeos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTrofeos)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h3>Sala de trofeos</h3>
      {cargando && <p className="chronicle-status">Cargando…</p>}
      {!cargando && trofeos.length === 0 && <p className="chronicle-status">Todavía no hay trofeos registrados.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
        {trofeos.map((t) => (
          <div key={t.id} className="admin-form" style={{ padding: "1rem" }}>
            {t.imagenUrl && (
              <img src={t.imagenUrl} alt={t.titulo} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", marginBottom: ".6rem" }} />
            )}
            <strong style={{ display: "block" }}>🏆 {t.titulo}</strong>
            <span style={{ display: "block", color: "var(--ember)" }}>{t.anio} — {t.ganador}</span>
            {t.descripcion && <p style={{ fontSize: ".85em", marginTop: ".4rem" }}>{t.descripcion}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
