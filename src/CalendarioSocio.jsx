import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const DIAS_KEYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

function formatFechaCorta(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "short" });
}
function formatHora(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleTimeString(lang === "eu" ? "eu-ES" : "es-ES", { hour: "2-digit", minute: "2-digit" });
}
function inicioDeSemana(fechaBase) {
  const d = new Date(fechaBase);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export default function CalendarioSocio() {
  const { t, lang } = useLang();
  const DIAS_ABREV = DIAS_KEYS.map((k) => t(`calendarioSocio.diaAbrev.${k}`));
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

  const diasSemana = DIAS_KEYS.map((_, i) => {
    const d = new Date(semana);
    d.setDate(d.getDate() + i);
    return d;
  });

  const maquinas = [...new Set(eventos.map((e) => e.maquina || t("calendarioSocio.sinMaquina")))].sort();

  function eventosDe(maquina, dia) {
    return eventos.filter((e) => {
      const fechaEvento = new Date(e.fecha);
      return (e.maquina || t("calendarioSocio.sinMaquina")) === maquina && fechaEvento.toDateString() === dia.toDateString();
    });
  }

  return (
    <div>
      <h3>{t("zona.calendario")}</h3>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button type="button" className="admin-link-btn" onClick={() => cambiarSemana(-1)}>← {t("calendarioSocio.semanaAnterior")}</button>
        <strong>{formatFechaCorta(diasSemana[0], lang)} – {formatFechaCorta(diasSemana[6], lang)}</strong>
        <button type="button" className="admin-link-btn" onClick={() => cambiarSemana(1)}>{t("calendarioSocio.semanaSiguiente")} →</button>
        <button type="button" className="admin-link-btn" onClick={() => setSemana(inicioDeSemana(new Date()))}>{t("calendarioSocio.hoy")}</button>
      </div>

      {cargando && <p className="chronicle-status">{t("calendarioSocio.cargando")}</p>}

      {!cargando && eventos.length === 0 && (
        <p className="chronicle-status">{t("calendarioSocio.vacio")}</p>
      )}

      {!cargando && eventos.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-tabla-clasificacion" style={{ minWidth: "700px" }}>
            <thead>
              <tr>
                <th>{t("calendarioSocio.maquina")}</th>
                {diasSemana.map((d, i) => (
                  <th key={i}>{DIAS_ABREV[i]}<br />{formatFechaCorta(d, lang)}</th>
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
                          <strong>{formatHora(e.fecha, lang)}</strong>
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
