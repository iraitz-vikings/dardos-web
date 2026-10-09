import { useState } from "react";
import { useLang } from "./i18n.jsx";
import Marcadores from "./Marcadores.jsx";
import RetarAmistoso from "./RetarAmistoso.jsx";

// Sección "VikingsCounter" de la zona de socios: unifica el marcador
// (partido en local, en este mismo dispositivo — Marcadores.jsx) y el
// amistoso remoto (cada jugador desde su móvil — RetarAmistoso.jsx), antes
// dos apartados sueltos. Al entrar se elige local o remoto.
export default function VikingsCounter() {
  const { t } = useLang();
  const [modo, setModo] = useState("local");

  return (
    <div>
      <nav className="admin-tabs" style={{ marginBottom: ".6rem" }}>
        <button
          type="button"
          className={`admin-tab ${modo === "local" ? "admin-tab-active" : ""}`}
          onClick={() => setModo("local")}
        >
          {t("vc.local")}
        </button>
        <button
          type="button"
          className={`admin-tab ${modo === "remoto" ? "admin-tab-active" : ""}`}
          onClick={() => setModo("remoto")}
        >
          {t("vc.remoto")}
        </button>
      </nav>
      <p className="admin-hint" style={{ marginTop: 0, marginBottom: "1rem" }}>
        {modo === "local" ? t("vc.localHint") : t("vc.remotoHint")}
      </p>

      {modo === "local" ? <Marcadores /> : <RetarAmistoso />}
    </div>
  );
}
