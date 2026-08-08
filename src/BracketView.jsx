import useResaltadoReciente from "./useResaltadoReciente.js";

const BOX_W = 176;
const BOX_H = 50;
const ROUND_GAP = 56;
const UNIT = 66;
const PAD = 16;

const RAMA_ETIQUETA = { ganadores: "Cuadro de ganadores", perdedores: "Cuadro de perdedores" };

// Calcula la posición (x, y) de cada partido dentro de una rama, usando los enlaces
// "siguientePartidoGanadorId" ya generados para saber qué caja alimenta a cuál.
function calcularLayout(partidos) {
  const porRonda = {};
  for (const p of partidos) {
    if (!porRonda[p.ronda]) porRonda[p.ronda] = [];
    porRonda[p.ronda].push(p);
  }
  const rondas = Object.keys(porRonda).map(Number).sort((a, b) => a - b);
  for (const r of rondas) porRonda[r].sort((a, b) => a.posicion - b.posicion);

  const yPorId = {};
  const posiciones = [];
  const anteriores = [];

  rondas.forEach((ronda, colIndex) => {
    const matches = porRonda[ronda];
    matches.forEach((p, i) => {
      let y;
      if (colIndex === 0) {
        y = i * UNIT + UNIT / 2;
      } else {
        const padres = anteriores.filter((q) => q.siguientePartidoGanadorId === p.id);
        if (padres.length > 0) {
          y = padres.reduce((s, q) => s + yPorId[q.id], 0) / padres.length;
        } else {
          y = i * UNIT + UNIT / 2;
        }
      }
      yPorId[p.id] = y;
      posiciones.push({ x: colIndex * (BOX_W + ROUND_GAP), y, ronda, partido: p });
    });
    anteriores.push(...matches);
  });

  const alturaTotal = posiciones.length ? Math.max(...posiciones.map((p) => p.y)) + UNIT / 2 + PAD * 2 : 0;
  const anchoTotal = rondas.length ? (rondas.length - 1) * (BOX_W + ROUND_GAP) + BOX_W + PAD * 2 : 0;

  return { posiciones, alturaTotal, anchoTotal, idPosicion: Object.fromEntries(posiciones.map((p) => [p.partido.id, p])) };
}

function coincide(nombre, busqueda) {
  return !!nombre && !!busqueda && nombre.toLowerCase().includes(busqueda.toLowerCase());
}

function Caja({ x, y, partido, busqueda }) {
  const decidido = !!partido.ganador;
  const reciente = useResaltadoReciente(partido.enCurso, partido.actualizadoEn);
  const encontrado = coincide(partido.jugador1, busqueda) || coincide(partido.jugador2, busqueda);
  return (
    <foreignObject x={x} y={y - BOX_H / 2} width={BOX_W} height={BOX_H}>
      <div
        className={`bracket-box ${decidido ? "bracket-box-decidido" : ""} ${partido.enCurso ? "bracket-box-en-curso" : ""} ${reciente ? "bracket-box-reciente" : ""} ${encontrado ? "bracket-box-encontrado" : ""}`}
      >
        <div className="bracket-box-ronda">{partido.ronda}{partido.maquina ? ` · ${partido.maquina}` : ""}</div>
        <div className={`bracket-box-jugador ${partido.ganador && partido.ganador === partido.jugador1 ? "bracket-box-ganador" : ""} ${coincide(partido.jugador1, busqueda) ? "bracket-box-jugador-encontrado" : ""}`}>
          {partido.jugador1 || (partido.ganador ? "BYE" : "?")}
        </div>
        <div className={`bracket-box-jugador ${partido.ganador && partido.ganador === partido.jugador2 ? "bracket-box-ganador" : ""} ${coincide(partido.jugador2, busqueda) ? "bracket-box-jugador-encontrado" : ""}`}>
          {partido.jugador2 || (partido.ganador ? "BYE" : "?")}
        </div>
      </div>
    </foreignObject>
  );
}

function BracketRama({ titulo, partidos, busqueda }) {
  const { posiciones, alturaTotal, anchoTotal, idPosicion } = calcularLayout(partidos);
  if (posiciones.length === 0) return null;

  return (
    <div className="bracket-rama-visual">
      <p className="bracket-rama-titulo">{titulo}</p>
      <div className="bracket-scroll">
        <svg width={anchoTotal} height={alturaTotal} className="bracket-svg">
          {posiciones.map(({ x, y, partido }) => {
            if (!partido.siguientePartidoGanadorId) return null;
            const destino = idPosicion[partido.siguientePartidoGanadorId];
            if (!destino) return null;
            const x1 = x + PAD + BOX_W;
            const y1 = y + PAD;
            const x2 = destino.x + PAD;
            const y2 = destino.y + PAD;
            const midX = x1 + ROUND_GAP / 2;
            return (
              <polyline
                key={partido.id}
                className={`bracket-linea ${partido.ganador ? "bracket-linea-activa" : ""}`}
                points={`${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                fill="none"
              />
            );
          })}
          {posiciones.map(({ x, y, partido }) => (
            <Caja key={partido.id} x={x + PAD} y={y + PAD} partido={partido} busqueda={busqueda} />
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function BracketView({ cuadrante, busqueda }) {
  const ganadores = cuadrante.partidos.filter((p) => p.rama === "ganadores");
  const perdedores = cuadrante.partidos.filter((p) => p.rama === "perdedores");
  const finales = cuadrante.partidos.filter((p) => p.rama === "final").sort((a, b) => a.posicion - b.posicion);

  return (
    <div className="bracket-visual">
      <BracketRama titulo={RAMA_ETIQUETA.ganadores} partidos={ganadores} busqueda={busqueda} />
      {perdedores.length > 0 && <BracketRama titulo={RAMA_ETIQUETA.perdedores} partidos={perdedores} busqueda={busqueda} />}
      {finales.length > 0 && (
        <div className="bracket-rama-visual">
          <p className="bracket-rama-titulo">Gran final</p>
          {finales.map((final, i) => (
            <div key={final.id} className={`bracket-final-box ${coincide(final.jugador1, busqueda) || coincide(final.jugador2, busqueda) ? "bracket-box-encontrado" : ""}`}>
              {i === 1 && <span className="bracket-final-desempate">Partido decisivo</span>}
              <span className={final.ganador && final.ganador === final.jugador1 ? "bracket-box-ganador" : ""}>
                {final.jugador1 || "?"}
              </span>
              <span className="bracket-vs">vs</span>
              <span className={final.ganador && final.ganador === final.jugador2 ? "bracket-box-ganador" : ""}>
                {final.jugador2 || "?"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
