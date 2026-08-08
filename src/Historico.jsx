import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Historico() {
  const [torneos, setTorneos] = useState([]);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    fetch(`${API_URL}/api/torneos-club`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTorneos(data.filter((t) => t.finalizado));
        setEstado("ok");
      })
      .catch(() => setEstado("error"));
  }, []);

  return (
    <>
      <Nav />
      <main>
        <section className="gallery gallery-page">
          <p className="eyebrow">Histórico</p>
          <h2 className="chronicle-title">Torneos finalizados</h2>

          {estado === "cargando" && <p className="chronicle-status">Cargando…</p>}
          {estado === "ok" && torneos.length === 0 && (
            <p className="chronicle-status">Todavía no hay torneos finalizados.</p>
          )}
          {estado === "ok" && torneos.length > 0 && (
            <ul className="historico-lista">
              {torneos.map((t) => (
                <li key={t.id} className="historico-item">
                  <a href={`/torneo/${t.id}`}>
                    <strong>{t.nombre}</strong>
                    <time>{formatFecha(t.fechaInicio)} – {formatFecha(t.fechaFin)}</time>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
