import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function HistoricoPrivado() {
  const { t, lang } = useLang();
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    const auth = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/torneos-club/privados`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/ligas-club/privados`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([torneos, ligas]) => {
        const combinados = [
          ...torneos.map((t) => ({ ...t, tipo: "torneo" })),
          ...ligas.map((l) => ({ ...l, tipo: "liga" })),
        ].sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
        setItems(combinados);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  return (
    <div>
      <h3>{t("zona.historicoPrivado")}</h3>
      <p className="admin-hint-bloque">{t("historicoPriv.intro")}</p>

      {cargando && <p className="chronicle-status">{t("historicoPriv.cargando")}</p>}
      {!cargando && items.length === 0 && <p className="chronicle-status">{t("historicoPriv.vacio")}</p>}

      <ul>
        {items.map((item) => (
          <li key={`${item.tipo}-${item.id}`} className="admin-list-item">
            <div>
              <a href={`/${item.tipo === "liga" ? "liga" : "torneo"}/${item.id}`} target="_blank" rel="noopener noreferrer">
                <strong>{item.nombre}</strong>
              </a>
              <time style={{ display: "block", fontSize: ".8em" }}>
                {formatFecha(item.fechaInicio, lang)} – {formatFecha(item.fechaFin, lang)}{item.tipo === "liga" ? ` · ${t("historicoPriv.liga")}` : ""}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
