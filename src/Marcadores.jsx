import { useMemo, useState } from "react";

// Marcadores manuales de 501 y Cricket, para cuando se juega en una diana
// sin contador electrónico. Decisión explícita de Iraitz: sin persistencia
// (no se guarda nada al terminar, es solo una calculadora de apoyo mientras
// se juega) y hasta 6 jugadores/parejas por partida. Todo vive en memoria
// del componente — al recargar la página se pierde, como una libreta.

const MAX_JUGADORES = 6;
const NOMBRE_POR_DEFECTO = (i) => `Jugador ${i + 1}`;

// Pantalla de "cuántos jugadores y cómo se llaman", compartida por 501 y
// Cricket (misma UI, cada juego la usa con su propio estado independiente).
function ConfigurarJugadores({ onEmpezar }) {
  const [cantidad, setCantidad] = useState(2);
  const [nombres, setNombres] = useState([NOMBRE_POR_DEFECTO(0), NOMBRE_POR_DEFECTO(1)]);

  function cambiarCantidad(n) {
    setCantidad(n);
    setNombres((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) copia.push(NOMBRE_POR_DEFECTO(copia.length));
      return copia;
    });
  }

  function cambiarNombre(i, valor) {
    setNombres((actual) => actual.map((n, idx) => (idx === i ? valor : n)));
  }

  return (
    <div className="admin-form" style={{ maxWidth: 420 }}>
      <label>
        Jugadores o parejas
        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
          {Array.from({ length: MAX_JUGADORES - 1 }, (_, i) => i + 2).map((n) => (
            <button
              key={n}
              type="button"
              className={`admin-tab ${cantidad === n ? "admin-tab-active" : ""}`}
              onClick={() => cambiarCantidad(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </label>

      {nombres.map((nombre, i) => (
        <label key={i}>
          Nombre {i + 1}
          <input type="text" value={nombre} onChange={(e) => cambiarNombre(i, e.target.value)} maxLength={20} />
        </label>
      ))}

      <button
        type="button"
        onClick={() => onEmpezar(nombres.map((n) => (n.trim() ? n.trim() : NOMBRE_POR_DEFECTO(0))))}
        style={{ background: "var(--blood)", color: "var(--bone)", border: "none", padding: ".7rem 1rem", textTransform: "uppercase", letterSpacing: ".04em" }}
      >
        Empezar partida
      </button>
    </div>
  );
}

// --- 501 -------------------------------------------------------------

function Marcador501() {
  const [jugadores, setJugadores] = useState(null); // null = sin configurar todavía
  const [turno, setTurno] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [ganador, setGanador] = useState(null);
  const [tirada, setTirada] = useState("");
  const [aviso, setAviso] = useState("");

  function empezar(nombres) {
    setJugadores(nombres.map((nombre) => ({ nombre, restante: 501 })));
    setTurno(0);
    setHistorial([]);
    setGanador(null);
    setTirada("");
    setAviso("");
  }

  function registrarTirada(e) {
    e.preventDefault();
    if (ganador !== null) return;
    const n = Number(tirada);
    if (!Number.isInteger(n) || n < 0 || n > 180) {
      setAviso("Introduce un total de la tirada entre 0 y 180.");
      return;
    }
    setAviso("");
    const jugadorActual = jugadores[turno];
    const restanteAntes = jugadorActual.restante;
    const nuevoRestante = restanteAntes - n;
    const esBust = nuevoRestante < 0 || nuevoRestante === 1;

    setHistorial((h) => [...h, { jugador: turno, restanteAntes, tirada: n, bust: esBust }]);

    if (esBust) {
      setAviso(`${jugadorActual.nombre} se pasa (bust) — la tirada no cuenta, sigue con ${restanteAntes}.`);
    } else if (nuevoRestante === 0) {
      setJugadores((js) => js.map((j, i) => (i === turno ? { ...j, restante: 0 } : j)));
      setGanador(turno);
      setTirada("");
      return;
    } else {
      setJugadores((js) => js.map((j, i) => (i === turno ? { ...j, restante: nuevoRestante } : j)));
    }
    setTurno((t) => (t + 1) % jugadores.length);
    setTirada("");
  }

  function deshacer() {
    if (historial.length === 0) return;
    const ultima = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setJugadores((js) => js.map((j, i) => (i === ultima.jugador ? { ...j, restante: ultima.restanteAntes } : j)));
    setTurno(ultima.jugador);
    setGanador(null);
    setAviso("");
  }

  if (!jugadores) return <ConfigurarJugadores onEmpezar={empezar} />;

  return (
    <div>
      <p className="chronicle-status" style={{ marginBottom: "1rem" }}>
        Cada jugador empieza en 501. Tras cada turno, introduce el total sumado de las 3 tiradas
        (entre 0 y 180). No se valida que el cierre sea a doble — si tu grupo juega con esa regla,
        avisa vosotros mismos cuando el resto sea 1 o cuando alguien cierre sin doble.
      </p>

      <div className="marcador-jugadores">
        {jugadores.map((j, i) => (
          <div key={i} className={`marcador-jugador ${turno === i && ganador === null ? "marcador-jugador-activo" : ""} ${ganador === i ? "marcador-jugador-ganador" : ""}`}>
            <strong>{j.nombre}</strong>
            <span className="marcador-restante">{j.restante}</span>
          </div>
        ))}
      </div>

      {ganador !== null ? (
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          🏆 ¡{jugadores[ganador].nombre} gana la partida!
        </p>
      ) : (
        <form onSubmit={registrarTirada} className="marcador-input-fila">
          <span>Turno de <strong>{jugadores[turno].nombre}</strong>:</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={180}
            value={tirada}
            onChange={(e) => setTirada(e.target.value)}
            placeholder="Total (0-180)"
            autoFocus
          />
          <button type="submit" className="admin-link-btn">Registrar tirada</button>
        </form>
      )}

      {aviso && <p className="admin-msg admin-msg-error">{aviso}</p>}

      <div style={{ display: "flex", gap: ".6rem", marginTop: "1rem", flexWrap: "wrap" }}>
        <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
          Deshacer última tirada
        </button>
        <button type="button" className="admin-link-btn" onClick={() => setJugadores(null)}>
          Nueva partida
        </button>
      </div>
    </div>
  );
}

// --- Cricket -----------------------------------------------------------

const NUMEROS_CRICKET = [
  { clave: "20", etiqueta: "20", valor: 20 },
  { clave: "19", etiqueta: "19", valor: 19 },
  { clave: "18", etiqueta: "18", valor: 18 },
  { clave: "17", etiqueta: "17", valor: 17 },
  { clave: "16", etiqueta: "16", valor: 16 },
  { clave: "15", etiqueta: "15", valor: 15 },
  { clave: "B", etiqueta: "Bull", valor: 25 },
];

function marcasVacias() {
  return Object.fromEntries(NUMEROS_CRICKET.map((n) => [n.clave, 0]));
}

function simboloMarcas(n) {
  if (n <= 0) return "—";
  if (n === 1) return "／";
  if (n === 2) return "✕";
  if (n === 3) return "⊗";
  return `⊗ +${n - 3}`;
}

function MarcadorCricket() {
  const [jugadores, setJugadores] = useState(null); // [{nombre, marcas: {20:0,...}}]

  const puntos = useMemo(() => {
    if (!jugadores) return [];
    return jugadores.map((jugador, i) =>
      NUMEROS_CRICKET.reduce((total, num) => {
        const propias = jugador.marcas[num.clave];
        const extra = Math.max(0, propias - 3);
        if (extra === 0) return total;
        const algunoSinCerrar = jugadores.some((otro, j) => j !== i && otro.marcas[num.clave] < 3);
        return algunoSinCerrar ? total + extra * num.valor : total;
      }, 0)
    );
  }, [jugadores]);

  const ganador = useMemo(() => {
    if (!jugadores) return null;
    const maxPuntos = Math.max(...puntos);
    const cerrados = jugadores
      .map((j, i) => ({ i, cerrado: NUMEROS_CRICKET.every((n) => j.marcas[n.clave] >= 3) }))
      .filter((x) => x.cerrado);
    const ganadorPosible = cerrados.find((c) => puntos[c.i] >= maxPuntos);
    return ganadorPosible ? ganadorPosible.i : null;
  }, [jugadores, puntos]);

  function empezar(nombres) {
    setJugadores(nombres.map((nombre) => ({ nombre, marcas: marcasVacias() })));
  }

  function marcar(jugadorIdx, clave, delta) {
    if (ganador !== null) return;
    setJugadores((js) =>
      js.map((j, i) =>
        i === jugadorIdx
          ? { ...j, marcas: { ...j.marcas, [clave]: Math.max(0, j.marcas[clave] + delta) } }
          : j
      )
    );
  }

  if (!jugadores) return <ConfigurarJugadores onEmpezar={empezar} />;

  return (
    <div>
      <p className="chronicle-status" style={{ marginBottom: "1rem" }}>
        Toca "+" en cada casilla por cada impacto en ese número (20 al 15, y Bull). Al tercer
        impacto el número queda cerrado (⊗); si sigues acertando y algún rival todavía no lo ha
        cerrado, esos impactos extra suman puntos automáticamente.
      </p>

      <div className="marcador-tabla-scroll">
        <table className="marcador-tabla">
          <thead>
            <tr>
              <th></th>
              {jugadores.map((j, i) => (
                <th key={i} className={ganador === i ? "marcador-jugador-ganador" : ""}>{j.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NUMEROS_CRICKET.map((num) => (
              <tr key={num.clave}>
                <th scope="row">{num.etiqueta}</th>
                {jugadores.map((j, i) => (
                  <td key={i}>
                    <div className="marcador-celda">
                      <button type="button" onClick={() => marcar(i, num.clave, -1)} aria-label="Quitar impacto">−</button>
                      <span className={j.marcas[num.clave] >= 3 ? "marcador-celda-cerrada" : ""}>
                        {simboloMarcas(j.marcas[num.clave])}
                      </span>
                      <button type="button" onClick={() => marcar(i, num.clave, 1)} aria-label="Añadir impacto">+</button>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Puntos</th>
              {jugadores.map((j, i) => (
                <td key={i} style={{ textAlign: "center", fontWeight: "bold" }}>{puntos[i]}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {ganador !== null && (
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem", marginTop: "1rem" }}>
          🏆 ¡{jugadores[ganador].nombre} gana la partida! (todos los números cerrados y más puntos)
        </p>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={() => setJugadores(null)}>
        Nueva partida
      </button>
    </div>
  );
}

// --- Componente principal ----------------------------------------------

export default function Marcadores() {
  const [juego, setJuego] = useState("501");

  return (
    <div>
      <h3>Marcadores</h3>
      <p className="chronicle-status" style={{ marginBottom: ".8rem" }}>
        Para jugar en una diana sin contador electrónico. No se guarda nada al terminar la
        partida — es solo una calculadora de apoyo mientras jugáis.
      </p>

      <div className="live-tournament-toggle">
        <button type="button" className={juego === "501" ? "active" : ""} onClick={() => setJuego("501")}>501</button>
        <button type="button" className={juego === "cricket" ? "active" : ""} onClick={() => setJuego("cricket")}>Cricket</button>
      </div>

      {juego === "501" ? <Marcador501 /> : <MarcadorCricket />}
    </div>
  );
}
