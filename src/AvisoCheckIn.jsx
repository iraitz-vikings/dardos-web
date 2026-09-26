import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { API_URL } from "./config.js";


// Idiomas en los que se puede recibir avisos por Telegram — pensado sobre
// todo para invitados puntuales extranjeros (p.ej. jugadores de Francia en
// el Open), que así reciben sus avisos de partidos en su idioma aunque el
// club gestione todo en castellano. Ver Jugador.idiomaAvisos en
// schema.prisma e IDIOMAS_VALIDOS en notificaciones.js (checkin/:token/idioma).
const IDIOMAS_AVISOS = [
  { id: "es", etiqueta: "Castellano" },
  { id: "eu", etiqueta: "Euskara" },
  { id: "fr", etiqueta: "Français" },
];

// Página de check-in de un invitado: se abre desde el enlace personal que
// el club le pasa (/aviso/:token). Su único propósito es llevarle al bot de
// Telegram del club con el token ya incluido, para vincular su chat con su
// ficha de jugador y así poder avisarle cuando se fije un partido suyo. Solo
// hace falta hacerlo una vez: el vínculo queda guardado para siempre.
export default function AvisoCheckIn({ token }) {
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [idioma, setIdioma] = useState("es");
  const [guardandoIdioma, setGuardandoIdioma] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/notificaciones/checkin/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Este enlace de avisos no es válido.");
        setInfo(data);
        setIdioma(data.idiomaAvisos || "es");
        setEstado("ok");
      })
      .catch((err) => {
        setError(err.message || "Este enlace de avisos no es válido.");
        setEstado("error");
      });
  }, [token]);

  async function cambiarIdioma(nuevo) {
    setIdioma(nuevo);
    setGuardandoIdioma(true);
    try {
      await fetch(`${API_URL}/api/notificaciones/checkin/${encodeURIComponent(token)}/idioma`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idioma: nuevo }),
      });
    } catch {
      // No es crítico: si falla, se queda con el idioma anterior en el
      // servidor y el invitado puede volver a intentarlo.
    } finally {
      setGuardandoIdioma(false);
    }
  }

  return (
    <>
      <Nav />
      <main>
        <section className="gallery gallery-page" style={{ maxWidth: 520, margin: "0 auto" }}>
          <p className="eyebrow">Avisos de partidos</p>
          <h2 className="chronicle-title">Activa tus avisos</h2>

          {estado === "cargando" && <p className="chronicle-status">Comprobando tu enlace…</p>}

          {estado === "error" && (
            <p className="chronicle-status">
              {error} Pide un enlace nuevo al club.
            </p>
          )}

          {estado === "ok" && (
            <div>
              <p>
                Hola{info.nombre ? `, ${info.nombre}` : ""}. Para que el club pueda avisarte por Telegram cuando se
                fije un partido tuyo, pulsa el botón de abajo y dale a <strong>Iniciar</strong> en el bot. Solo hace
                falta hacerlo una vez.
              </p>

              <div style={{ margin: "1rem 0" }}>
                <p className="admin-hint" style={{ marginBottom: ".4rem" }}>
                  ¿En qué idioma quieres recibir tus avisos? / Zein hizkuntzatan jaso nahi dituzu zure abisuak? / Dans quelle langue veux-tu recevoir tes notifications ?
                </p>
                <div className="nav-lang" style={{ justifyContent: "flex-start" }}>
                  {IDIOMAS_AVISOS.map((op, i) => (
                    <span key={op.id} style={{ display: "contents" }}>
                      {i > 0 && <span>/</span>}
                      <button
                        type="button"
                        className={idioma === op.id ? "nav-lang-activo" : ""}
                        disabled={guardandoIdioma}
                        onClick={() => cambiarIdioma(op.id)}
                      >
                        {op.etiqueta}
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {info.telegramVinculado && (
                <p className="admin-msg admin-msg-ok">Ya tienes tus avisos activados por Telegram. ¡Todo listo!</p>
              )}

              {!info.telegramVinculado && info.urlTelegram && (
                <a href={info.urlTelegram} target="_blank" rel="noreferrer">
                  <button type="button">Activar avisos por Telegram</button>
                </a>
              )}

              {!info.urlTelegram && (
                <p className="chronicle-status">
                  El club todavía no ha terminado de configurar los avisos por Telegram. Inténtalo más adelante.
                </p>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
