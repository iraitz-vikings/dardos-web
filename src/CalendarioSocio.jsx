import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatFechaCorta(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}
function formatHora(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}
function inicioDeSemana(fechaBase) {
  const d = new Date(fechaBase);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export default function CalendarioSocio() {
  const [semana, setSemana] = useState(() => inicioDeSemana(new Date()));
  const [eventos, setEventos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    setCargando(true);
    fetch(`${API_URL}/api/calendario?inicio=${semana.toISOString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : { eventos: [] }))
      .then((data) => setEventos(data.eventos || []))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [semana]);

  function cambiarSemana(delta) {
    const nueva = new Date(semana);
    nueva.setDate(nueva.getDate() + delta * 7);
    setSemana(nueva);
  }

  const diasSemana = DIAS.map((_, i) => {
    const d = new Date(semana);
    d.setDate(d.getDate() + i);
    return d;
  });

  const maquinas = [...new Set(eventos.map((e) => e.maquina || "Sin máquina"))].sort();

  function eventosDe(maquina, dia) {
    return eventos.filter((e) => {
      const fechaEvento = new Date(e.fecha);
      return (e.maquina || "Sin máquina") === maquina && fechaEvento.toDateString() === dia.toDateString();
    });
  }

  return (
    <div>
      <h3>Calendario</h3>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button type="button" className="admin-link-btn" onClick={() => cambiarSemana(-1)}>← Semana anterior</button>
        <strong>{formatFechaCorta(diasSemana[0])} – {formatFechaCorta(diasSemana[6])}</strong>
        <button type="button" className="admin-link-btn" onClick={() => cambiarSemana(1)}>Semana siguiente →</button>
        <button type="button" className="admin-link-btn" onClick={() => setSemana(inicioDeSemana(new Date()))}>Hoy</button>
      </div>

      {cargando && <p className="chronicle-status">Cargando calendario…</p>}

      {!cargando && eventos.length === 0 && (
        <p className="chronicle-status">No hay partidos confirmados esta semana.</p>
      )}

      {!cargando && eventos.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-tabla-clasificacion" style={{ minWidth: "700px" }}>
            <thead>
              <tr>
                <th>Máquina</th>
                {diasSemana.map((d, i) => (
                  <th key={i}>{DIAS[i].slice(0, 3)}<br />{formatFechaCorta(d)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {maquinas.map((maquina) => (
                <tr key={maquina}>
                  <td><strong>{maquina}</strong></td>
                  {diasSemana.map((dia, i) => (
                    <td key={i} style={{ verticalAlign: "top", minWidth: "110px" }}>
                      {eventosDe(maquina, dia).map((e) => (
                        <div key={e.id} style={{ fontSize: ".78em", marginBottom: ".4rem", textAlign: "left" }}>
                          <strong>{formatHora(e.fecha)}</strong>
                          <div>{e.titulo}</div>
                          <em style={{ color: "var(--steel)" }}>{e.competicion}</em>
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
