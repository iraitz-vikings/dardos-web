import { useMemo, useState } from "react";
import { useLang } from "./i18n.jsx";
import Diana from "./Diana.jsx";
import TecladoNumeros from "./TecladoNumeros.jsx";
import TecladoPuntuacion from "./TecladoPuntuacion.jsx";
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

// Modos de entrada de dardos, compartidos por 501 y Cricket. "total" (escribir
// de una vez la puntuación de la visita) solo tiene sentido en 501: en
// Cricket hace falta saber exactamente qué número y con qué multiplicador se
// ha marcado, algo que un total no permite deducir.
function SelectorModoEntrada({ modo, onCambiar, permitirTotal }) {
  const { t } = useLang();
  return (
    <div className="live-tournament-toggle">
      <button type="button" className={modo === "diana" ? "active" : ""} onClick={() => onCambiar("diana")}>
        {t("marcador.diana")}
      </button>
      <button type="button" className={modo === "numeros" ? "active" : ""} onClick={() => onCambiar("numeros")}>
        {t("marcador.numeros")}
      </button>
      {permitirTotal && (
        <button type="button" className={modo === "total" ? "active" : ""} onClick={() => onCambiar("total")}>
          {t("marcador.puntuacionTotal")}
        </button>
      )}
    </div>
  );
}

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

function etiquetaModalidad(modalidad, t) {
  if (modalidad === "doble") return t("marcador.doble");
  if (modalidad === "master") return t("marcador.master");
  return t("marcador.simple");
}

// Traduce a texto visible las etiquetas fijas que puede llevar un resultado
// de dardo (ver dardosLogica.js): la mayoría de etiquetas ("T20", "D16",
// "25"...) son códigos numéricos que no dependen del idioma, así que solo
// hace falta traducir "Fuera" (fallo/fuera de la diana).
function etiquetaTiradaMostrar(etiqueta, t) {
  if (etiqueta === "Fuera") return t("marcador.fuera");
  return etiqueta;
}

// --- Selector de jugadores/parejas, compartido por 501 y Cricket ---------

