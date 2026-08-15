import { useEffect, useState } from "react";
import { TablaClasificacion } from "./AdminCompeticionesExternas.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Competiciones({ usuario }) {
  const [plataformas, setPlataformas] = useState([]);
  const [torneosExternos, setTorneosExternos] = useState([]);
  const [torneosVikings, setTorneosVikings] = useState([]);
  const [ligasVikings, setLigasVikings] = useState([]);
  const [pestana, setPestana] = useState("vikings");
  const [cargando, setCargando] = useState(true);

  const token = () => localStorage.getItem("socioToken");

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch(`${API_URL}/api/competiciones-externas/plataformas`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/competiciones-externas/torneos`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/torneos-club/activos`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/ligas-club/activos`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, t, tv, lv]) => {
        setPlataformas(p);
        setTorneosExternos(t);
        setTorneosVikings(tv);
        setLigasVikings(lv);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="chronicle-status">Cargando competiciones…</p>;

  const pestanas = [{ id: "vikings", nombre: "Vikings" }, ...plataformas.map((p) => ({ id: p.id, nombre: p.nombre }))];

  return (
    <div>
      <h3>Competiciones activas</h3>
      <div className="admin-tabs" style={{ marginBottom: "1rem" }}>
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`admin-tab ${pestana === p.id ? "admin-tab-active" : ""}`}
            onClick={() => setPestana(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {pestana === "vikings" && (
        <div>
          {torneosVikings.length === 0 && ligasVikings.length === 0 && (
            <p className="chronicle-status">No hay competiciones internas activas ahora mismo.</p>
          )}
          {torneosVikings.map((t) => (
            <div key={`t-${t.id}`} className="admin-list-item">
              <div>
                <a href={`/torneo/${t.id}`} target="_blank" rel="noopener noreferrer"><strong>{t.nombre}</strong></a>
                <time style={{ display: "block", fontSize: ".8em" }}>{formatFecha(t.fechaInicio)} – {formatFecha(t.fechaFin)} · Torneo</time>
              </div>
            </div>
          ))}
          {ligasVikings.map((l) => (
            <div key={`l-${l.id}`} className="admin-list-item">
              <div>
                <a href={`/liga/${l.id}`} target="_blank" rel="noopener noreferrer"><strong>{l.nombre}</strong></a>
                <time style={{ display: "block", fontSize: ".8em" }}>{formatFecha(l.fechaInicio)} – {formatFecha(l.fechaFin)} · Liga</time>
              </div>
            </div>
          ))}
        </div>
      )}

      {pestana !== "vikings" && (
        <div>
          {torneosExternos.filter((t) => t.plataformaId === pestana).length === 0 && (
            <p className="chronicle-status">No hay torneos de esta plataforma todavía.</p>
          )}
          {torneosExternos.filter((t) => t.plataformaId === pestana).map((t) => (
            <div key={t.id} className="admin-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <strong>{t.nombre}</strong>
              {t.nivel && <span style={{ color: "var(--steel)" }}> — {t.nivel}</span>}
              {t.temporada && <span style={{ display: "block", fontSize: ".8em" }}>{t.temporada}</span>}
              <TablaClasificacion filas={t.clasificacion} />
              {t.equipos.map((eq) => (
                <div key={eq.id} style={{ marginTop: ".6rem" }}>
                  <em>{eq.nombreEquipo || "Vikings"}{eq.capitan ? ` — Capitán: ${eq.capitan.nombre}` : ""}</em>
                  <ul>
                    {eq.partidos.map((p) => (
                      <li key={p.id} style={{ fontSize: ".85em" }}>
                        {formatFecha(p.fecha)} — vs {p.rival || "?"}
                        {p.resultado ? ` — ${p.resultado}` : p.fijado ? " — confirmado" : " — sin confirmar"}
                        {p.maquina ? ` (${p.maquina.nombre})` : ""}
                      </li>
                    ))}
                    {eq.partidos.length === 0 && <li style={{ fontSize: ".85em", opacity: 0.7 }}>Sin partidos todavía.</li>}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
