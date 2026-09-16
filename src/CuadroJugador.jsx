import { useState } from "react";
import { tiradorActual } from "./dardosLogica.js";

// Tarjeta de jugador/equipo con el resultado (legs ganados) y las
// estadísticas del partido dentro del cuadro, en dos slides navegables por
// separado en cada jugador (puntitos debajo) — compartida por
// JuegoHerramienta.jsx (partidos de torneo/liga, con estadísticas guardadas
// en el backend) y Marcadores.jsx (calculadora suelta, todo en memoria, sin
// guardar nada). Quién tira ya no se dice con texto: se ve por el cuadro
// relleno en naranja (`.marcador-jugador-activo`, ver styles.css).
export function fmtProm(n) {
  return n == null ? "—" : n.toFixed(1);
}
export function fmtPct(convertidos, intentos) {
  return intentos ? `${Math.round((convertidos / intentos) * 100)}%` : "—";
}

export function CabeceraPartida({ alMejorDe, numeroLeg }) {
  return (
    <p className="marcador-tiradas-visita" style={{ textAlign: "center" }}>
      Al mejor de {alMejorDe} · Leg {numeroLeg}
    </p>
  );
}

export function CuadroJugador({ unidad, esInicioLeg, activo, ganador, legsGanados, valorPrincipal, dardoInfo, slides }) {
  const [slide, setSlide] = useState(0);
  return (
    <div className={`marcador-jugador ${activo ? "marcador-jugador-activo" : ""} ${ganador ? "marcador-jugador-ganador" : ""}`}>
      <strong>
        {esInicioLeg && <span className="marcador-punto-inicio" title="Ha empezado este leg">●</span>}
        {unidad.etiqueta}
      </strong>
      {unidad.integrantes.length > 1 && <span style={{ fontSize: ".7em", color: "var(--steel)" }}>Tira: {tiradorActual(unidad)}</span>}

      <span className="marcador-resultado-partido">Legs: {legsGanados}</span>
      <span className="marcador-restante">{valorPrincipal}</span>
      {activo && dardoInfo && <span className="marcador-dardo-info">{dardoInfo}</span>}

      <div className="marcador-stats-slide">
        <p className="marcador-stats-titulo">{slides[slide].titulo}</p>
        {slides[slide].filas.map(([etiqueta, valor]) => (
          <p key={etiqueta} className="marcador-stats-fila">
            <span>{etiqueta}</span>
            <strong>{valor}</strong>
          </p>
        ))}
        <div className="marcador-stats-dots">
          {slides.map((s, i) => (
            <button
              key={i}
              type="button"
              className={`marcador-stats-dot ${slide === i ? "marcador-stats-dot-activo" : ""}`}
              aria-label={s.titulo}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