function SelectorModoJugadores({ onListo }) {
  const { t } = useLang();
  const [modo, setModo] = useState("individual");
  const [cantidadIndividual, setCantidadIndividual] = useState(2);
  const [nombresIndividual, setNombresIndividual] = useState([`${t("marcador.jugadorDefault")} 1`, `${t("marcador.jugadorDefault")} 2`]);
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [equipos, setEquipos] = useState([
    { nombre: `${t("marcador.equipoDefault")} 1`, integrantes: [`${t("marcador.jugadorDefault")} 1`, `${t("marcador.jugadorDefault")} 2`] },
    { nombre: `${t("marcador.equipoDefault")} 2`, integrantes: [`${t("marcador.jugadorDefault")} 3`, `${t("marcador.jugadorDefault")} 4`] },
  ]);
  const [marcadorCompartido, setMarcadorCompartido] = useState(true);

  function cambiarCantidadIndividual(n) {
    setCantidadIndividual(n);
    setNombresIndividual((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) copia.push(`${t("marcador.jugadorDefault")} ${copia.length + 1}`);
      return copia;
    });
  }

  function cambiarCantidadEquipos(n) {
    setCantidadEquipos(n);
    setEquipos((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) {
        const idx = copia.length;
        copia.push({ nombre: `${t("marcador.equipoDefault")} ${idx + 1}`, integrantes: [`${t("marcador.jugadorDefault")} ${idx * 2 + 1}`, `${t("marcador.jugadorDefault")} ${idx * 2 + 2}`] });
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
        {t("marcador.modo")}
        <div className="live-tournament-toggle">
          <button type="button" className={modo === "individual" ? "active" : ""} onClick={() => setModo("individual")}>
            {t("marcador.individual")}
          </button>
          <button type="button" className={modo === "parejas" ? "active" : ""} onClick={() => setModo("parejas")}>
            {t("marcador.parejas")}
          </button>
        </div>
      </label>

      {modo === "individual" ? (
        <>
          <label>
            {t("marcador.jugadores")}
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
              {t("marcador.nombreN").replace("{n}", i + 1)}
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
            {t("marcador.parejas")}
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
                {t("marcador.nombreEquipo")}
                <input
                  type="text"
                  value={eq.nombre}
                  maxLength={24}
                  onChange={(e) => setEquipos((a) => a.map((x, idx) => (idx === i ? { ...x, nombre: e.target.value } : x)))}
                />
              </label>
              {eq.integrantes.map((nombre, j) => (
                <label key={j}>
                  {t("marcador.integranteN").replace("{n}", j + 1)}
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
            {t("marcador.marcadorCompartido")}
          </label>
        </>
      )}

      <button type="button" onClick={continuar} style={ESTILO_BOTON_PRIMARIO}>
        {t("marcador.continuar")}
      </button>
    </div>
  );
}

// --- Tarjetas de jugador/pareja, compartidas por 501 y Cricket -----------

function TarjetaUnidad({ unidad, activa, esGanadora, children }) {
  const { t } = useLang();
  return (
    <div className={`marcador-jugador ${activa ? "marcador-jugador-activo" : ""} ${esGanadora ? "marcador-jugador-ganador" : ""}`}>
      <strong>{unidad.etiqueta}</strong>
      {unidad.equipoEtiqueta && <span style={{ fontSize: ".7em", color: "var(--steel)" }}>{unidad.equipoEtiqueta}</span>}
      {unidad.integrantes.length > 1 && (
        <span style={{ fontSize: ".7em", color: "var(--steel)" }}>{t("marcador.tira")} {tiradorActual(unidad)}</span>
      )}
      {children}
    </div>
  );
}

// --- 501 -------------------------------------------------------------

function Marcador501() {
  const { t } = useLang();
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
  const [modoEntrada, setModoEntrada] = useState("diana"); // "diana" | "numeros" | "total"
  // true cuando la visita ya ha terminado (3 dardos o bust) pero todavía no
  // se ha pulsado "Terminar turno ahora" — a petición de Iraitz, el turno ya
  // NO pasa solo automáticamente al tercer dardo, para dar tiempo a leer el
  // resultado antes de pasar al siguiente jugador.
  const [finVisita, setFinVisita] = useState(false);

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
    setFinVisita(false);
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
    setMensaje("");
    setFinVisita(false);
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null || finVisita) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita })]);

    const unidad = unidades[turnoIdx];
    const yaAbierto = unidad.abierto;
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;

    if (!yaAbierto && !cumpleModalidad(resultado, apertura)) {
      nuevoMensaje = t("marcador.noCuentaAbrir").replace("{modalidad}", etiquetaModalidad(apertura, t).toLowerCase());
    } else {
      const abreEsteDardo = !yaAbierto;
      const nuevoRestante = unidad.restante - resultado.valor;
      if (nuevoRestante < 0 || nuevoRestante === 1) {
        bust = true;
        nuevoMensaje = t("marcador.bustSigueCon").replace("{restante}", restanteInicioVisita);
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
      } else if (nuevoRestante === 0) {
        if (cumpleModalidad(resultado, cierre)) {
          gana = true;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
        } else {
          bust = true;
          nuevoMensaje = t("marcador.bustCierreInvalido").replace("{modalidad}", etiquetaModalidad(cierre, t).toLowerCase());
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
      setFinVisita(true);
    }
  }

  // Modo "puntuación total": en vez de marcar dardo a dardo, se escribe de
  // una vez el total conseguido en la visita (ver TecladoPuntuacion.jsx). No
  // hay forma de deducir del total solo si el dardo de apertura cumplía la
  // modalidad exigida, así que este modo se desactiva en pantalla mientras
  // la unidad no esté abierta y la apertura no sea simple (hay que abrir con
  // la diana o el teclado de números). Para el cierre si pasa lo mismo, pero
  // ahí se resuelve con la casilla "cierreValido" que rellena el propio
  // jugador en TecladoPuntuacion.
  function tirarVisitaTotal(valorTotal, { cierreValido }) {
    if (ganadorIdx !== null || finVisita) return;
    if (!Number.isFinite(valorTotal) || valorTotal < 0 || valorTotal > 180) {
      setMensaje(t("marcador.visitaFueraRango"));
      return;
    }

    const unidad = unidades[turnoIdx];
    if (!unidad.abierto && apertura !== "simple") {
      setMensaje(
        t("marcador.noSePuedeAbrirModo").replace("{modalidad}", etiquetaModalidad(apertura, t).toLowerCase())
      );
      return;
    }

    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita })]);

    const resultado = { etiqueta: `${valorTotal} ${t("marcador.visitaSufijo")}`, numero: null, multiplicador: null, valor: valorTotal, esDoble: false, esTriple: false, esBull: false };
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;
    const cierreOk = cierre === "simple" || cierreValido;

    const nuevoRestante = unidad.restante - valorTotal;
    if (nuevoRestante < 0 || nuevoRestante === 1) {
      bust = true;
      nuevoMensaje = t("marcador.bustVisitaSigueCon").replace("{restante}", restanteInicioVisita);
      nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: true } : u));
    } else if (nuevoRestante === 0) {
      if (cierreOk) {
        gana = true;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
      } else {
        bust = true;
        nuevoMensaje = t("marcador.bustCierreCasilla").replace("{modalidad}", etiquetaModalidad(cierre, t).toLowerCase());
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: true } : u));
      }
    } else {
      nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: nuevoRestante, abierto: true } : u));
    }

    setUnidades(nuevasUnidades);
    setTiradasVisita([{ resultado, pos: undefined }]);
    setMensaje(nuevoMensaje);

    if (gana) {
      setGanadorIdx(turnoIdx);
      return;
    }
    // Aquí no hay "3 dardos" que contar: al escribir el total ya se ha
    // introducido la visita entera de una vez, así que pasa a fin de turno
    // directamente (salvo que ya se haya ganado, tratado arriba).
    setFinVisita(true);
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
    setFinVisita(previo.finVisita);
  }

  const unidadActual = fase === "jugando" ? unidades[turnoIdx] : null;
  const sugerencia = useMemo(() => {
    if (!unidadActual || ganadorIdx !== null || finVisita || !unidadActual.abierto) return null;
    const dardosDisponibles = 3 - tiradasVisita.length;
    if (dardosDisponibles <= 0) return null;
    return buscarCierre(unidadActual.restante, dardosDisponibles, cierre);
  }, [unidadActual, tiradasVisita.length, cierre, ganadorIdx, finVisita]);

  if (fase === "jugadores") {
    return <SelectorModoJugadores onListo={(c) => { setConfigBase(c); setFase("reglas"); }} />;
  }

  if (fase === "reglas") {
    return (
      <div className="admin-form" style={{ maxWidth: 420 }}>
        <label>
          {t("marcador.apertura")}
          <div className="live-tournament-toggle">
            {["simple", "doble", "master"].map((op) => (
              <button key={op} type="button" className={apertura === op ? "active" : ""} onClick={() => setApertura(op)}>
                {etiquetaModalidad(op, t)}
              </button>
            ))}
          </div>
        </label>
        <label>
          {t("marcador.cierre")}
          <div className="live-tournament-toggle">
            {["simple", "doble", "master"].map((op) => (
              <button key={op} type="button" className={cierre === op ? "active" : ""} onClick={() => setCierre(op)}>
                {etiquetaModalidad(op, t)}
              </button>
            ))}
          </div>
        </label>
        <button type="button" onClick={empezarPartida} style={ESTILO_BOTON_PRIMARIO}>
          {t("marcador.empezarPartida")}
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
              <span style={{ fontSize: ".65em", color: "var(--ember)" }}>{t("marcador.sinAbrir").replace("{modalidad}", etiquetaModalidad(apertura, t))}</span>
            )}
          </TarjetaUnidad>
        ))}
      </div>

      {ganadorIdx !== null ? (
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          {t("marcador.ganaLaPartida").replace("{etiqueta}", unidades[ganadorIdx].etiqueta)}
        </p>
      ) : (
        <>
          <p>
            {t("marcador.turnoDe")} <strong>{tiradorActual(unidades[turnoIdx])}</strong>{" "}
            {modoEntrada === "total" ? t("marcador.introduceTotal") : t("marcador.dardoDeTres").replace("{n}", Math.min(tiradasVisita.length + 1, 3))}
          </p>
          <SelectorModoEntrada modo={modoEntrada} onCambiar={setModoEntrada} permitirTotal />
          {modoEntrada === "diana" && <Diana onTirada={tirar} marcas={tiradasVisita.map((tv) => tv.pos).filter(Boolean)} deshabilitada={finVisita} />}
          {modoEntrada === "numeros" && <TecladoNumeros onTirada={tirar} deshabilitada={finVisita} />}
          {modoEntrada === "total" && <TecladoPuntuacion cierre={cierre} onEnviar={tirarVisitaTotal} deshabilitada={finVisita} />}
          <p className="marcador-tiradas-visita">
            {t("marcador.estaVisita")} {tiradasVisita.length ? tiradasVisita.map((tv) => etiquetaTiradaMostrar(tv.resultado.etiqueta, t)).join(", ") : "—"}
          </p>
          {sugerencia && <p className="admin-msg admin-msg-ok">{t("marcador.sugerenciaCierre")} {sugerencia.join(" → ")}</p>}
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
            <button
              type="button"
              className={finVisita ? "admin-link-btn marcador-boton-destacado" : "admin-link-btn"}
              onClick={() => finalizarVisita(unidades, turnoIdx)}
            >
              {finVisita ? t("marcador.siguienteJugador") : t("marcador.terminarTurno")}
            </button>
            <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
              {t("marcador.deshacerDardo")}
            </button>
          </div>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={() => setFase("jugadores")}>
        {t("marcador.nuevaPartida")}
      </button>
    </div>
  );
}

