import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { LoginPin, CLAVE_TOKEN, CLAVE_JUGADOR } from "./JuegoHerramienta.jsx";
import { apiFetch } from "./apiHerramienta.js";
import { useLang } from "./i18n.jsx";

// Pestaña pública "Torneos" (/torneos): identificación con PIN (mismo
// sistema y misma sesión que la herramienta de marcador, sirve para
// miembros, amigos e invitados) y, una vez dentro, solo los torneos/ligas
// en los que participa el jugador Y que el admin ha marcado "anclar a
// inicio" — ver GET /mis-competiciones en el backend.

function fmtFecha(iso) {
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PaginaTorneos() {
  const { t } = useLang();
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; }
  });
  const [jugador, setJugador] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_JUGADOR) || "null"); } catch { return null; }
  });
  const [competiciones, setCompeticiones] = useState(null);
  const [error, setError] = useState("");

  function salir() {
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem(CLAVE_JUGADOR);
    } catch { /* sin almacenamiento, no pasa nada */ }
    setToken("");
    setJugador(null);
    setCompeticiones(null);
  }

  function alEntrar({ token: nuevoToken, jugador: nuevoJugador }) {
    try {
      sessionStorage.setItem(CLAVE_TOKEN, nuevoToken);
      sessionStorage.setItem(CLAVE_JUGADOR, JSON.stringify(nuevoJugador));
    } catch { /* se queda en memoria */ }
    setToken(nuevoToken);
    setJugador(nuevoJugador);
  }

  useEffect(() => {
    if (!token) return;
    setError("");
    apiFetch("/api/partidas-herramienta/mis-competiciones", { token })
      .then(setCompeticiones)
      .catch((err) => {
        if (err.status === 401) return salir();
        setError(err.message || "No se han podido cargar tus torneos.");
      });
  }, [token]);

  return (
    <>
      <Nav />
      <main>
        <section className="torneo-pagina">
          <p className="eyebrow">{t("nav.torneos")}</p>
          <h1 className="chronicle-title">{t("nav.torneos")}</h1>

          {!token && (
            <>
              <p className="chronicle-status">Identifícate con tu PIN para ver tus torneos y ligas.</p>
              <LoginPin onEntrar={alEntrar} />
            </>
          )}

          {token && (
            <>
              <p className="chronicle-status">
                Sesión: <strong>{jugador?.nombre}</strong>{" "}
                <button type="button" className="admin-link-btn" onClick={salir}>(cambiar de jugador)</button>
              </p>
              {error && <p className="admin-msg admin-msg-error">{error}</p>}
              {competiciones && competiciones.length === 0 && (
                <p className="chronicle-status">No participas ahora mismo en ningún torneo o liga destacado.</p>
              )}
              {competiciones && competiciones.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: ".75rem", maxWidth: 560 }}>
                  {competiciones.map((c) => (
                    <a
                      key={`${c.tipo}-${c.id}`}
                      className="admin-tab"
                      style={{ display: "flex", gap: ".75rem", alignItems: "center", textAlign: "left", textDecoration: "none" }}
                      href={`/${c.tipo === "liga" ? "liga" : "torneo"}/${c.id}`}
                    >
                      {c.insigniaUrl && <img src={c.insigniaUrl} alt="" width={48} height={48} style={{ objectFit: "contain" }} />}
                      <span>
                        <strong>{c.nombre}</strong>
                        <br />
                        <small>
                          {c.tipo === "liga" ? "Liga" : "Torneo"} · {fmtFecha(c.fechaInicio)} – {fmtFecha(c.fechaFin)}
                          {c.finalizado ? " · Finalizado" : ""} · {c.etiquetaPropia}
                        </small>
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
