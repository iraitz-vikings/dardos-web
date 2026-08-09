import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import LiveTournament from "./LiveTournament.jsx";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TorneoPage({ id }) {
  const { t } = useLang();
  const [torneo, setTorneo] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error

  useEffect(() => {
    let primera = true;
    const cargar = () => {
      fetch(`${API_URL}/api/torneos-club/${id}`)
        .then((r) => {
          if (!r.ok) throw new Error("no encontrado");
          return r.json();
        })
        .then((data) => {
          setTorneo(data);
          setEstado("ok");
        })
        .catch(() => {
          if (primera) setEstado("error");
        })
        .finally(() => {
          primera = false;
        });
    };
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, [id]);

  return (
    <>
      <Nav />
      <main>
        <section className="torneo-pagina">
          {estado === "cargando" && <p className="chronicle-status">{t("torneoPage.loading")}</p>}
          {estado === "error" && (
            <p className="chronicle-status">{t("torneoPage.notfound")}</p>
          )}
          {estado === "ok" && torneo && (
            <>
              <p className="eyebrow">{t("torneoPage.eyebrow")}</p>
              <h1 className="chronicle-title">{torneo.nombre}</h1>
              <p className="torneo-pagina-fechas">
                {formatFecha(torneo.fechaInicio)} – {formatFecha(torneo.fechaFin)}
                {torneo.finalizado ? " · Finalizado" : ""}
              </p>
              {torneo.insigniaUrl && (
                <img src={torneo.insigniaUrl} alt={`Insignia ${torneo.nombre}`} className="torneo-pagina-insignia" />
              )}
              {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}

              <details className="torneo-pagina-qr">
                <summary>{t("torneoPage.share")}</summary>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                  alt="Código QR de esta página"
                  width={160}
                  height={160}
                />
                <p className="torneo-pagina-qr-url">{window.location.href}</p>
              </details>

              <LiveTournament torneo={torneo} />
            </>
          )}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
