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
  const [items, setItems] = useState([]);
  const [estado, setEstado] = useState("cargando");

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/torneos-club`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/ligas-club`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([torneos, ligas]) => {
        const combinados = [
          ...torneos.filter((tc) => tc.finalizado).map((tc) => ({ ...tc, tipo: "torneo" })),
          ...ligas.filter((l) => l.finalizado).map((l) => ({ ...l, tipo: "liga" })),
        ].sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
        setItems(combinados);
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
          {estado === "ok" && items.length === 0 && <p className="chronicle-status">{t("historico.none")}</p>}
          {estado === "ok" && items.length > 0 && (
            <ul className="historico-lista">
              {items.map((item) => (
                <li key={`${item.tipo}-${item.id}`} className="historico-item">
                  <a href={`/${item.tipo === "liga" ? "liga" : "torneo"}/${item.id}`}>
                    <strong>{item.nombre}</strong>
                    <time>
                      {formatFecha(item.fechaInicio)} – {formatFecha(item.fechaFin)}
                      {item.tipo === "liga" ? " · Liga" : ""}
                    </time>
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
