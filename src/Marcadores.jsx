import { useEffect, useMemo, useState } from "react";
import { useLang } from "./i18n.jsx";
import Diana from "./Diana.jsx";
import TecladoNumeros from "./TecladoNumeros.jsx";
import TecladoPuntuacion from "./TecladoPuntuacion.jsx";
import { CabeceraPartida, CuadroJugador, fmtProm, fmtPct } from "./CuadroJugador.jsx";
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
  promedio3Dardos,
  sumarEstadisticas501,
  sumarEstadisticasCricket,
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

// --- Selector de "al mejor de", compartido por 501 y Cricket --------------

const OPCIONES_AL_MEJOR_DE = [1, 3, 5, 7, 9];

function SelectorAlMejorDe({ valor, onCambiar }) {
  return (
    <label>
      Al mejor de
      <div className="live-tournament-toggle">
        {OPCIONES_AL_MEJOR_DE.map((n) => (
          <button key={n} type="button" className={valor === n ? "active" : ""} onClick={() => onCambiar(n)}>
            {n}
          </button>
        ))}
      </div>
    </label>
  );
}

// --- 501 -------------------------------------------------------------

// Un leg de 501, sin guardar nada (todo en memoria): misma mecánica que
// JuegoHerramienta.jsx (turno, sugerencia de cierre, pregunta de "¿cuántos
// dardos al doble?" para el % de cierre), pero las estadísticas se guardan
// por unidad.id en vez de por jugadorId (aquí no hay ficha de jugador real
// detrás) y, al no haber "partido" que guardar en el backend, en modo
// "puntuación total" se espera igual a "Terminar turno" en vez de avanzar
// solo (así los 3 modos de entrada se comportan igual en esta calculadora).
function LegLocal501({ unidadesBase, legs, legsGanados, apertura, cierre, alMejorDe, onLegTerminado, onSalir }) {
  const { t } = useLang();
  const numeroLeg = legs.length + 1;
  const [unidades, setUnidades] = useState(() => unidadesBase.map((u) => ({ ...u, restante: 501, abierto: apertura === "simple" })));
  const [turnoIdx, setTurnoIdx] = useState((numeroLeg - 1) % unidadesBase.length);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [restanteInicioVisita, setRestanteInicioVisita] = useState(501);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [modoEntrada, setModoEntrada] = useState("diana");
  const [finVisita, setFinVisita] = useState(false);
  const [estadisticas, setEstadisticas] = useState({});
  const [ultimaVisitaUnidad, setUltimaVisitaUnidad] = useState(() => unidadesBase.map(() => null));
  const [preguntaDoble, setPreguntaDoble] = useState(null);

  function registrarVisita(unidadId, dardos, puntos, esCheckout, dardosAlDoble) {
    setEstadisticas((prev) => {
      const actual = prev[unidadId] || { dardos: 0, puntos: 0, visitas100: 0, visitas140: 0, visitas180: 0, intentosCierre: 0, cierresConvertidos: 0 };
      const actualizado = {
        ...actual,
        dardos: actual.dardos + dardos,
        puntos: actual.puntos + puntos,
        visitas100: actual.visitas100 + (puntos >= 100 && puntos < 140 ? 1 : 0),
        visitas140: actual.visitas140 + (puntos >= 140 && puntos < 180 ? 1 : 0),
        visitas180: actual.visitas180 + (puntos >= 180 ? 1 : 0),
        intentosCierre: actual.intentosCierre + (dardosAlDoble || 0),
        cierresConvertidos: actual.cierresConvertidos + (esCheckout && dardosAlDoble > 0 ? 1 : 0),
      };
      if (esCheckout) actualizado.checkout = puntos;
      return { ...prev, [unidadId]: actualizado };
    });
  }

  function concluirVisita(unidadId, ladoIdx, puntosVisita, dardosCount, gana, dardosAlDoble) {
    registrarVisita(unidadId, dardosCount, puntosVisita, gana, dardosAlDoble);
    setUltimaVisitaUnidad((prev) => prev.map((v, i) => (i === ladoIdx ? puntosVisita : v)));
    if (gana) {
      setGanadorIdx(ladoIdx);
    } else {
      setFinVisita(true);
    }
  }

  function responderDardosDoble(dardosAlDoble) {
    const p = preguntaDoble;
    if (!p) return;
    setPreguntaDoble(null);
    concluirVisita(p.unidadId, p.turnoIdx, p.puntosVisita, p.dardosCount, p.gana, dardosAlDoble);
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
    if (ganadorIdx !== null || finVisita || preguntaDoble) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaUnidad })]);

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

    const unidadId = unidad.id;
    // Si al empezar esta visita el resto ya se podía cerrar en 3 dardos con
    // la modalidad de cierre elegida (y la unidad ya estaba abierta), al
    // acabar la visita se pregunta cuántos dardos se han tirado al
    // doble/máster (ver preguntaDoble) para el % de cierre real.
    const intentoPosible = unidad.abierto && !!buscarCierre(restanteInicioVisita, 3, cierre);

    if (gana) {
      const puntosVisita = nuevasTiradas.reduce((s, tv) => s + tv.resultado.valor, 0);
      if (intentoPosible) {
        setPreguntaDoble({ unidadId, turnoIdx, puntosVisita, dardosCount: nuevasTiradas.length, gana: true });
      } else {
        concluirVisita(unidadId, turnoIdx, puntosVisita, nuevasTiradas.length, true, 0);
      }
      return;
    }
    if (bust) {
      if (intentoPosible) {
        setPreguntaDoble({ unidadId, turnoIdx, puntosVisita: 0, dardosCount: nuevasTiradas.length, gana: false });
      } else {
        concluirVisita(unidadId, turnoIdx, 0, nuevasTiradas.length, false, 0);
      }
      return;
    }
    if (nuevasTiradas.length >= 3) {
      const puntosVisita = nuevasTiradas.reduce((s, tv) => s + tv.resultado.valor, 0);
      if (intentoPosible) {
        setPreguntaDoble({ unidadId, turnoIdx, puntosVisita, dardosCount: 3, gana: false });
      } else {
        concluirVisita(unidadId, turnoIdx, puntosVisita, 3, false, 0);
      }
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
    if (ganadorIdx !== null || finVisita || preguntaDoble) return;
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

    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaUnidad })]);

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

    const unidadId = unidad.id;
    const intentoPosible = unidad.abierto && !!buscarCierre(restanteInicioVisita, 3, cierre);
    const puntosVisita = bust ? 0 : valorTotal;

    if (gana) {
      if (intentoPosible) {
        setPreguntaDoble({ unidadId, turnoIdx, puntosVisita, dardosCount: 3, gana: true });
      } else {
        concluirVisita(unidadId, turnoIdx, puntosVisita, 3, true, 0);
      }
      return;
    }
    // Aquí no hay "3 dardos" que contar: al escribir el total ya se ha
    // introducido la visita entera de una vez, así que pasa a fin de turno
    // directamente (salvo que ya se haya ganado, tratado arriba).
    if (intentoPosible) {
      setPreguntaDoble({ unidadId, turnoIdx, puntosVisita, dardosCount: 3, gana: false });
    } else {
      concluirVisita(unidadId, turnoIdx, puntosVisita, 3, false, 0);
    }
  }

  function deshacer() {
    if (historial.length === 0 || preguntaDoble) return;
    const previo = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setUnidades(previo.unidades);
    setTurnoIdx(previo.turnoIdx);
    setTiradasVisita(previo.tiradasVisita);
    setRestanteInicioVisita(previo.restanteInicioVisita);
    setGanadorIdx(previo.ganadorIdx);
    setMensaje(previo.mensaje);
    setFinVisita(previo.finVisita);
    setEstadisticas(previo.estadisticas);
    setUltimaVisitaUnidad(previo.ultimaVisitaUnidad);
  }

  const unidadActual = unidades[turnoIdx];
  const sugerencia = useMemo(() => {
    if (!unidadActual || ganadorIdx !== null || finVisita || preguntaDoble || !unidadActual.abierto) return null;
    const dardosDisponibles = 3 - tiradasVisita.length;
    if (dardosDisponibles <= 0) return null;
    return buscarCierre(unidadActual.restante, dardosDisponibles, cierre);
  }, [unidadActual, tiradasVisita.length, cierre, ganadorIdx, finVisita, preguntaDoble]);

  // En cuanto hay ganador de leg, se avisa al padre (PartidaLocal501) con
  // las estadísticas ya completas de este leg, para que decida si hace
  // falta otro leg o si el partido ya está resuelto.
  useEffect(() => {
    if (ganadorIdx !== null) onLegTerminado(ganadorIdx, estadisticas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx]);

  return (
    <div>
      <CabeceraPartida alMejorDe={alMejorDe} numeroLeg={numeroLeg} />
      <div className="marcador-jugadores">
        {unidades.map((u, i) => {
          const legActual = sumarEstadisticas501(estadisticas[u.id]);
          const partidoTotal = sumarEstadisticas501(estadisticas[u.id], ...legs.map((l) => l.estadisticas[u.id]));
          const activo = turnoIdx === i && ganadorIdx === null;
          return (
            <CuadroJugador
              key={u.id}
              unidad={u}
              esInicioLeg={i === (numeroLeg - 1) % unidadesBase.length}
              activo={activo}
              ganador={ganadorIdx === i}
              legsGanados={legsGanados[i]}
              valorPrincipal={u.restante}
              dardoInfo={activo ? (modoEntrada === "total" ? t("marcador.introduceTotal") : `Dardo ${Math.min(tiradasVisita.length + 1, 3)} de 3`) : null}
              slides={[
                {
                  titulo: "Esta partida",
                  filas: [
                    ["Promedio", fmtProm(promedio3Dardos(legActual.puntos, legActual.dardos))],
                    ["Última entrada", ultimaVisitaUnidad[i] ?? "—"],
                    ["Dardos usados", legActual.dardos || 0],
                  ],
                },
                {
                  titulo: "Partido",
                  filas: [
                    ["% de cierre", fmtPct(partidoTotal.cierresConvertidos, partidoTotal.intentosCierre)],
                    ["Cierre más alto", partidoTotal.checkoutMax ?? "—"],
                    ["Promedio partido", fmtProm(promedio3Dardos(partidoTotal.puntos, partidoTotal.dardos))],
                  ],
                },
              ]}
            />
          );
        })}
      </div>

      {ganadorIdx === null && (
        <>
          {preguntaDoble && (
            <div className="admin-msg admin-msg-ok marcador-pregunta-doble">
              <p style={{ margin: "0 0 .5rem" }}>
                ¿Cuántos dardos de esta visita ha tirado <strong>{tiradorActual(unidades[preguntaDoble.turnoIdx])}</strong> al doble/máster?
              </p>
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                {[0, 1, 2, 3].map((n) => (
                  <button key={n} type="button" className="admin-tab" onClick={() => responderDardosDoble(n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          <SelectorModoEntrada modo={modoEntrada} onCambiar={setModoEntrada} permitirTotal />
          {modoEntrada === "diana" && <Diana onTirada={tirar} marcas={tiradasVisita.map((tv) => tv.pos).filter(Boolean)} deshabilitada={finVisita || !!preguntaDoble} />}
          {modoEntrada === "numeros" && <TecladoNumeros onTirada={tirar} deshabilitada={finVisita || !!preguntaDoble} />}
          {modoEntrada === "total" && <TecladoPuntuacion cierre={cierre} onEnviar={tirarVisitaTotal} deshabilitada={finVisita || !!preguntaDoble} />}
          <p className="marcador-tiradas-visita">
            {t("marcador.estaVisita")} {tiradasVisita.length ? tiradasVisita.map((tv) => etiquetaTiradaMostrar(tv.resultado.etiqueta, t)).join(", ") : "—"}
          </p>
          {sugerencia && <p className="admin-msg admin-msg-ok">{t("marcador.sugerenciaCierre")} {sugerencia.join(" → ")}</p>}
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          {!preguntaDoble && (
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
          )}
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        {t("marcador.nuevaPartida")}
      </button>
    </div>
  );
}

// Envoltorio de la partida completa (varios legs hasta llegar a la mayoría
// de "al mejor de N"), sin guardar nada — todo el estado vive aquí, en
// memoria, y se pierde si se recarga la página (igual que antes).
function PartidaLocal501({ configBase, apertura, cierre, alMejorDe, onNuevaPartida }) {
  const unidadesBase = useMemo(() => construirUnidades(configBase), [configBase]);
  const [legs, setLegs] = useState([]); // [{ ganadorIdx, estadisticas: {unidadId: {...}} }]

  const legsGanados = useMemo(() => {
    const arr = unidadesBase.map(() => 0);
    legs.forEach((l) => { arr[l.ganadorIdx] += 1; });
    return arr;
  }, [legs, unidadesBase]);
  const legsParaGanar = Math.floor(alMejorDe / 2) + 1;
  const ganadorFinalIdx = legsGanados.findIndex((n) => n >= legsParaGanar);

  if (ganadorFinalIdx !== -1) {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          🏆 {unidadesBase[ganadorFinalIdx].etiqueta} gana el partido ({legsGanados.join(" - ")})
        </p>
        <button type="button" onClick={onNuevaPartida}>Nueva partida</button>
      </div>
    );
  }

  return (
    <LegLocal501
      key={legs.length}
      unidadesBase={unidadesBase}
      legs={legs}
      legsGanados={legsGanados}
      apertura={apertura}
      cierre={cierre}
      alMejorDe={alMejorDe}
      onLegTerminado={(ganadorIdx, estadisticas) => setLegs((prev) => [...prev, { ganadorIdx, estadisticas }])}
      onSalir={onNuevaPartida}
    />
  );
}

function Marcador501() {
  const { t } = useLang();
  const [fase, setFase] = useState("jugadores"); // "jugadores" | "reglas" | "jugando"
  const [configBase, setConfigBase] = useState(null);
  const [apertura, setApertura] = useState("simple");
  const [cierre, setCierre] = useState("doble");
  const [alMejorDe, setAlMejorDe] = useState(5);

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
        <SelectorAlMejorDe valor={alMejorDe} onCambiar={setAlMejorDe} />
        <button type="button" onClick={() => setFase("jugando")} style={ESTILO_BOTON_PRIMARIO}>
          {t("marcador.empezarPartida")}
        </button>
      </div>
    );
  }

  return (
    <PartidaLocal501
      configBase={configBase}
      apertura={apertura}
      cierre={cierre}
      alMejorDe={alMejorDe}
      onNuevaPartida={() => setFase("jugadores")}
    />
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

// Un leg de Cricket, mismo patrón que LegLocal501: sin guardar nada, con
// estadísticas por unidad.id y aviso al padre (PartidaLocalCricket) cuando
// el leg se cierra. Cricket no tiene modalidades de apertura/cierre ni
// pregunta de "dardos al doble" (no hay checkouts), así que es más simple.
function LegLocalCricket({ unidadesBase, legs, legsGanados, modoCricket, alMejorDe, onLegTerminado, onSalir }) {
  const { t } = useLang();
  const numeroLeg = legs.length + 1;
  const [unidades, setUnidades] = useState(() => unidadesBase.map((u) => ({ ...u, marcas: marcasVacias() })));
  const [turnoIdx, setTurnoIdx] = useState((numeroLeg - 1) % unidadesBase.length);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [finVisita, setFinVisita] = useState(false);
  const [modoEntrada, setModoEntrada] = useState("diana");
  const [estadisticas, setEstadisticas] = useState({});
  const [ultimaVisitaUnidad, setUltimaVisitaUnidad] = useState(() => unidadesBase.map(() => null));

  const puntos = useMemo(
    () => (modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(unidades) : calcularPuntosCricket(unidades)),
    [unidades, modoCricket]
  );

  function registrarVisita(unidadId, marcas) {
    setEstadisticas((prev) => {
      const actual = prev[unidadId] || { visitas: 0, marcas: 0, mejorVisita: 0 };
      return { ...prev, [unidadId]: { visitas: actual.visitas + 1, marcas: actual.marcas + marcas, mejorVisita: Math.max(actual.mejorVisita, marcas) } };
    });
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
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaUnidad })]);

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
    const unidadId = unidades[turnoIdx].id;
    const marcasVisita = nuevasTiradas.reduce((s, tv) => s + (marcasDelDardo(tv.resultado)?.marcas || 0), 0);

    if (jugadorHaCerradoTodo(unidadQueTiro)) {
      const mejor = modoCricket === "cutthroat" ? Math.min(...puntosNuevos) : Math.max(...puntosNuevos);
      const cumpleCondicion = modoCricket === "cutthroat" ? puntosNuevos[turnoIdx] <= mejor : puntosNuevos[turnoIdx] >= mejor;
      if (cumpleCondicion) {
        registrarVisita(unidadId, marcasVisita);
        setUltimaVisitaUnidad((prev) => prev.map((v, i) => (i === turnoIdx ? marcasVisita : v)));
        setGanadorIdx(turnoIdx);
        return;
      }
    }

    if (nuevasTiradas.length >= 3) {
      registrarVisita(unidadId, marcasVisita);
      setUltimaVisitaUnidad((prev) => prev.map((v, i) => (i === turnoIdx ? marcasVisita : v)));
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
    setEstadisticas(previo.estadisticas);
    setUltimaVisitaUnidad(previo.ultimaVisitaUnidad);
  }

  useEffect(() => {
    if (ganadorIdx !== null) onLegTerminado(ganadorIdx, estadisticas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx]);

  return (
    <div>
      <CabeceraPartida alMejorDe={alMejorDe} numeroLeg={numeroLeg} />
      <div className="marcador-jugadores">
        {unidades.map((u, i) => {
          const legActual = sumarEstadisticasCricket(estadisticas[u.id]);
          const partidoTotal = sumarEstadisticasCricket(estadisticas[u.id], ...legs.map((l) => l.estadisticas[u.id]));
          const activo = turnoIdx === i && ganadorIdx === null;
          return (
            <CuadroJugador
              key={u.id}
              unidad={u}
              esInicioLeg={i === (numeroLeg - 1) % unidadesBase.length}
              activo={activo}
              ganador={ganadorIdx === i}
              legsGanados={legsGanados[i]}
              valorPrincipal={puntos[i]}
              dardoInfo={activo ? `Dardo ${Math.min(tiradasVisita.length + 1, 3)} de 3` : null}
              slides={[
                {
                  titulo: "Esta partida",
                  filas: [
                    ["Marcas/visita", fmtProm(legActual.visitas ? legActual.marcas / legActual.visitas : null)],
                    ["Última entrada", ultimaVisitaUnidad[i] ?? "—"],
                    ["Visitas jugadas", legActual.visitas || 0],
                  ],
                },
                {
                  titulo: "Partido",
                  filas: [
                    ["Mejor visita", partidoTotal.mejorVisita ?? "—"],
                    ["Marcas/visita partido", fmtProm(partidoTotal.visitas ? partidoTotal.marcas / partidoTotal.visitas : null)],
                    ["Total marcas", partidoTotal.marcas || 0],
                  ],
                },
              ]}
            />
          );
        })}
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

      {ganadorIdx === null && (
        <>
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

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        {t("marcador.nuevaPartida")}
      </button>
    </div>
  );
}

// Envoltorio de la partida completa de Cricket (varios legs hasta la
// mayoría de "al mejor de N"), igual que PartidaLocal501.
function PartidaLocalCricket({ configBase, modoCricket, alMejorDe, onNuevaPartida }) {
  const unidadesBase = useMemo(() => construirUnidades(configBase), [configBase]);
  const [legs, setLegs] = useState([]); // [{ ganadorIdx, estadisticas: {unidadId: {...}} }]

  const legsGanados = useMemo(() => {
    const arr = unidadesBase.map(() => 0);
    legs.forEach((l) => { arr[l.ganadorIdx] += 1; });
    return arr;
  }, [legs, unidadesBase]);
  const legsParaGanar = Math.floor(alMejorDe / 2) + 1;
  const ganadorFinalIdx = legsGanados.findIndex((n) => n >= legsParaGanar);

  if (ganadorFinalIdx !== -1) {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          🏆 {unidadesBase[ganadorFinalIdx].etiqueta} gana el partido ({legsGanados.join(" - ")})
        </p>
        <button type="button" onClick={onNuevaPartida}>Nueva partida</button>
      </div>
    );
  }

  return (
    <LegLocalCricket
      key={legs.length}
      unidadesBase={unidadesBase}
      legs={legs}
      legsGanados={legsGanados}
      modoCricket={modoCricket}
      alMejorDe={alMejorDe}
      onLegTerminado={(ganadorIdx, estadisticas) => setLegs((prev) => [...prev, { ganadorIdx, estadisticas }])}
      onSalir={onNuevaPartida}
    />
  );
}

function MarcadorCricket() {
  const { t } = useLang();
  const [fase, setFase] = useState("jugadores"); // "jugadores" | "reglas" | "jugando"
  const [configBase, setConfigBase] = useState(null);
  const [modoCricket, setModoCricket] = useState("normal"); // "normal" | "cutthroat"
  const [alMejorDe, setAlMejorDe] = useState(5);

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
        <SelectorAlMejorDe valor={alMejorDe} onCambiar={setAlMejorDe} />
        <button type="button" onClick={() => setFase("jugando")} style={ESTILO_BOTON_PRIMARIO}>
          {t("marcador.empezarPartida")}
        </button>
      </div>
    );
  }

  return (
    <PartidaLocalCricket
      configBase={configBase}
      modoCricket={modoCricket}
      alMejorDe={alMejorDe}
      onNuevaPartida={() => setFase("jugadores")}
    />
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
