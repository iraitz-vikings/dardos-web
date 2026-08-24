import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

// Página de check-in de un invitado: se abre desde el enlace personal que
// el club le pasa (/aviso/:token). Su único propósito es llevarle al bot de
// Telegram del club con el token ya incluido, para vincular su chat con su
// ficha de jugador y así poder avisarle cuando se fije un partido suyo. Solo
// hace falta hacerlo una vez: el vínculo queda guardado para siempre.
export default function AvisoCheckIn({ token }) {
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/notificaciones/checkin/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Este enlace de avisos no es válido.");
        setInfo(data);
        setEstado("ok");
      })
      .catch((err) => {
        setError(err.message || "Este enlace de avisos no es válido.");
        setEstado("error");
      });
  }, [token]);

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
