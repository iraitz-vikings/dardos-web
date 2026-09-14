import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function ResultadoPartido({ p, t }) {
  const estado = p.ganado === null ? t("partido.pendiente") : p.ganado ? t("partido.ganado") : t("partido.perdido");
  return (
    <li style={{ fontSize: ".9em" }}>
      {t("partido.vs")} {p.rival || "?"} — {estado}{p.resultado ? ` (${p.resultado})` : ""}
    </li>
  );
}

export default function HistorialTorneos() {
  const { t } = useLang();
  const RAMA_ETIQUETA = { ganadores: t("partido.ramaGanadores"), perdedores: t("partido.ramaPerdedores"), final: t("partido.ramaFinal") };
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

  if (cargando) return <p className="chronicle-status">{t("historial.cargando")}</p>;
  if (!datos) return null;

  const sinNada = datos.torneos.length === 0 && datos.ligas.length === 0;

  return (
    <div>
      <h3>{t("zona.historial")}</h3>
      {sinNada && (
        <p className="chronicle-status">
          {t("historial.vacio")}
        </p>
      )}

      {datos.torneos.length > 0 && (
        <>
          <h4>{t("historial.torneos")}</h4>
          {datos.torneos.map((t2, i) => (
            <div key={i} className="admin-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <strong>{t2.nombre}</strong> <span style={{ color: "var(--steel)" }}>— {t2.cuadrante}</span>
              {t2.etiqueta.includes("/") && (
                <span style={{ display: "block", fontSize: ".8em" }}>{t("historial.jugasteComo")} {t2.etiqueta}</span>
              )}
              <ul style={{ marginTop: ".5rem" }}>
                {t2.partidos.map((p, j) => (
                  <li key={j} style={{ fontSize: ".9em" }}>
                    {RAMA_ETIQUETA[p.rama]} {t("partido.ronda")} {p.ronda} — <ResultadoPartido p={p} t={t} />
                  </li>
                ))}
                {t2.partidos.length === 0 && <li style={{ fontSize: ".9em", opacity: 0.7 }}>{t("historial.sinEnfrentamientos")}</li>}
              </ul>
            </div>
          ))}
        </>
      )}

      {datos.ligas.length > 0 && (
        <>
          <h4>{t("historial.ligas")}</h4>
          {datos.ligas.map((l, i) => (
            <div key={i} className="admin-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <strong>{l.nombre}</strong>
              {l.etiqueta.includes("/") && (
                <span style={{ display: "block", fontSize: ".8em" }}>{t("historial.jugasteComo")} {l.etiqueta}</span>
              )}
              <ul style={{ marginTop: ".5rem" }}>
                {l.partidos.map((p, j) => (
                  <li key={j} style={{ fontSize: ".9em" }}>
                    {t("partido.jornada")} {p.jornada} — <ResultadoPartido p={p} t={t} />
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
