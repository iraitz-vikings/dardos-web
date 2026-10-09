import { useEffect, useState } from "react";
import { propsCabeceraDesplegable } from "./cabeceraDesplegable.js";
import { TablaClasificacion } from "./AdminCompeticionesExternas.jsx";
import CalendarioJornadas from "./CalendarioJornadas.jsx";
import { apiFetch } from "./apiHerramienta.js";
import { useLang } from "./i18n.jsx";
import { CLUB } from "./club.js";

// Equipos y competiciones externas (Connection, Radikal, Phoenix...) del
// jugador identificado con PIN, en la pestaña "Competiciones" de la página
// pública de invitados (pedido de Iraitz, 2026-10-09: hay invitados que
// juegan en equipos del club en competiciones externas). Solo lectura y solo
// las suyas (GET /mis-competiciones-externas); la gestión de partidos del
// capitán sigue en la zona de socios (Competiciones.jsx), con la que comparte
// la forma de pintar clasificación y calendario.

function formatFecha(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : lang === "fr" ? "fr-FR" : "es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const nombreJugador = (j) => j?.apodo || j?.nombre || "";

export default function CompeticionesExternasInvitado({ token, onSesionCaducada }) {
  const { t, lang } = useLang();
  const [competiciones, setCompeticiones] = useState(null);
  const [error, setError] = useState("");
  const [abiertas, setAbiertas] = useState({});
  const [verHistorico, setVerHistorico] = useState(false);

  useEffect(() => {
    let vivo = true;
    setError("");
    apiFetch("/api/partidas-herramienta/mis-competiciones-externas", { token })
      .then((data) => {
        if (!vivo) return;
        setCompeticiones(data);
        // Con una sola competición en juego, se abre directamente.
        const enJuego = data.filter((c) => !c.terminado);
        if (enJuego.length === 1) setAbiertas({ [enJuego[0].id]: true });
      })
      .catch((err) => {
        if (!vivo) return;
        if (err.status === 401) return onSesionCaducada?.();
        setError(err.message || t("invitados.errorExternas"));
      });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) return <p className="admin-msg admin-msg-error">{error}</p>;
  if (!competiciones) return null;

  const terminadas = competiciones.filter((c) => c.terminado);
  const visibles = competiciones.filter((c) => !!c.terminado === verHistorico);

  return (
    <div style={{ maxWidth: 720, marginTop: "1.6rem" }}>
      <h3>{t("invitados.externas")}</h3>
      {competiciones.length === 0 && <p className="chronicle-status">{t("invitados.sinExternas")}</p>}
      {terminadas.length > 0 && (
        <div className="admin-tabs" style={{ marginBottom: "1rem", fontSize: ".85em" }}>
          <button type="button" className={`admin-tab ${!verHistorico ? "admin-tab-active" : ""}`} onClick={() => setVerHistorico(false)}>
            {t("competiciones.enJuego")}
          </button>
          <button type="button" className={`admin-tab ${verHistorico ? "admin-tab-active" : ""}`} onClick={() => setVerHistorico(true)}>
            {t("competiciones.historico")} ({terminadas.length})
          </button>
        </div>
      )}
      {competiciones.length > 0 && visibles.length === 0 && (
        <p className="chronicle-status">{t("invitados.sinExternasEnJuego")}</p>
      )}
      {visibles.map((tx) => {
        const abierta = !!abiertas[tx.id];
        return (
          <div key={tx.id} className="admin-cuadrante" style={{ marginBottom: "1rem" }}>
            <h4
              className="admin-ronda-header"
              style={{ margin: 0 }}
              {...propsCabeceraDesplegable(abierta, () => setAbiertas((prev) => ({ ...prev, [tx.id]: !abierta })))}
            >
              <span>
                {tx.nombre}
                {tx.nivel && <span style={{ color: "var(--steel)" }}> — {tx.nivel}</span>}
                {tx.temporada && <span style={{ fontSize: ".8em" }}> · {tx.temporada}</span>}
                {tx.plataforma?.nombre && <span style={{ fontSize: ".8em" }}> · {tx.plataforma.nombre}</span>}
              </span>
              <span className="admin-ronda-toggle">{abierta ? "▲" : "▼"}</span>
            </h4>

            {abierta && (
              <div style={{ marginTop: ".8rem" }}>
                {tx.clasificacion?.length > 0 && <TablaClasificacion filas={tx.clasificacion} />}
                {tx.equipos.map((eq) => {
                  const nombreEq = eq.nombre || CLUB.nombreCorto;
                  return (
                    <div key={eq.id} style={{ marginTop: ".8rem", paddingLeft: ".6rem", borderLeft: "2px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                        {eq.escudoUrl && <img src={eq.escudoUrl} alt="" width={36} height={36} style={{ objectFit: "contain" }} />}
                        <strong>{nombreEq}</strong>
                      </div>
                      {eq.capitan && eq.nombre && (
                        <p style={{ margin: ".3rem 0 0", fontSize: ".85em", opacity: 0.85 }}>
                          {t("competiciones.capitan")} {nombreJugador(eq.capitan)}
                          {eq.cocapitanes.length > 0 && ` · ${t("competiciones.cocapitan")} ${eq.cocapitanes.map(nombreJugador).join(", ")}`}
                        </p>
                      )}
                      {eq.plantilla.length > 0 && (
                        <p style={{ margin: ".2rem 0 0", fontSize: ".85em", opacity: 0.85 }}>
                          {t("invitados.plantilla")} {eq.plantilla.map(nombreJugador).join(", ")}
                        </p>
                      )}
                      {eq.clasificacion?.length > 0 && <TablaClasificacion filas={eq.clasificacion} />}
                      <CalendarioJornadas
                        partidos={eq.partidos}
                        vacio={t("competiciones.sinPartidos")}
                        renderPartido={(p) => (
                          <li key={p.id} style={{ fontSize: ".85em" }}>
                            {formatFecha(p.fecha, lang)} — {nombreEq} {t("partido.vs")} {p.rival || "?"}
                            {p.resultado ? ` — ${p.resultado}` : p.fijado ? ` — ${t("competiciones.confirmado")}` : ` — ${t("competiciones.sinConfirmar")}`}
                            {p.maquina ? ` (${p.maquina.nombre})` : ""}
                          </li>
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
