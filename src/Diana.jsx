import { useRef } from "react";
import { ORDEN_SECTORES, RADIOS, resultadoDardo } from "./dardosLogica.js";

// Diana interactiva en SVG: cada tap/click se traduce a un resultado de
// dardo (número, multiplicador, valor) usando la misma geometría estándar
// que dardosLogica.js. No es una réplica exacta de una diana reglamentaria
// (colores simplificados para encajar con el resto de la web), pero los
// radios y ángulos de las zonas de puntuación sí son los reales.

const CENTRO = 200;
const RADIO_PX = 180; // radio en píxeles del borde exterior del anillo de doble

function pol2cart(r, anguloDeg) {
  // anguloDeg: 0 = arriba, sentido horario (misma convención que resultadoDardo)
  const rad = ((anguloDeg - 90) * Math.PI) / 180;
  return { x: CENTRO + r * Math.cos(rad), y: CENTRO + r * Math.sin(rad) };
}

function pathAnillo(rInterior, rExterior, anguloInicio, anguloFin) {
  const p1 = pol2cart(rExterior, anguloInicio);
  const p2 = pol2cart(rExterior, anguloFin);
  const p3 = pol2cart(rInterior, anguloFin);
  const p4 = pol2cart(rInterior, anguloInicio);
  return `M ${p1.x} ${p1.y} A ${rExterior} ${rExterior} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInterior} ${rInterior} 0 0 0 ${p4.x} ${p4.y} Z`;
}

const R = {
  bullInterior: RADIOS.bullInterior * RADIO_PX,
  bullExterior: RADIOS.bullExterior * RADIO_PX,
  tripleInterior: RADIOS.tripleInterior * RADIO_PX,
  tripleExterior: RADIOS.tripleExterior * RADIO_PX,
  dobleInterior: RADIOS.dobleInterior * RADIO_PX,
  dobleExterior: RADIOS.dobleExterior * RADIO_PX,
};

const CLARO = "#e7e0cd"; // var(--bone)
const OSCURO = "#14151a";
const VERDE = "#3a7d5c";
const ROJO = "#9a2b28"; // similar a var(--blood)

const SECTORES = ORDEN_SECTORES.map((numero, i) => ({
  numero,
  inicio: i * 18 - 9,
  fin: i * 18 + 9,
  par: i % 2 === 0,
}));

export default function Diana({ onTirada, deshabilitada, marcas = [] }) {
  const svgRef = useRef(null);

  function manejarClick(e) {
    if (deshabilitada || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clienteX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clienteY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (clienteX === undefined || clienteY === undefined) return;
    // Coordenadas del click dentro del viewBox 0..400, con centro en (200,200)
    const xSvg = ((clienteX - rect.left) / rect.width) * 400;
    const ySvg = ((clienteY - rect.top) / rect.height) * 400;
    const dx = (xSvg - CENTRO) / RADIO_PX;
    const dy = (ySvg - CENTRO) / RADIO_PX;
    onTirada(resultadoDardo(dx, dy), { xSvg, ySvg });
  }

  return (
    <svg
      ref={svgRef}
      viewBox="-20 -20 440 440"
      className={`diana-svg ${deshabilitada ? "diana-deshabilitada" : ""}`}
      onClick={manejarClick}
      role="img"
      aria-label="Diana interactiva: toca el punto donde ha caído el dardo"
    >
      <circle cx={CENTRO} cy={CENTRO} r={R.dobleExterior + 6} fill={OSCURO} />
      {SECTORES.map((s) => (
        <g key={s.numero}>
          <path d={pathAnillo(R.bullExterior, R.tripleInterior, s.inicio, s.fin)} fill={s.par ? CLARO : OSCURO} />
          <path d={pathAnillo(R.tripleInterior, R.tripleExterior, s.inicio, s.fin)} fill={s.par ? ROJO : VERDE} />
          <path d={pathAnillo(R.tripleExterior, R.dobleInterior, s.inicio, s.fin)} fill={s.par ? CLARO : OSCURO} />
          <path d={pathAnillo(R.dobleInterior, R.dobleExterior, s.inicio, s.fin)} fill={s.par ? ROJO : VERDE} />
        </g>
      ))}
      <circle cx={CENTRO} cy={CENTRO} r={R.bullExterior} fill={VERDE} />
      <circle cx={CENTRO} cy={CENTRO} r={R.bullInterior} fill={ROJO} />

      {SECTORES.map((s) => {
        const p = pol2cart(R.dobleExterior + 16, s.inicio + 9);
        return (
          <text key={s.numero} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="diana-numero">
            {s.numero}
          </text>
        );
      })}

      {marcas.map((m, i) => (
        <circle key={i} cx={m.xSvg} cy={m.ySvg} r={6} className="diana-marca" />
      ))}
    </svg>
  );
}
