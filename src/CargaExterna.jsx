import { useState } from "react";
import { useLang } from "./i18n.jsx";

// Contenido de terceros (vídeos de YouTube, mapa de Google) que NO se carga
// hasta que el visitante lo pide con un clic. Incrustarlo directamente hace
// que el navegador conecte con Google/YouTube nada más abrir la página —
// les manda la IP y les deja poner sus cookies — sin consentimiento previo,
// que es lo que exigen la LSSI (art. 22.2) y el RGPD (revisión de normativa
// 2026-09-29). Con el clic el visitante da ese consentimiento para ese
// contenido concreto, y así la web no necesita banner de cookies.
//
// Ocupa todo su contenedor (position: absolute), así que el padre tiene que
// tener tamaño propio (aspect-ratio) y position: relative. `children` es una
// función que devuelve el contenido real (normalmente un <iframe>) y solo se
// llama tras el clic.
export default function CargaExterna({ servicio, boton, children }) {
  const { t } = useLang();
  const [cargado, setCargado] = useState(false);

  if (cargado) return children();

  return (
    <div className="carga-externa">
      <button type="button" className="carga-externa-boton" onClick={() => setCargado(true)}>
        {boton}
      </button>
      <p className="carga-externa-aviso">{t("externo.aviso").replace("{servicio}", servicio)}</p>
    </div>
  );
}
