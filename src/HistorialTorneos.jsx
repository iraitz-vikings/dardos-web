import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const RAMA_ETIQUETA = { ganadores: "Ganadores", perdedores: "Perdedores", final: "Final" };

function ResultadoPartido({ p }) {
  const estado = p.ganado === null ? "pendiente" : p.ganado ? "✅ Ganado" : "❌ Perdido";
  return (
    <li style={{ fontSize: ".9em" }}>
      vs {p.rival || "?"} — {estado}{p.resultado ? ` (${p.resultado})` : ""}
    </li>
  );
}

export default function HistorialTorneos() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/perfil/historial`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { torneos: [], ligas: [] }))
      .then(setDatos)
      .catch(() => setDatos({ torneos: [], ligas: [] }))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="chronicle-status">Cargando tu historial…</p>;
  if (!datos) return null;

  const sinNada = datos.torneos.length === 0 && datos.ligas.length === 0;

  return (
    <div>
      <h3>Mi historial</h3>
      {sinNada && (
        <p className="chronicle-status">
          Todavía no has participado en ningún torneo o liga del club con tu ficha de jugador.
        </p>
      )}

      {datos.torneos.length > 0 && (
        <>
          <h4>Torneos</h4>
          {datos.torneos.map((t, i) => (
            <div key={i} className="admin-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <strong>{t.nombre}</strong> <span style={{ color: "var(--steel)" }}>— {t.cuadrante}</span>
              {t.etiqueta.includes("/") && (
                <span style={{ display: "block", fontSize: ".8em" }}>Jugaste como: {t.etiqueta}</span>
              )}
              <ul style={{ marginTop: ".5rem" }}>
                {t.partidos.map((p, j) => (
                  <li key={j} style={{ fontSize: ".9em" }}>
                    {RAMA_ETIQUETA[p.rama]} ronda {p.ronda} — <ResultadoPartido p={p} />
                  </li>
                ))}
                {t.partidos.length === 0 && <li style={{ fontSize: ".9em", opacity: 0.7 }}>Sin enfrentamientos todavía.</li>}
              </ul>
            </div>
          ))}
        </>
      )}

      {datos.ligas.length > 0 && (
        <>
          <h4>Ligas</h4>
          {datos.ligas.map((l, i) => (
            <div key={i} className="admin-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <strong>{l.nombre}</strong>
              {l.etiqueta.includes("/") && (
                <span style={{ display: "block", fontSize: ".8em" }}>Jugaste como: {l.etiqueta}</span>
              )}
              <ul style={{ marginTop: ".5rem" }}>
                {l.partidos.map((p, j) => (
                  <li key={j} style={{ fontSize: ".9em" }}>
                    Jornada {p.jornada} — <ResultadoPartido p={p} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
