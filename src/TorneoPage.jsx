import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import LiveTournament from "./LiveTournament.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TorneoPage({ id }) {
  const [torneo, setTorneo] = useState(null);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error

  useEffect(() => {
    fetch(`${API_URL}/api/torneos-club/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("no encontrado");
        return r.json();
      })
      .then((data) => {
        setTorneo(data);
        setEstado("ok");
      })
      .catch(() => setEstado("error"));
  }, [id]);

  return (
    <>
      <Nav />
      <main>
        <section className="torneo-pagina">
          {estado === "cargando" && <p className="chronicle-status">Cargando el torneo…</p>}
          {estado === "error" && (
            <p className="chronicle-status">No hemos encontrado este torneo, o ya no es público.</p>
          )}
          {estado === "ok" && torneo && (
            <>
              <p className="eyebrow">Torneo del club</p>
              <h1 className="chronicle-title">{torneo.nombre}</h1>
              <p className="torneo-pagina-fechas">
                {formatFecha(torneo.fechaInicio)} – {formatFecha(torneo.fechaFin)}
                {torneo.finalizado ? " · Finalizado" : ""}
              </p>
              {torneo.insigniaUrl && (
                <img src={torneo.insigniaUrl} alt={`Insignia ${torneo.nombre}`} className="torneo-pagina-insignia" />
              )}
              {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}

              <LiveTournament torneo={torneo} />
            </>
          )}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
