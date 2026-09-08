import { useState } from "react";
import { NUMEROS_DEL_1_AL_20, resultadoDesdeNumero } from "./dardosLogica.js";

// Alternativa a Diana.jsx para marcar un dardo: en vez de tocar el punto
// exacto sobre el dibujo de la diana, se elige el multiplicador (pestañas
// Simple/Doble/Triple) y luego el número con botones — más fácil de acertar
// con el dedo en el móvil que las coronas finas del SVG. Bull y Fallo son
// botones aparte porque no tienen "número base" que multiplicar. Mismo
// resultado que Diana (mismo formato de tirada), así que Marcadores.jsx no
// necesita distinguir de dónde vino cada dardo.

const MULTIPLICADORES = [
  { clave: 1, etiqueta: "Simple" },
  { clave: 2, etiqueta: "Doble" },
  { clave: 3, etiqueta: "Triple" },
];

export default function TecladoNumeros({ onTirada, deshabilitada }) {
  const [multiplicador, setMultiplicador] = useState(1);

  function tirar(resultado) {
    if (deshabilitada) return;
    onTirada(resultado);
  }

  return (
    <div className="teclado-numeros">
      <div className="teclado-numeros-tabs">
        {MULTIPLICADORES.map((m) => (
          <button
            key={m.clave}
            type="button"
            className={`admin-tab ${multiplicador === m.clave ? "admin-tab-active" : ""}`}
            disabled={deshabilitada}
            onClick={() => setMultiplicador(m.clave)}
          >
            {m.etiqueta}
          </button>
        ))}
        <button
          type="button"
          className="admin-tab"
          disabled={deshabilitada}
          onClick={() => tirar(resultadoDesdeNumero("bull50", 1))}
        >
          Bull 50
        </button>
        <button
          type="button"
          className="admin-tab"
          disabled={deshabilitada}
          onClick={() => tirar(resultadoDesdeNumero("bull25", 1))}
        >
          25 exterior
        </button>
      </div>

      <div className="teclado-numeros-grid">
        {NUMEROS_DEL_1_AL_20.map((n) => (
          <button
            key={n}
            type="button"
            className="teclado-numeros-boton"
            disabled={deshabilitada}
            onClick={() => tirar(resultadoDesdeNumero(n, multiplicador))}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="admin-link-btn teclado-numeros-fallo"
        disabled={deshabilitada}
        onClick={() => tirar(resultadoDesdeNumero("fallo", 1))}
      >
        Fallo (fuera de la diana)
      </button>
    </div>
  );
}
