import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Historico() {
  const { t } = useLang();
  const [torneos, setTorneos] = useState([]);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    fetch(`${API_URL}/api/torneos-club`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTorneos(data.filter((tc) => tc.finalizado));
        setEstado("ok");
      })
      .catch(() => setEstado("error"));
  }, []);

  return (
    <>
      <Nav />
      <main>
        <section className="gallery gallery-page">
          <p className="eyebrow">{t("historico.eyebrow")}</p>
          <h2 className="chronicle-title">{t("historico.title")}</h2>

          {estado === "cargando" && <p className="chronicle-status">{t("historico.loading")}</p>}
          {estado === "ok" && torneos.length === 0 && (
            <p className="chronicle-status">{t("historico.none")}</p>
          )}
          {estado === "ok" && torneos.length > 0 && (
            <ul className="historico-lista">
              {torneos.map((tc) => (
                <li key={tc.id} className="historico-item">
                  <a href={`/torneo/${tc.id}`}>
                    <strong>{tc.nombre}</strong>
                    <time>{formatFecha(tc.fechaInicio)} – {formatFecha(tc.fechaFin)}</time>
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
