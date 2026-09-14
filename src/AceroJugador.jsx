import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

// Sección "Acero": medias calculadas a partir de partidas de torneo/liga
// jugadas de verdad con la herramienta de marcador (ver JuegoHerramienta.jsx
// y PartidaHerramienta en el backend — plan "herramienta-marcador-torneos-ligas"
// guardado en el proyecto, Slice 3+4/5). A propósito NUNCA incluye partidas
// jugadas "en solitario" con el marcador libre (Marcadores.jsx): esas no se
// guardan en ningún sitio, así que no hay nada que colar aquí por error.
// Mismo estilo que MediasFabricante.jsx (que muestra medias de fabricantes
// externos, scrapeadas) pero con datos propios del club.
export default function AceroJugador({ jugadorId, token }) {
  const { t } = useLang();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!jugadorId) return;
    setDatos(null);
    setCargando(true);
    fetch(`${API_URL}/api/jugadores/${jugadorId}/estadisticas-acero`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDatos)
      .catch(() => setDatos(null))
      .finally(() => setCargando(false));
  }, [jugadorId, token]);

  if (cargando) return <p className="chronicle-status">{t("acero.cargando")}</p>;
  if (!datos) return null;

  const stats501 = datos["501"];
  const cricket = datos.cricket;
  const sinNada = stats501.partidosJugados === 0 && cricket.partidosJugados === 0;
  if (sinNada) {
    return (
      <div style={{ marginTop: "1rem" }}>
        <h4>{t("acero.titulo")}</h4>
        <p className="chronicle-status">
          {t("acero.sinDatos")}
        </p>
      </div>
    );
  }

  return (
    <div className="acero-jugador">
      <h4 style={{ margin: 0 }}>{t("acero.titulo")}</h4>
      <p className="chronicle-status" style={{ margin: 0 }}>
        {t("acero.intro")}
      </p>

      {stats501.partidosJugados > 0 && (
        <div className="acero-jugador-item">
          <strong className="acero-jugador-titulo">
            501 — {stats501.partidosGanados}/{stats501.partidosJugados} {t("acero.partidos")} · {stats501.legsGanados}/{stats501.legsJugados} {t("acero.legs")}
          </strong>
          <span className="acero-jugador-stats">
            <span>{t("acero.media3")} {stats501.media}</span>
            <span>{t("acero.ppd")} {stats501.ppd}</span>
            <span>{t("acero.mejorCierre")} {stats501.mejorCheckout || "—"}</span>
            <span>100+: {stats501.visitas100}</span>
            <span>140+: {stats501.visitas140}</span>
            <span>180: {stats501.visitas180}</span>
          </span>
        </div>
      )}

      {cricket.partidosJugados > 0 && (
        <div className="acero-jugador-item">
          <strong className="acero-jugador-titulo">
            Cricket — {cricket.partidosGanados}/{cricket.partidosJugados} {t("acero.partidos")} · {cricket.legsGanados}/{cricket.legsJugados} {t("acero.legs")}
          </strong>
          <span className="acero-jugador-stats">
            <span>{t("acero.mpr")} {cricket.mpr}</span>
          </span>
        </div>
      )}
    </div>
  );
}
