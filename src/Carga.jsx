// Pantalla de carga inicial (pedido de Iraitz, 2026-09-19): al abrir la app
// instalada (o la web), antes de que se vea el contenido real, se muestra
// un momento el escudo EN SU VERSIÓN TRANSPARENTE (no el icono cuadrado
// opaco) centrado sobre el fondo del tema, con un efecto — resplandor rojo
// pulsante detrás + entrada con rebote + un brillo metálico que recorre el
// escudo — y luego se desvanece solo, revelando la página real (que ya se
// ha ido montando debajo mientras tanto, no se espera a que termine la
// carga para empezar a pedir datos).
//
// Nota: esto es una splash "de la propia app" (React), no la nativa del
// sistema operativo al instalar/abrir desde el icono — esa la genera el
// navegador a partir del manifest.json (icono + background_color) y no se
// puede animar ni personalizar más allá de eso.
import { useEffect, useState } from "react";

const DURACION_VISIBLE_MS = 1500;
const DURACION_SALIDA_MS = 500;

export default function Carga({ logoUrl }) {
  const [fase, setFase] = useState("entrando"); // entrando -> saliendo -> oculto

  useEffect(() => {
    const t1 = setTimeout(() => setFase("saliendo"), DURACION_VISIBLE_MS);
    const t2 = setTimeout(() => setFase("oculto"), DURACION_VISIBLE_MS + DURACION_SALIDA_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (fase === "oculto") return null;

  const mascara = {
    WebkitMaskImage: `url(${logoUrl})`,
    maskImage: `url(${logoUrl})`,
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };

  return (
    <div className={`carga-inicial ${fase === "saliendo" ? "carga-inicial-saliendo" : ""}`}>
      <div className="carga-inicial-glow" />
      <div className="carga-inicial-logo-wrap">
        <img src={logoUrl} alt="Vikings" className="carga-inicial-logo" />
        <div className="carga-inicial-brillo" style={mascara} />
      </div>
    </div>
  );
}