// --- Cricket -----------------------------------------------------------

function simboloMarcas(n) {
  if (n <= 0) return "—";
  if (n === 1) return "／";
  if (n === 2) return "✕";
  // A partir de 3 queda cerrado (⊗); los impactos de más ya se reflejan en
  // la puntuación (tarjetas de arriba), así que aquí no hace falta repetir
  // el "+N" — Iraitz lo pidió quitar por redundante tras probarlo.
  return "⊗";
}

function MarcadorCricket() {
  const { t } = useLang();
  const [fase, setFase] = useState("jugadores");
  const [configBase, setConfigBase] = useState(null);
  const [modoCricket, setModoCricket] = useState("normal"); // "normal" | "cutthroat"

  const [unidades, setUnidades] = useState([]);
  const [turnoIdx, setTurnoIdx] = useState(0);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  // true cuando ya se han tirado los 3 dardos de la visita pero todavía no
  // se ha pulsado "Terminar turno ahora" — el turno no pasa solo.
  const [finVisita, setFinVisita] = useState(false);
  const [modoEntrada, setModoEntrada] = useState("diana"); // "diana" | "numeros" (sin "total": en cricket hace falta saber el número exacto)

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
    setFinVisita(false);
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
    setMensaje("");
    setFinVisita(false);
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null || finVisita) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, ganadorIdx, mensaje, finVisita })]);

    const info = marcasDelDardo(resultado);
    let nuevasUnidades = unidades;
    let nuevoMensaje = "";
    if (info) {
      nuevasUnidades = unidades.map((u, i) =>
        i === turnoIdx ? { ...u, marcas: { ...u.marcas, [info.clave]: u.marcas[info.clave] + info.marcas } } : u
      );
    } else {
      nuevoMensaje = resultado.etiqueta === "Fuera" ? t("marcador.fueraNoCuenta") : t("marcador.noJuegaCricket").replace("{etiqueta}", resultado.etiqueta);
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
      setFinVisita(true);
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
    setFinVisita(previo.finVisita);
  }

  if (fase === "jugadores") {
    return <SelectorModoJugadores onListo={(c) => { setConfigBase(c); setFase("reglas"); }} />;
  }

  if (fase === "reglas") {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <label>
          {t("marcador.modalidad")}
          <div className="live-tournament-toggle">
            <button type="button" className={modoCricket === "normal" ? "active" : ""} onClick={() => setModoCricket("normal")}>
              {t("marcador.normal")}
            </button>
            <button type="button" className={modoCricket === "cutthroat" ? "active" : ""} onClick={() => setModoCricket("cutthroat")}>
              Cut-throat
            </button>
          </div>
        </label>
        <p className="chronicle-status">
          {modoCricket === "cutthroat"
            ? t("marcador.cutthroatExplicacion")
            : t("marcador.normalExplicacion")}
        </p>
        <button type="button" onClick={empezarPartida} style={ESTILO_BOTON_PRIMARIO}>
          {t("marcador.empezarPartida")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="marcador-jugadores">
        {unidades.map((u, i) => (
          <TarjetaUnidad key={u.id} unidad={u} activa={turnoIdx === i && ganadorIdx === null} esGanadora={ganadorIdx === i}>
            <span className="marcador-restante">{puntos[i]}</span>
          </TarjetaUnidad>
        ))}
      </div>

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
          </tbody>
        </table>
      </div>

      {ganadorIdx !== null ? (
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem", marginTop: "1rem" }}>
          {t("marcador.ganaLaPartida").replace("{etiqueta}", unidades[ganadorIdx].etiqueta)}
          {" "}
          {modoCricket === "cutthroat" ? t("marcador.cutthroatSufijo") : t("marcador.normalSufijo")}
        </p>
      ) : (
        <>
          <p style={{ marginTop: "1rem" }}>
            {t("marcador.turnoDe")} <strong>{tiradorActual(unidades[turnoIdx])}</strong> {t("marcador.dardoDeTres").replace("{n}", Math.min(tiradasVisita.length + 1, 3))}
          </p>
          <SelectorModoEntrada modo={modoEntrada} onCambiar={setModoEntrada} permitirTotal={false} />
          {modoEntrada === "diana" ? (
            <Diana onTirada={tirar} marcas={tiradasVisita.map((tv) => tv.pos).filter(Boolean)} deshabilitada={finVisita} />
          ) : (
            <TecladoNumeros onTirada={tirar} deshabilitada={finVisita} />
          )}
          <p className="marcador-tiradas-visita">
            {t("marcador.estaVisita")} {tiradasVisita.length ? tiradasVisita.map((tv) => etiquetaTiradaMostrar(tv.resultado.etiqueta, t)).join(", ") : "—"}
          </p>
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
            <button
              type="button"
              className={finVisita ? "admin-link-btn marcador-boton-destacado" : "admin-link-btn"}
              onClick={() => finalizarVisita(unidades, turnoIdx)}
            >
              {finVisita ? t("marcador.siguienteJugador") : t("marcador.terminarTurno")}
            </button>
            <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
              {t("marcador.deshacerDardo")}
            </button>
          </div>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={() => setFase("jugadores")}>
        {t("marcador.nuevaPartida")}
      </button>
    </div>
  );
}

// --- Componente principal ----------------------------------------------

export default function Marcadores() {
  const { t } = useLang();
  const [juego, setJuego] = useState("501");

  return (
    <div>
      <h3>{t("marcador.titulo")}</h3>
      <p className="chronicle-status" style={{ marginBottom: ".8rem" }}>
        {t("marcador.intro")}
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
