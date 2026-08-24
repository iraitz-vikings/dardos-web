import useResaltadoReciente from "./useResaltadoReciente.js";

const BOX_W = 176;
const BOX_H = 50;
const ROUND_GAP = 56;
const UNIT = 66;
const PAD = 16;
const TITLE_H = 30;
const COL_W = BOX_W + ROUND_GAP;

const RAMA_ETIQUETA = { ganadores: "Cuadro de ganadores", perdedores: "Cuadro de perdedores" };

// Calcula la posición (x, y) de cada partido dentro de una rama, usando los enlaces
// "siguientePartidoGanadorId" ya generados para saber qué caja alimenta a cuál.
// `signo` decide hacia qué lado crece la rama: +1 hacia la derecha (ganadores),
// -1 hacia la izquierda (perdedores) — así ambas ramas pueden compartir un mismo
// origen (columna 0, el sorteo inicial) en el layout combinado de BracketMirror.
function calcularLayout(partidos, signo = 1, lado = "ganadores") {
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
    const columna = signo > 0 ? colIndex : -(colIndex + 1);
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
      posiciones.push({ x: columna * COL_W, y, ronda, lado, partido: p });
    });
    anteriores.push(...matches);
  });

  return posiciones;
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

// Línea de conexión entre un partido y el siguiente que alimenta (su
// "siguientePartidoGanadorId"). `origen`/`destino` deben venir ya con las
// mismas coordenadas finales que se le pasan a <Caja> (x = borde izquierdo,
// y = centro vertical), para que la línea encaje exactamente con las cajas.
// Funciona en cualquier dirección: si el destino queda a la izquierda del
// origen (rama de perdedores, que crece hacia la izquierda) sale por el
// borde izquierdo de la caja en vez del derecho, que es lo que pasaba antes
// siempre que la rama solo crecía hacia la derecha.
function Linea({ origen, destino, activa }) {
  const haciaIzquierda = destino.x < origen.x;
  const x1 = haciaIzquierda ? origen.x : origen.x + BOX_W;
  const x2 = haciaIzquierda ? destino.x + BOX_W : destino.x;
  const y1 = origen.y;
  const y2 = destino.y;
  const midX = (x1 + x2) / 2;
  return (
    <polyline
      className={`bracket-linea ${activa ? "bracket-linea-activa" : ""}`}
      points={`${x1},${y1} ${midX},${y1} ${midX},${y2} ${x2},${y2}`}
      fill="none"
    />
  );
}

function BracketRama({ titulo, partidos, busqueda }) {
  const posiciones = calcularLayout(partidos, 1, "ganadores");
  if (posiciones.length === 0) return null;
  const idPosicion = Object.fromEntries(posiciones.map((p) => [p.partido.id, p]));
  const alturaTotal = Math.max(...posiciones.map((p) => p.y)) + UNIT / 2 + PAD * 2;
  const anchoTotal = Math.max(...posiciones.map((p) => p.x + BOX_W)) + PAD * 2;

  return (
    <div className="bracket-rama-visual">
      <p className="bracket-rama-titulo">{titulo}</p>
      <div className="bracket-scroll">
        <svg width={anchoTotal} height={alturaTotal} className="bracket-svg">
          {posiciones.map(({ x, y, partido }) => {
            if (!partido.siguientePartidoGanadorId) return null;
            const destino = idPosicion[partido.siguientePartidoGanadorId];
            if (!destino) return null;
            return (
              <Linea
                key={partido.id}
                origen={{ x: x + PAD, y: y + PAD }}
                destino={{ x: destino.x + PAD, y: destino.y + PAD }}
                activa={!!partido.ganador}
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

// Vista combinada de ganadores + perdedores en un único lienzo, partiendo de
// una columna central compartida (la ronda 1 de ganadores, el sorteo inicial):
// el cuadro de ganadores crece hacia la derecha y el de perdedores hacia la
// izquierda, como un cuadro doble "en espejo".
function BracketMirror({ ganadores, perdedores, busqueda }) {
  const posGanadores = calcularLayout(ganadores, 1, "ganadores");
  const posPerdedores = calcularLayout(perdedores, -1, "perdedores");
  const todas = [...posPerdedores, ...posGanadores];
  if (todas.length === 0) return null;

  const minX = Math.min(...todas.map((p) => p.x));
  const posiciones = todas.map((p) => ({ ...p, x: p.x - minX }));
  const idPosicion = Object.fromEntries(posiciones.map((p) => [p.partido.id, p]));

  const anchoTotal = Math.max(...posiciones.map((p) => p.x + BOX_W)) + PAD * 2;
  const alturaTotal = Math.max(...posiciones.map((p) => p.y)) + UNIT / 2 + PAD * 2 + TITLE_H;

  function rangoLado(lado) {
    const items = posiciones.filter((p) => p.lado === lado);
    if (items.length === 0) return null;
    return {
      x1: Math.min(...items.map((p) => p.x)) + PAD,
      x2: Math.max(...items.map((p) => p.x + BOX_W)) + PAD,
    };
  }
  const rangoGanadores = rangoLado("ganadores");
  const rangoPerdedores = rangoLado("perdedores");

  return (
    <div className="bracket-rama-visual">
      <div className="bracket-scroll">
        <svg width={anchoTotal} height={alturaTotal} className="bracket-svg">
          {rangoPerdedores && (
            <foreignObject x={rangoPerdedores.x1} y={0} width={rangoPerdedores.x2 - rangoPerdedores.x1} height={TITLE_H}>
              <p className="bracket-rama-titulo" style={{ textAlign: "center", margin: 0 }}>{RAMA_ETIQUETA.perdedores}</p>
            </foreignObject>
          )}
          {rangoGanadores && (
            <foreignObject x={rangoGanadores.x1} y={0} width={rangoGanadores.x2 - rangoGanadores.x1} height={TITLE_H}>
              <p className="bracket-rama-titulo" style={{ textAlign: "center", margin: 0 }}>{RAMA_ETIQUETA.ganadores}</p>
            </foreignObject>
          )}
          {posiciones.map(({ x, y, partido }) => {
            if (!partido.siguientePartidoGanadorId) return null;
            const destino = idPosicion[partido.siguientePartidoGanadorId];
            if (!destino) return null;
            return (
              <Linea
                key={partido.id}
                origen={{ x: x + PAD, y: y + PAD + TITLE_H }}
                destino={{ x: destino.x + PAD, y: destino.y + PAD + TITLE_H }}
                activa={!!partido.ganador}
              />
            );
          })}
          {posiciones.map(({ x, y, partido }) => (
            <Caja key={partido.id} x={x + PAD} y={y + PAD + TITLE_H} partido={partido} busqueda={busqueda} />
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
      {perdedores.length > 0 ? (
        <BracketMirror ganadores={ganadores} perdedores={perdedores} busqueda={busqueda} />
      ) : (
        <BracketRama titulo={RAMA_ETIQUETA.ganadores} partidos={ganadores} busqueda={busqueda} />
      )}
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
