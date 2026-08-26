import { useMemo, useState } from "react";
import Diana from "./Diana.jsx";
import {
  buscarCierre,
  calcularPuntosCricket,
  calcularPuntosCricketCutThroat,
  construirUnidades,
  cumpleModalidad,
  jugadorHaCerradoTodo,
  marcasDelDardo,
  marcasVacias,
  NUMEROS_CRICKET,
  tiradorActual,
} from "./dardosLogica.js";

// Marcadores manuales de 501 y Cricket, para cuando se juega en una diana
// sin contador electrónico. Sin persistencia (calculadora de apoyo, no se
// guarda nada al terminar la partida) y hasta 6 jugadores/parejas. La
// geometría de la diana y el buscador de cierres viven en dardosLogica.js
// (probados aparte con Node antes de integrarlos aquí).

const clonar = (x) => JSON.parse(JSON.stringify(x));

const ESTILO_BOTON_PRIMARIO = {
  background: "var(--blood)",
  color: "var(--bone)",
  border: "none",
  padding: ".7rem 1rem",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

function etiquetaModalidad(modalidad) {
  if (modalidad === "doble") return "Doble";
  if (modalidad === "master") return "Master (doble o triple)";
  return "Simple (cualquier dardo)";
}

// --- Selector de jugadores/parejas, compartido por 501 y Cricket ---------

function SelectorModoJugadores({ onListo }) {
  const [modo, setModo] = useState("individual");
  const [cantidadIndividual, setCantidadIndividual] = useState(2);
  const [nombresIndividual, setNombresIndividual] = useState(["Jugador 1", "Jugador 2"]);
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [equipos, setEquipos] = useState([
    { nombre: "Equipo 1", integrantes: ["Jugador 1", "Jugador 2"] },
    { nombre: "Equipo 2", integrantes: ["Jugador 3", "Jugador 4"] },
  ]);
  const [marcadorCompartido, setMarcadorCompartido] = useState(true);

  function cambiarCantidadIndividual(n) {
    setCantidadIndividual(n);
    setNombresIndividual((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) copia.push(`Jugador ${copia.length + 1}`);
      return copia;
    });
  }

  function cambiarCantidadEquipos(n) {
    setCantidadEquipos(n);
    setEquipos((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) {
        const idx = copia.length;
        copia.push({ nombre: `Equipo ${idx + 1}`, integrantes: [`Jugador ${idx * 2 + 1}`, `Jugador ${idx * 2 + 2}`] });
      }
      return copia;
    });
  }

  function continuar() {
    if (modo === "individual") {
      onListo({ modo, jugadores: nombresIndividual.map((n) => (n.trim() ? n.trim() : n)) });
    } else {
      onListo({
        modo,
        equipos: equipos.map((eq) => ({
          nombre: eq.nombre.trim() || eq.nombre,
          integrantes: eq.integrantes.map((n) => (n.trim() ? n.trim() : n)),
        })),
        marcadorCompartido,
      });
    }
  }

  return (
    <div className="admin-form" style={{ maxWidth: 460 }}>
      <label>
        Modo
        <div className="live-tournament-toggle">
          <button type="button" className={modo === "individual" ? "active" : ""} onClick={() => setModo("individual")}>
            Individual
          </button>
          <button type="button" className={modo === "parejas" ? "active" : ""} onClick={() => setModo("parejas")}>
            Parejas
          </button>
        </div>
      </label>

      {modo === "individual" ? (
        <>
          <label>
            Jugadores
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`admin-tab ${cantidadIndividual === n ? "admin-tab-active" : ""}`}
                  onClick={() => cambiarCantidadIndividual(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          {nombresIndividual.map((nombre, i) => (
            <label key={i}>
              Nombre {i + 1}
              <input
                type="text"
                value={nombre}
                maxLength={20}
                onChange={(e) => setNombresIndividual((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))}
              />
            </label>
          ))}
        </>
      ) : (
        <>
          <label>
            Parejas
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              {[2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`admin-tab ${cantidadEquipos === n ? "admin-tab-active" : ""}`}
                  onClick={() => cambiarCantidadEquipos(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          {equipos.map((eq, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", padding: ".7rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
              <label>
                Nombre del equipo
                <input
                  type="text"
                  value={eq.nombre}
                  maxLength={24}
                  onChange={(e) => setEquipos((a) => a.map((x, idx) => (idx === i ? { ...x, nombre: e.target.value } : x)))}
                />
              </label>
              {eq.integrantes.map((nombre, j) => (
                <label key={j}>
                  Integrante {j + 1}
                  <input
                    type="text"
                    value={nombre}
                    maxLength={20}
                    onChange={(e) =>
                      setEquipos((a) =>
                        a.map((x, idx) => (idx === i ? { ...x, integrantes: x.integrantes.map((n, jj) => (jj === j ? e.target.value : n)) } : x))
                      )
                    }
                  />
                </label>
              ))}
            </div>
          ))}
          <label style={{ flexDirection: "row", alignItems: "center", gap: ".5rem", textTransform: "none" }}>
            <input type="checkbox" checked={marcadorCompartido} onChange={(e) => setMarcadorCompartido(e.target.checked)} style={{ width: "auto" }} />
            Marcador compartido por pareja (si lo desmarcas, cada integrante lleva el suyo por separado)
          </label>
        </>
      )}

      <button type="button" onClick={continuar} style={ESTILO_BOTON_PRIMARIO}>
        Continuar
      </button>
    </div>
  );
}

// --- Tarjetas de jugador/pareja, compartidas por 501 y Cricket -----------

function TarjetaUnidad({ unidad, activa, esGanadora, children }) {
  return (
    <div className={`marcador-jugador ${activa ? "marcador-jugador-activo" : ""} ${esGanadora ? "marcador-jugador-ganador" : ""}`}>
      <strong>{unidad.etiqueta}</strong>
      {unidad.equipoEtiqueta && <span style={{ fontSize: ".7em", color: "var(--steel)" }}>{unidad.equipoEtiqueta}</span>}
      {unidad.integrantes.length > 1 && (
        <span style={{ fontSize: ".7em", color: "var(--steel)" }}>Tira: {tiradorActual(unidad)}</span>
      )}
      {children}
    </div>
  );
}

// --- 501 -------------------------------------------------------------

function Marcador501() {
  const [fase, setFase] = useState("jugadores"); // "jugadores" | "reglas" | "jugando"
  const [configBase, setConfigBase] = useState(null);
  const [apertura, setApertura] = useState("simple");
  const [cierre, setCierre] = useState("doble");

  const [unidades, setUnidades] = useState([]);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [tiradasVisita, setTiradasVisita] = useState([]); // [{ resultado, pos }]
  const [restanteInicioVisita, setRestanteInicioVisita] = useState(0);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);

  function empezarPartida() {
    const base = construirUnidades(configBase);
    const conEstado = base.map((u) => ({ ...u, restante: 501, abierto: apertura === "simple" }));
    setUnidades(conEstado);
    setTurnoIdx(0);
    setTiradasVisita([]);
    setRestanteInicioVisita(501);
    setGanadorIdx(null);
    setMensaje("");
    setHistorial([]);
    setFase("jugando");
  }

  function finalizarVisita(unidadesActualizadas, turnoQueTiro) {
    const conIntegranteActualizado = unidadesActualizadas.map((u, i) =>
      i === turnoQueTiro && u.integrantes.length > 1 ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length } : u
    );
    const siguienteIdx = (turnoQueTiro + 1) % conIntegranteActualizado.length;
    setUnidades(conIntegranteActualizado);
    setTurnoIdx(siguienteIdx);
    setTiradasVisita([]);
    setRestanteInicioVisita(conIntegranteActualizado[siguienteIdx].restante);
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje })]);

    const unidad = unidades[turnoIdx];
    const yaAbierto = unidad.abierto;
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;

    if (!yaAbierto && !cumpleModalidad(resultado, apertura)) {
      nuevoMensaje = `No cuenta: falta abrir a ${etiquetaModalidad(apertura).toLowerCase()}.`;
    } else {
      const abreEsteDardo = !yaAbierto;
      const nuevoRestante = unidad.restante - resultado.valor;
      if (nuevoRestante < 0 || nuevoRestante === 1) {
        bust = true;
        nuevoMensaje = `Bust: la tirada no cuenta, sigue con ${restanteInicioVisita}.`;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
      } else if (nuevoRestante === 0) {
        if (cumpleModalidad(resultado, cierre)) {
          gana = true;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
        } else {
          bust = true;
          nuevoMensaje = `Bust: llegas a 0 pero ese dardo no vale para cerrar (hace falta ${etiquetaModalidad(cierre).toLowerCase()}).`;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
        }
      } else {
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: nuevoRestante, abierto: true } : u));
      }
    }

    const nuevasTiradas = [...tiradasVisita, { resultado, pos }];
    setUnidades(nuevasUnidades);
    setTiradasVisita(nuevasTiradas);
    setMensaje(nuevoMensaje);

    if (gana) {
      setGanadorIdx(turnoIdx);
      return;
    }
    if (bust || nuevasTiradas.length >= 3) {
      finalizarVisita(nuevasUnidades, turnoIdx);
    }
  }

  function deshacer() {
    if (historial.length === 0) return;
    const previo = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setUnidades(previo.unidades);
    setTurnoIdx(previo.turnoIdx);
    setTiradasVisita(previo.tiradasVisita);
    setRestanteInicioVisita(previo.restanteInicioVisita);
    setGanadorIdx(previo.ganadorIdx);
    setMensaje(previo.mensaje);
  }

  const unidadActual = fase === "jugando" ? unidades[turnoIdx] : null;
  const sugerencia = useMemo(() => {
    if (!unidadActual || ganadorIdx !== null || !unidadActual.abierto) return null;
    const dardosDisponibles = 3 - tiradasVisita.length;
    if (dardosDisponibles <= 0) return null;
    return buscarCierre(unidadActual.restante, dardosDisponibles, cierre);
  }, [unidadActual, tiradasVisita.length, cierre, ganadorIdx]);

  if (fase === "jugadores") {
    return <SelectorModoJugadores onListo={(c) => { setConfigBase(c); setFase("reglas"); }} />;
  }

  if (fase === "reglas") {
    return (
      <div className="admin-form" style={{ maxWidth: 420 }}>
        <label>
          Apertura
          <div className="live-tournament-toggle">
            {["simple", "doble", "master"].map((op) => (
              <button key={op} type="button" className={apertura === op ? "active" : ""} onClick={() => setApertura(op)}>
                {etiquetaModalidad(op)}
              </button>
            ))}
          </div>
        </label>
        <label>
          Cierre
          <div className="live-tournament-toggle">
            {["simple", "doble", "master"].map((op) => (
              <button key={op} type="button" className={cierre === op ? "active" : ""} onClick={() => setCierre(op)}>
                {etiquetaModalidad(op)}
              </button>
            ))}
          </div>
        </label>
        <button type="button" onClick={empezarPartida} style={ESTILO_BOTON_PRIMARIO}>
          Empezar partida
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="marcador-jugadores">
        {unidades.map((u, i) => (
          <TarjetaUnidad key={u.id} unidad={u} activa={turnoIdx === i && ganadorIdx === null} esGanadora={ganadorIdx === i}>
            <span className="marcador-restante">{u.restante}</span>
            {!u.abierto && apertura !== "simple" && (
              <span style={{ fontSize: ".65em", color: "var(--ember)" }}>Sin abrir ({etiquetaModalidad(apertura)})</span>
            )}
          </TarjetaUnidad>
        ))}
      </div>

      {ganadorIdx !== null ? (
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          🏆 ¡{unidades[ganadorIdx].etiqueta} gana la partida!
        </p>
      ) : (
        <>
          <p>
            Turno de <strong>{tiradorActual(unidades[turnoIdx])}</strong> — dardo {tiradasVisita.length + 1} de 3
          </p>
          <Diana onTirada={tirar} marcas={tiradasVisita.map((t) => t.pos)} />
          <p className="marcador-tiradas-visita">
            Esta visita: {tiradasVisita.length ? tiradasVisita.map((t) => t.resultado.etiqueta).join(", ") : "—"}
          </p>
          {sugerencia && <p className="admin-msg admin-msg-ok">Sugerencia de cierre: {sugerencia.join(" → ")}</p>}
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
            <button type="button" className="admin-link-btn" onClick={() => finalizarVisita(unidades, turnoIdx)}>
              Terminar turno ahora
            </button>
            <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
              Deshacer último dardo
            </button>
          </div>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={() => setFase("jugadores")}>
        Nueva partida
      </button>
    </div>
  );
}

// --- Cricket -----------------------------------------------------------

function simboloMarcas(n) {
  if (n <= 0) return "—";
  if (n === 1) return "／";
  if (n === 2) return "✕";
  if (n === 3) return "⊗";
  return `⊗ +${n - 3}`;
}

function MarcadorCricket() {
  const [fase, setFase] = useState("jugadores");
  const [configBase, setConfigBase] = useState(null);
  const [modoCricket, setModoCricket] = useState("normal"); // "normal" | "cutthroat"

  const [unidades, setUnidades] = useState([]);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);

  const puntos = useMemo(
    () => (modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(unidades) : calcularPuntosCricket(unidades)),
    [unidades, modoCricket]
  );

  function empezarPartida() {
    const base = construirUnidades(configBase);
    const conEstado = base.map((u) => ({ ...u, marcas: marcasVacias() }));
    setUnidades(conEstado);
    setTurnoIdx(0);
    setTiradasVisita([]);
    setGanadorIdx(null);
    setMensaje("");
    setHistorial([]);
    setFase("jugando");
  }

  function finalizarVisita(unidadesActualizadas, turnoQueTiro) {
    const conIntegranteActualizado = unidadesActualizadas.map((u, i) =>
      i === turnoQueTiro && u.integrantes.length > 1 ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length } : u
    );
    const siguienteIdx = (turnoQueTiro + 1) % conIntegranteActualizado.length;
    setUnidades(conIntegranteActualizado);
    setTurnoIdx(siguienteIdx);
    setTiradasVisita([]);
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, ganadorIdx, mensaje })]);

    const info = marcasDelDardo(resultado);
    let nuevasUnidades = unidades;
    let nuevoMensaje = "";
    if (info) {
      nuevasUnidades = unidades.map((u, i) =>
        i === turnoIdx ? { ...u, marcas: { ...u.marcas, [info.clave]: u.marcas[info.clave] + info.marcas } } : u
      );
    } else {
      nuevoMensaje = resultado.etiqueta === "Fuera" ? "Fuera de la diana, no cuenta." : `${resultado.etiqueta}: no juega en cricket, sin efecto.`;
    }

    const nuevasTiradas = [...tiradasVisita, { resultado, pos }];
    setUnidades(nuevasUnidades);
    setTiradasVisita(nuevasTiradas);
    setMensaje(nuevoMensaje);

    const puntosNuevos = modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(nuevasUnidades) : calcularPuntosCricket(nuevasUnidades);
    const unidadQueTiro = nuevasUnidades[turnoIdx];
    if (jugadorHaCerradoTodo(unidadQueTiro)) {
      const mejor = modoCricket === "cutthroat" ? Math.min(...puntosNuevos) : Math.max(...puntosNuevos);
      const cumpleCondicion = modoCricket === "cutthroat" ? puntosNuevos[turnoIdx] <= mejor : puntosNuevos[turnoIdx] >= mejor;
      if (cumpleCondicion) {
        setGanadorIdx(turnoIdx);
        return;
      }
    }

    if (nuevasTiradas.length >= 3) {
      finalizarVisita(nuevasUnidades, turnoIdx);
    }
  }

  function deshacer() {
    if (historial.length === 0) return;
    const previo = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setUnidades(previo.unidades);
    setTurnoIdx(previo.turnoIdx);
    setTiradasVisita(previo.tiradasVisita);
    setGanadorIdx(previo.ganadorIdx);
    setMensaje(previo.mensaje);
  }

  if (fase === "jugadores") {
    return <SelectorModoJugadores onListo={(c) => { setConfigBase(c); setFase("reglas"); }} />;
  }

  if (fase === "reglas") {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <label>
          Modalidad
          <div className="live-tournament-toggle">
            <button type="button" className={modoCricket === "normal" ? "active" : ""} onClick={() => setModoCricket("normal")}>
              Normal
            </button>
            <button type="button" className={modoCricket === "cutthroat" ? "active" : ""} onClick={() => setModoCricket("cutthroat")}>
              Cut-throat
            </button>
          </div>
        </label>
        <p className="chronicle-status">
          {modoCricket === "cutthroat"
            ? "Cut-throat: los impactos de más en un número que ya tienes cerrado suman puntos a los rivales que aún no lo tengan cerrado (no a ti). Gana quien cierra todo con la puntuación MÁS BAJA."
            : "Normal: los impactos de más en un número que ya tienes cerrado te suman puntos a ti, mientras algún rival no lo tenga cerrado todavía. Gana quien cierra todo con la puntuación más alta."}
        </p>
        <button type="button" onClick={empezarPartida} style={ESTILO_BOTON_PRIMARIO}>
          Empezar partida
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="marcador-tabla-scroll">
        <table className="marcador-tabla">
          <thead>
            <tr>
              <th></th>
              {unidades.map((u, i) => (
                <th key={u.id} className={ganadorIdx === i ? "marcador-jugador-ganador" : ""}>
                  {u.etiqueta}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NUMEROS_CRICKET.map((num) => (
              <tr key={num.clave}>
                <th scope="row">{num.etiqueta}</th>
                {unidades.map((u, i) => (
                  <td key={u.id} className={u.marcas[num.clave] >= 3 ? "marcador-celda-cerrada" : ""}>
                    {simboloMarcas(u.marcas[num.clave])}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Puntos</th>
              {unidades.map((u, i) => (
                <td key={u.id} style={{ fontWeight: "bold" }}>
                  {puntos[i]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {ganadorIdx !== null ? (
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem", marginTop: "1rem" }}>
          🏆 ¡{unidades[ganadorIdx].etiqueta} gana la partida!
          {modoCricket === "cutthroat" ? " (cut-throat: todo cerrado con la puntuación más baja)" : " (todo cerrado con la puntuación más alta)"}
        </p>
      ) : (
        <>
          <p style={{ marginTop: "1rem" }}>
            Turno de <strong>{tiradorActual(unidades[turnoIdx])}</strong> — dardo {tiradasVisita.length + 1} de 3
          </p>
          <Diana onTirada={tirar} marcas={tiradasVisita.map((t) => t.pos)} />
          <p className="marcador-tiradas-visita">
            Esta visita: {tiradasVisita.length ? tiradasVisita.map((t) => t.resultado.etiqueta).join(", ") : "—"}
          </p>
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
            <button type="button" className="admin-link-btn" onClick={() => finalizarVisita(unidades, turnoIdx)}>
              Terminar turno ahora
            </button>
            <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
              Deshacer último dardo
            </button>
          </div>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={() => setFase("jugadores")}>
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
        partida — es solo una calculadora de apoyo mientras jugáis. Toca la diana en el punto
        exacto donde ha caído cada dardo.
      </p>

      <div className="live-tournament-toggle">
        <button type="button" className={juego === "501" ? "active" : ""} onClick={() => setJuego("501")}>
          501
        </button>
        <button type="button" className={juego === "cricket" ? "active" : ""} onClick={() => setJuego("cricket")}>
          Cricket
        </button>
      </div>

      {juego === "501" ? <Marcador501 key="501" /> : <MarcadorCricket key="cricket" />}
    </div>
  );
}
