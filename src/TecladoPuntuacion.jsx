import { useState } from "react";
import { useLang } from "./i18n.jsx";

// Entrada rápida para el 501: en vez de marcar cada dardo por separado, se
// escribe de una vez el total de puntos conseguidos en la visita (hasta 3
// dardos), como en muchos contadores manuales de 501. Es más rápida pero se
// pierde el detalle de qué dardo exacto se ha tirado — por eso, cuando la
// modalidad de cierre exige doble o máster y el total deja el resto a 0, no
// se sabe si el dardo de cierre cumplía la modalidad: eso se confirma
// después, con la pregunta "¿cuántos dardos ha tirado al doble/máster?"
// (ver JuegoHerramienta.jsx / Marcadores.jsx, tirarVisitaTotal). Antes había
// aquí una casilla aparte para confirmarlo antes de enviar, redundante con
// esa pregunta y fácil de olvidar — se quitó, ahora hay un único paso.

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "C"];

export default function TecladoPuntuacion({ onEnviar, deshabilitada }) {
  const { t } = useLang();
  const [valor, setValor] = useState("");

  function pulsar(tecla) {
    if (deshabilitada) return;
    if (tecla === "C") return setValor("");
    if (tecla === "⌫") return setValor((v) => v.slice(0, -1));
    setValor((v) => (v.length >= 3 ? v : v + tecla));
  }

  function enviar() {
    if (deshabilitada || valor === "") return;
    onEnviar(Number(valor));
    setValor("");
  }

  return (
    <div className="teclado-puntuacion">
      <div className="teclado-puntuacion-visor-fila">
        <div className="teclado-puntuacion-visor">{valor}</div>
        <button type="button" onClick={enviar} disabled={deshabilitada || valor === ""} className="admin-link-btn marcador-boton-destacado teclado-puntuacion-enviar">
          {t("marcador.enviar")}
        </button>
      </div>

      <div className="teclado-puntuacion-grid">
        {TECLAS.map((t) => (
          <button
            key={t}
            type="button"
            className="teclado-puntuacion-boton"
            disabled={deshabilitada}
            onClick={() => pulsar(t)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
