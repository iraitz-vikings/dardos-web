import { useState } from "react";

// Entrada rápida para el 501: en vez de marcar cada dardo por separado, se
// escribe de una vez el total de puntos conseguidos en la visita (hasta 3
// dardos), como en muchos contadores manuales de 501. Es más rápida pero se
// pierde el detalle de qué dardo exacto se ha tirado — por eso, cuando la
// modalidad de cierre exige doble o máster, hace falta confirmar aparte que
// el dardo que ha dejado el marcador a 0 cumplía esa condición (no se puede
// deducir solo del total). Ver Marcadores.jsx (tirarVisitaTotal) para cómo
// se usa esa confirmación.

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "C"];

export default function TecladoPuntuacion({ cierre, onEnviar, deshabilitada }) {
  const [valor, setValor] = useState("");
  const [cierreValido, setCierreValido] = useState(false);

  function pulsar(tecla) {
    if (deshabilitada) return;
    if (tecla === "C") return setValor("");
    if (tecla === "⌫") return setValor((v) => v.slice(0, -1));
    setValor((v) => (v.length >= 3 ? v : v + tecla));
  }

  function enviar() {
    if (deshabilitada || valor === "") return;
    onEnviar(Number(valor), { cierreValido });
    setValor("");
    setCierreValido(false);
  }

  return (
    <div className="teclado-puntuacion">
      <div className="teclado-puntuacion-visor">{valor === "" ? "Puntuación de la visita" : valor}</div>

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

      {cierre !== "simple" && (
        <label className="teclado-puntuacion-cierre">
          <input type="checkbox" checked={cierreValido} disabled={deshabilitada} onChange={(e) => setCierreValido(e.target.checked)} />
          El último dardo de esta visita ha sido {cierre === "master" ? "doble o triple" : "doble"} (solo hace falta marcarlo si con esta
          visita se llega justo a 0)
        </label>
      )}

      <button type="button" onClick={enviar} disabled={deshabilitada || valor === ""} className="admin-link-btn marcador-boton-destacado">
        Enviar
      </button>
    </div>
  );
}
