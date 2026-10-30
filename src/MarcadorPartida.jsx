import { useEffect, useMemo, useRef, useState } from "react";
import Diana from "./Diana.jsx";
import TecladoNumeros from "./TecladoNumeros.jsx";
import TecladoPuntuacion from "./TecladoPuntuacion.jsx";
import PreguntaDoble from "./PreguntaDoble.jsx";
import { CabeceraPartida, CuadroJugador, fmtProm, fmtPct } from "./CuadroJugador.jsx";
import useModoEntrada from "./useModoEntrada.js";
import { apiFetch } from "./apiHerramienta.js";
import { useLang } from "./i18n.jsx";
import { construirUnidadesPartida, ladoDeUnidad, ladoIdxDe, ladosDe, legsGanadosDe } from "./ladosPartida.js";
import {
  buscarCierre,
  calcularPuntosCricket,
  calcularPuntosCricketCutThroat,
  cumpleModalidad,
  jugadorHaCerradoTodo,
  marcasDelDardo,
  marcasVacias,
  NUMEROS_CRICKET,
  promedio3Dardos,
  sumarEstadisticas501,
  sumarEstadisticasCricket,
  tiradorActual,
  simboloMarcas,
} from "./dardosLogica.js";

// Marcador único de 501 y Cricket (unificado el 2026-10-30, pedido de
// Iraitz: "que la herramienta sea única y de diferentes puntos acceder a
// ella"). Lo usan:
// - JuegoHerramienta.jsx: partidos de torneo, liga y amistosos (guardados en
//   el backend, en local o en remoto, con directo y cámaras);
// - Marcadores.jsx: la partida libre del VikingsCounter (en memoria, sin
//   guardar nada).
// Los dos le pasan una `partida` con la misma forma que una PartidaHerramienta
// del backend (lados, legs, reglas…; ver ladosPartida.js) y un
// `onLegTerminado(ladoIdx, estadisticas)` que devuelve (o promete) la partida
// actualizada: el backend la guarda (POST /legs) y la partida libre la
// calcula en memoria. Así cualquier cambio en la mecánica del marcador
// (bust, cierres, modos de entrada, estadísticas, pantalla…) se hace aquí
// una sola vez y llega a todos los sitios.
//
// Simplificaciones conocidas:
// - El modo "puntuación total" no sabe cuántos dardos ha usado realmente el
//   jugador en la visita: para la media se cuenta como 3 dardos siempre.
// - Quién empieza cada leg va rotando por el orden de tiro (leg 1: el
//   primero, leg 2: el segundo…).

const clonar = (x) => JSON.parse(JSON.stringify(x));

function etiquetaModalidad(modalidad, t) {
  if (modalidad === "doble") return t("marcador.doble");
  if (modalidad === "master") return t("marcador.master");
  return t("marcador.simple");
}

// Traduce a texto visible las etiquetas fijas que puede llevar un dardo (ver
// dardosLogica.js): casi todas ("T20", "D16", "25"…) son códigos que no
// dependen del idioma; solo hace falta traducir "Fuera".
function etiquetaTiradaMostrar(etiqueta, t) {
  if (etiqueta === "Fuera") return t("marcador.fuera");
  return etiqueta;
}

// Modos de entrada de dardos. "total" (escribir de una vez la puntuación de
// la visita) solo tiene sentido en 501: en Cricket hace falta saber qué
// número y con qué multiplicador se ha marcado.
function SelectorModoEntrada({ modo, onCambiar, permitirTotal }) {
  const { t } = useLang();
  return (
    <div className="live-tournament-toggle">
      {permitirTotal && (
        <button type="button" className={modo === "total" ? "active" : ""} onClick={() => onCambiar("total")}>
          {t("marcador.puntuacionTotal")}
        </button>
      )}
      <button type="button" className={modo === "numeros" ? "active" : ""} onClick={() => onCambiar("numeros")}>
        {t("marcador.numeros")}
      </button>
      <button type="button" className={modo === "diana" ? "active" : ""} onClick={() => onCambiar("diana")}>
        {t("marcador.diana")}
      </button>
    </div>
  );
}

// Jugador al que le toca tirar en una unidad (en parejas, el integrante que
// toque dentro del lado). Las estadísticas van por este id.
function idJugadorTirador(partida, unidad) {
  const lado = ladosDe(partida)[unidad.ladoIdx ?? 0];
  return lado?.jugadoresId[unidad.siguienteIntegranteIdx];
}

// Fin de leg: en cuanto hay ganador se avisa a quien lleva la partida
// (onLegTerminado, con el índice de LADO ganador) y se adopta la partida que
// devuelva (onActualizada), que trae el leg ya contado y, si toca, el
// partido terminado. Puede ser asíncrono (el backend) o inmediato (la
// partida libre). Si falla se ofrece reintentar (intentoEnvio).
function useLegTerminado({ ganadorIdx, unidades, estadisticas, fase, setFase, setErrorEnvio, intentoEnvio, onLegTerminado, onActualizada }) {
  const { t } = useLang();
  useEffect(() => {
    if (ganadorIdx === null || fase !== "jugando") return;
    setFase("enviando");
    Promise.resolve()
      .then(() => onLegTerminado(ladoDeUnidad(unidades[ganadorIdx], ganadorIdx), estadisticas))
      .then((actualizada) => onActualizada(actualizada))
      .catch((err) => {
        setErrorEnvio(err.message || t("marcador.errorGuardarLeg"));
        setFase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx, intentoEnvio]);
}

function EstadoFinLeg({ fase, errorEnvio, onReintentar }) {
  const { t } = useLang();
  if (fase === "enviando") return <p className="chronicle-status">{t("marcador.guardandoLeg")}</p>;
  if (fase !== "error") return null;
  return (
    <>
      <p className="admin-msg admin-msg-error">{errorEnvio}</p>
      <button type="button" onClick={onReintentar}>{t("marcador.reintentar")}</button>
    </>
  );
}

// --- Sincronización remota -------------------------------------------------
//
// Partida remota: cada lado juega desde su dispositivo (plan
// "partido-amistoso-remoto" guardado en el proyecto), cuando en la sala de
// espera todos los lados pulsan "Inicio" cada uno desde el suyo (modoJuego
// "remoto"). Cualquier partida — torneo, liga o amistoso — se puede jugar
// también en local, todos en un dispositivo (modoJuego "local"; 2026-10-30).
// Amistosos de antes de existir modoJuego: remotos, como entonces.
export function esPartidaRemota(partida) {
  return partida.modoJuego ? partida.modoJuego === "remoto" : !!partida.amistosa;
}

// Sala completada: cada lado tiene al menos un jugador que ha pulsado
// "Inicio" (en parejas basta con uno, ver POST /:id/listo en el backend).
export function ladosListos(partida) {
  const listos = partida.listosInicio || [];
  return ladosDe(partida).every((l) => l.jugadoresId.some((id) => listos.includes(id)));
}

// Últimas visitas por posición de turno, todas vacías.
function sinUltimasVisitas(unidades) {
  return unidades.map(() => null);
}

// Manda al backend el estado del leg en curso, dardo a dardo (PUT /visita).
// Sirve a la vez para:
// - el marcador en directo de la página pública del torneo/liga (ventanita
//   "En directo", ver DirectoPartida.jsx y GET /:id/directo);
// - en partida remota, que el dispositivo del rival vea las tiradas en
//   cuanto se hacen y recoja el turno cuando le toca (ver
//   useSondeoTurnoRemoto). Manda TODO el estado, también `estadisticas` y
//   `ultimaVisitaLado`, para que el rival vea sus propias estadísticas
//   actualizadas (bug de Iraitz del 2026-09-17: "me salen mis estadísticas
//   pero no las del rival").
//
// En remoto solo envía el dispositivo que tiene el turno, más el envío con
// el que lo cede (el turno acaba de pasar de mí al rival); lo que llega del
// rival por sondeo no se reenvía. Best-effort: si falla no afecta al juego.
// Lleva `secuencia` (creciente) y `leg` para que el backend descarte envíos
// que lleguen desordenados o de un leg ya terminado.
function useEnvioVisita({ partida, token, esRemota, esMiTurno, activo, unidades, turnoIdx, tiradasVisita, estadisticas, ultimaVisitaLado, inicioTurnoIdx, restanteInicioVisita }) {
  const secuencia = useRef(0);
  const eraMiTurno = useRef(esMiTurno);
  useEffect(() => {
    const cedeElTurno = eraMiTurno.current && !esMiTurno;
    eraMiTurno.current = esMiTurno;
    if (!partida.id || !activo) return;
    if (esRemota && !esMiTurno && !cedeElTurno) return;
    secuencia.current = Math.max(secuencia.current + 1, Date.now());
    apiFetch(`/api/partidas-herramienta/${partida.id}/visita`, {
      token,
      method: "PUT",
      body: JSON.stringify({
        turnoJugadorId: idJugadorTirador(partida, unidades[turnoIdx]),
        unidades,
        turnoIdx,
        estadisticas,
        ultimaVisitaLado,
        tiradas: tiradasVisita.map((tv) => tv.resultado.etiqueta),
        inicioTurnoIdx,
        restanteInicioVisita,
        leg: partida.legs.length + 1,
        secuencia: secuencia.current,
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidades, turnoIdx, tiradasVisita, estadisticas, ultimaVisitaLado, activo]);
}

// Sondea el estado de la partida cada 2s mientras se espera el turno del
// rival (solo partida remota). Si ha cambiado de leg o ha terminado, se
// propaga tal cual (onActualizada ya sabe remontar el marcador o mostrar
// "partido terminado"). Si sigue en el mismo leg:
// - si ya es mi turno según `visitaEnCurso`, se adopta ese estado como el
//   actual (tablero Y estadísticas) — onEstadoRemoto;
// - si sigue tirando el rival, se muestra su visita en curso (tablero y
//   dardos que lleva) para seguirla en directo — onVistaRival.
function useSondeoTurnoRemoto({ partida, token, miLadoIdx, esRemota, esMiTurno, activo, onEstadoRemoto, onVistaRival, onActualizada }) {
  const ultimaVista = useRef(null);
  useEffect(() => {
    if (!esRemota || esMiTurno || !activo) return undefined;
    const intervalo = setInterval(() => {
      apiFetch(`/api/partidas-herramienta/${partida.id}`, { token })
        .then((fresca) => {
          if (fresca.finalizada || fresca.legs.length !== partida.legs.length) {
            onActualizada(fresca);
            return;
          }
          const v = fresca.visitaEnCurso;
          if (!v || !Array.isArray(v.unidades)) return;
          if (ladoDeUnidad(v.unidades[v.turnoIdx], v.turnoIdx) === miLadoIdx) {
            onEstadoRemoto(v);
            return;
          }
          const clave = JSON.stringify([v.unidades, v.tiradas, v.estadisticas, v.ultimaVisitaLado]);
          if (clave === ultimaVista.current) return;
          ultimaVista.current = clave;
          onVistaRival(v);
        })
        .catch(() => {});
    }, 2000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esRemota, esMiTurno, activo, partida.id, partida.legs.length, miLadoIdx, token]);
}

// Visita del rival en curso (partida remota), en el hueco del teclado
// mientras le toca a él: sus dardos de esta visita y sus cámaras.
function EsperaRival({ tirador, tiradasRival, camarasRival }) {
  const { t } = useLang();
  return (
    <div className="marcador-tablero-entrada">
      <p className="chronicle-status">
        {t("marcador.tira")} <strong>{tirador}</strong>…
      </p>
      <p className="marcador-tiradas-visita">
        {t("marcador.suVisita")} {tiradasRival.length ? tiradasRival.map((e) => etiquetaTiradaMostrar(e, t)).join(", ") : "—"}
      </p>
      {camarasRival}
    </div>
  );
}

// --- Marcador 501 -----------------------------------------------------------

function nuevaLeg501(partida, numeroLeg) {
  const base = construirUnidadesPartida(partida).map((u) => ({ ...u, restante: 501, abierto: partida.apertura === "simple" }));
  return { unidades: base, turnoIdx: (numeroLeg - 1) % base.length };
}

function MarcadorPartida501({ partida, token, miJugadorId, esRemota, onLegTerminado, onActualizada, onSalir, textoSalir, camarasRival }) {
  const { t } = useLang();
  // Si es una partida remota y se retoma a media visita (recarga de página,
  // vuelta a la app…), se arranca desde el último estado sincronizado
  // (visitaEnCurso) en vez de desde el principio del leg — ver
  // useEnvioVisita más arriba y el plan "partido-amistoso-remoto" guardado
  // en el proyecto.
  const inicio = useMemo(() => {
    const base = nuevaLeg501(partida, partida.legs.length + 1);
    const v = partida.visitaEnCurso;
    if (esRemota && v?.unidades) {
      return {
        unidades: v.unidades,
        turnoIdx: v.turnoIdx,
        estadisticas: v.estadisticas || {},
        ultimaVisitaLado: v.ultimaVisitaLado || sinUltimasVisitas(v.unidades),
        restanteInicioVisita: v.restanteInicioVisita,
      };
    }
    return { ...base, estadisticas: {}, ultimaVisitaLado: sinUltimasVisitas(base.unidades) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida.id, partida.legs.length]);
  const [unidades, setUnidades] = useState(inicio.unidades);
  const [turnoIdx, setTurnoIdx] = useState(inicio.turnoIdx);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [restanteInicioVisita, setRestanteInicioVisita] = useState(inicio.restanteInicioVisita ?? inicio.unidades[inicio.turnoIdx].restante);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [modoEntrada, setModoEntrada] = useModoEntrada("501");
  const [finVisita, setFinVisita] = useState(false);
  // Al retomar un amistoso remoto a media visita, se arranca desde las
  // estadísticas ya sincronizadas (inicio.estadisticas), no desde cero — si
  // no, al recargar la página se perderían las del rival otra vez.
  const [estadisticas, setEstadisticas] = useState(inicio.estadisticas);
  // Puntos de la última visita de cada lado (0/1) EN ESTE LEG — no del
  // jugador que le tocara tirar ahora, sino de quien acaba de tirar; se
  // muestra en la tarjeta (slide "Esta partida"). Aparte de `estadisticas`
  // (que va por jugadorId, para poder mandarlo tal cual al backend) porque
  // aquí interesa por lado/tarjeta, no por persona (relevante en parejas con
  // marcador compartido).
  const [ultimaVisitaLado, setUltimaVisitaLado] = useState(inicio.ultimaVisitaLado);
  const [fase, setFase] = useState("jugando"); // jugando | enviando | error
  const [errorEnvio, setErrorEnvio] = useState("");
  const [intentoEnvio, setIntentoEnvio] = useState(0);
  // Cuando una visita termina (gana, bust o 3 dardos) y al empezarla ya se
  // podía cerrar en 3 dardos con la modalidad de cierre del partido, se le
  // pregunta al jugador cuántos dardos de esa visita ha tirado al
  // doble/máster antes de dar la visita por cerrada — dato que no se puede
  // deducir solo de la puntuación (sobre todo en modo diana/números, donde
  // puede haber dardos "de paso" antes del de cierre) y hace falta para el
  // % de cierre real (ver CuadroJugador). Mientras haya una pregunta
  // pendiente el teclado de entrada se deshabilita.
  const [preguntaDoble, setPreguntaDoble] = useState(null);

  function registrarVisita(jugadorId, dardos, puntos, esCheckout, dardosAlDoble) {
    setEstadisticas((prev) => {
      const actual = prev[jugadorId] || { dardos: 0, puntos: 0, visitas100: 0, visitas140: 0, visitas180: 0, intentosCierre: 0, cierresConvertidos: 0 };
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
      return { ...prev, [jugadorId]: actualizado };
    });
  }

  function concluirVisita(jugadorId, ladoIdx, puntosVisita, dardosCount, gana, dardosAlDoble) {
    registrarVisita(jugadorId, dardosCount, puntosVisita, gana, dardosAlDoble);
    setUltimaVisitaLado((prev) => prev.map((v, i) => (i === ladoIdx ? puntosVisita : v)));
    if (gana) {
      setGanadorIdx(ladoIdx);
    } else {
      setFinVisita(true);
    }
  }

  // Respuesta a la pregunta de "¿cuántos dardos al doble?" (ver
  // preguntaDoble arriba): retoma el cierre de la visita que se había
  // dejado a medias, ya con el dato de intentos de cierre.
  //
  // Cuando `p.necesitaConfirmarCierre` es true (modo "puntuación total",
  // cierre a doble/máster, el total llegaba justo a 0), esta misma
  // respuesta decide además si la visita cuenta como cierre válido: 0
  // dardos al doble = no hubo cierre válido = bust, se revierte al resto
  // inicial. Antes había una casilla aparte para confirmar esto ANTES de
  // enviar el total, redundante con esta pregunta y fácil de olvidar (se
  // podía marcar 1+ dardos aquí sin que la casilla estuviera marcada, y la
  // visita se quedaba en bust igualmente) — se unificó en una sola pregunta.
  function responderDardosDoble(dardosAlDoble) {
    const p = preguntaDoble;
    if (!p) return;
    setPreguntaDoble(null);
    if (p.origen === "total") {
      const gana = p.necesitaConfirmarCierre ? dardosAlDoble > 0 : p.gana;
      // Solo se revierte al resto inicial si el cierre no era válido; una
      // visita normal (o un bust, ya revertido al tirar) se queda como estaba.
      // Antes se revertía siempre que no se ganaba, y una visita que no
      // cerraba (p. ej. 60 desde 100) se perdía entera al responder.
      const anulada = p.necesitaConfirmarCierre && !gana;
      const puntosVisita = anulada ? 0 : p.puntosVisita;
      const unidadesTrasVisita = anulada
        ? p.unidadesAntes.map((u, i) => (i === p.turnoIdx ? { ...u, restante: p.restanteInicioVisita, abierto: true } : u))
        : p.nuevasUnidades;
      registrarVisita(p.jugadorId, p.dardosCount, puntosVisita, gana, dardosAlDoble);
      setUltimaVisitaLado((prev) => prev.map((v, i) => (i === p.turnoIdx ? puntosVisita : v)));
      if (gana) {
        setUnidades(unidadesTrasVisita);
        setTiradasVisita([{ resultado: p.resultado, pos: undefined }]);
        setMensaje("");
        setGanadorIdx(p.turnoIdx);
        return;
      }
      const conIntegranteActualizado = unidadesTrasVisita.map((u, i) =>
        i === p.turnoIdx && u.integrantes.length > 1
          ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length }
          : u
      );
      const siguienteIdx = (p.turnoIdx + 1) % conIntegranteActualizado.length;
      setUnidades(conIntegranteActualizado);
      setTurnoIdx(siguienteIdx);
      setTiradasVisita([]);
      setRestanteInicioVisita(conIntegranteActualizado[siguienteIdx].restante);
      setMensaje("");
      setFinVisita(false);
      return;
    }
    concluirVisita(p.jugadorId, p.turnoIdx, p.puntosVisita, p.dardosCount, p.gana, dardosAlDoble);
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null || finVisita || preguntaDoble) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaLado })]);

    const unidad = unidades[turnoIdx];
    const yaAbierto = unidad.abierto;
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;

    if (!yaAbierto && !cumpleModalidad(resultado, partida.apertura)) {
      nuevoMensaje = t("marcador.noCuentaAbrir").replace("{modalidad}", etiquetaModalidad(partida.apertura, t).toLowerCase());
    } else {
      const abreEsteDardo = !yaAbierto;
      const nuevoRestante = unidad.restante - resultado.valor;
      if (nuevoRestante < 0 || nuevoRestante === 1) {
        bust = true;
        nuevoMensaje = t("marcador.bustSigueCon").replace("{restante}", restanteInicioVisita);
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
      } else if (nuevoRestante === 0) {
        if (cumpleModalidad(resultado, partida.cierre)) {
          gana = true;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
        } else {
          bust = true;
          nuevoMensaje = t("marcador.bustCierreInvalido").replace("{modalidad}", etiquetaModalidad(partida.cierre, t).toLowerCase());
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

    const jugadorId = idJugadorTirador(partida, unidad);
    // Si al empezar esta visita el resto ya se podía cerrar en 3 dardos con
    // la modalidad de cierre del partido (y la unidad ya estaba abierta), al
    // acabar la visita se pregunta cuántos dardos ha tirado al doble/máster
    // (ver preguntaDoble) para el % de cierre real, en vez de darlo por
    // "intentado" sin más.
    const intentoPosible = unidad.abierto && !!buscarCierre(restanteInicioVisita, 3, partida.cierre);

    if (gana) {
      const puntosVisita = nuevasTiradas.reduce((s, tv) => s + tv.resultado.valor, 0);
      if (intentoPosible) {
        setPreguntaDoble({ jugadorId, turnoIdx, puntosVisita, dardosCount: nuevasTiradas.length, gana: true, origen: "dardos" });
      } else {
        concluirVisita(jugadorId, turnoIdx, puntosVisita, nuevasTiradas.length, true, 0);
      }
      return;
    }
    if (bust) {
      if (intentoPosible) {
        setPreguntaDoble({ jugadorId, turnoIdx, puntosVisita: 0, dardosCount: nuevasTiradas.length, gana: false, origen: "dardos" });
      } else {
        concluirVisita(jugadorId, turnoIdx, 0, nuevasTiradas.length, false, 0);
      }
      return;
    }
    if (nuevasTiradas.length >= 3) {
      const puntosVisita = nuevasTiradas.reduce((s, tv) => s + tv.resultado.valor, 0);
      if (intentoPosible) {
        setPreguntaDoble({ jugadorId, turnoIdx, puntosVisita, dardosCount: 3, gana: false, origen: "dardos" });
      } else {
        concluirVisita(jugadorId, turnoIdx, puntosVisita, 3, false, 0);
      }
    }
  }

  function tirarVisitaTotal(valorTotal) {
    if (ganadorIdx !== null || finVisita || preguntaDoble) return;
    if (!Number.isFinite(valorTotal) || valorTotal < 0 || valorTotal > 180) {
      setMensaje(t("marcador.visitaFueraRango"));
      return;
    }
    const unidad = unidades[turnoIdx];
    if (!unidad.abierto && partida.apertura !== "simple") {
      setMensaje(
        t("marcador.noSePuedeAbrirModo").replace("{modalidad}", etiquetaModalidad(partida.apertura, t).toLowerCase())
      );
      return;
    }
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaLado })]);

    const resultado = { etiqueta: `${valorTotal} ${t("marcador.visitaSufijo")}`, numero: null, multiplicador: null, valor: valorTotal, esDoble: false, esTriple: false, esBull: false };
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;
    // Si el cierre es a doble/máster y el total deja el resto justo a 0, no
    // se puede saber solo con el número si el último dardo cumplía la
    // modalidad — eso se confirma con la pregunta de después ("¿cuántos
    // dardos ha tirado al doble/máster?", ver preguntaDoble): 0 dardos =
    // cierre no válido = bust. Con cierre simple no hace falta preguntar.
    let necesitaConfirmarCierre = false;

    const nuevoRestante = unidad.restante - valorTotal;
    if (nuevoRestante < 0 || nuevoRestante === 1) {
      bust = true;
      nuevoMensaje = t("marcador.bustVisitaSigueCon").replace("{restante}", restanteInicioVisita);
      nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: true } : u));
    } else if (nuevoRestante === 0) {
      if (partida.cierre === "simple") {
        gana = true;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
      } else {
        necesitaConfirmarCierre = true;
        // Provisional (se ve a 0 mientras se espera la respuesta); si la
        // respuesta es 0 dardos al doble, se revierte al resto inicial.
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
      }
    } else {
      nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: nuevoRestante, abierto: true } : u));
    }

    const jugadorId = idJugadorTirador(partida, unidad);
    const intentoPosible = unidad.abierto && !!buscarCierre(restanteInicioVisita, 3, partida.cierre);
    const puntosVisita = bust ? 0 : valorTotal;

    // En este modo cada envío ya es la visita entera (a diferencia de
    // diana/números, donde una visita puede quedar a medias antes de los 3
    // dardos): se pasa directamente al siguiente jugador sin esperar un
    // segundo clic en "Siguiente jugador" — pedido de Iraitz, 2026-09-09.
    const conIntegranteActualizado = nuevasUnidades.map((u, i) =>
      i === turnoIdx && u.integrantes.length > 1
        ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length }
        : u
    );
    const siguienteIdx = (turnoIdx + 1) % conIntegranteActualizado.length;
    const avanzar = { unidades: conIntegranteActualizado, turnoIdx: siguienteIdx, restante: conIntegranteActualizado[siguienteIdx].restante };

    if (necesitaConfirmarCierre || intentoPosible) {
      // Se deja ver el resultado de la visita (resto actualizado, mensaje de
      // bust si lo hay) mientras se espera la respuesta, igual que en modo
      // diana/números — solo se retrasa el registro de estadísticas y el
      // avance de turno hasta responder.
      setUnidades(nuevasUnidades);
      setMensaje(nuevoMensaje);
      setPreguntaDoble({
        jugadorId,
        turnoIdx,
        puntosVisita,
        dardosCount: 3,
        gana,
        origen: "total",
        necesitaConfirmarCierre,
        valorTotal,
        unidadesAntes: unidades,
        restanteInicioVisita,
        resultado,
        nuevoMensaje,
        nuevasUnidades,
        avanzar,
      });
      return;
    }

    registrarVisita(jugadorId, 3, puntosVisita, gana, 0);
    setUltimaVisitaLado((prev) => prev.map((v, i) => (i === turnoIdx ? puntosVisita : v)));

    if (gana) {
      setUnidades(nuevasUnidades);
      setTiradasVisita([{ resultado, pos: undefined }]);
      setMensaje(nuevoMensaje);
      setGanadorIdx(turnoIdx);
      return;
    }

    setUnidades(avanzar.unidades);
    setTurnoIdx(avanzar.turnoIdx);
    setTiradasVisita([]);
    setRestanteInicioVisita(avanzar.restante);
    // El mensaje de bust se descarta al pasar de turno (iría pegado al
    // jugador equivocado); el marcador ya deja ver que no se ha movido.
    setMensaje("");
    setFinVisita(false);
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
    setUltimaVisitaLado(previo.ultimaVisitaLado);
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

  const miLadoIdx = ladoIdxDe(partida, miJugadorId);
  const esMiTurno = !esRemota || ladoDeUnidad(unidades[turnoIdx], turnoIdx) === miLadoIdx;
  const [tiradasRival, setTiradasRival] = useState([]);

  useEnvioVisita({
    partida,
    token,
    esRemota,
    esMiTurno,
    activo: ganadorIdx === null && fase === "jugando",
    unidades,
    turnoIdx,
    tiradasVisita,
    estadisticas,
    ultimaVisitaLado,
    inicioTurnoIdx: inicio.turnoIdx,
    restanteInicioVisita,
  });

  useSondeoTurnoRemoto({
    partida,
    token,
    miLadoIdx,
    esRemota,
    esMiTurno,
    activo: ganadorIdx === null && fase === "jugando",
    onActualizada,
    onEstadoRemoto: (v) => {
      setUnidades(v.unidades);
      setTurnoIdx(v.turnoIdx);
      setTiradasVisita([]);
      setTiradasRival([]);
      setRestanteInicioVisita(v.restanteInicioVisita ?? v.unidades[v.turnoIdx].restante);
      setMensaje("");
      setFinVisita(false);
      setEstadisticas(v.estadisticas || {});
      setUltimaVisitaLado(v.ultimaVisitaLado || sinUltimasVisitas(v.unidades));
    },
    onVistaRival: (v) => {
      // Con 3 o más, el turno también puede pasar entre otros dos jugadores
      // mientras este dispositivo espera.
      setTurnoIdx(v.turnoIdx);
      setUnidades(v.unidades);
      setEstadisticas(v.estadisticas || {});
      setUltimaVisitaLado(v.ultimaVisitaLado || sinUltimasVisitas(v.unidades));
      setTiradasRival(v.tiradas || []);
    },
  });

  useLegTerminado({ ganadorIdx, unidades, estadisticas, fase, setFase, setErrorEnvio, intentoEnvio, onLegTerminado, onActualizada });

  const unidadActual = unidades[turnoIdx];
  const sugerencia = useMemo(() => {
    if (!unidadActual || ganadorIdx !== null || finVisita || preguntaDoble || !unidadActual.abierto) return null;
    const dardosDisponibles = 3 - tiradasVisita.length;
    if (dardosDisponibles <= 0) return null;
    return buscarCierre(unidadActual.restante, dardosDisponibles, partida.cierre);
  }, [unidadActual, tiradasVisita.length, partida.cierre, ganadorIdx, finVisita, preguntaDoble]);

  return (
    <div>
      <CabeceraPartida alMejorDe={partida.alMejorDe} numeroLeg={partida.legs.length + 1} />
      <div className="marcador-tablero">
        <div className="marcador-tablero-jugadores">
          <div className="marcador-jugadores">
            {unidades.map((u, i) => {
              const idsLado = ladosDe(partida)[ladoDeUnidad(u, i)]?.jugadoresId || [];
              const legActual = sumarEstadisticas501(...idsLado.map((id) => estadisticas[id]));
              const partidoTotal = sumarEstadisticas501(
                ...idsLado.map((id) => estadisticas[id]),
                ...partida.legs.flatMap((leg) => idsLado.map((id) => leg.estadisticas?.[id]))
              );
              const activo = turnoIdx === i && ganadorIdx === null;
              return (
                <CuadroJugador
                  key={u.id}
                  unidad={u}
                  esInicioLeg={i === inicio.turnoIdx}
                  activo={activo}
                  ganador={ganadorIdx === i}
                  legsGanados={legsGanadosDe(partida)[ladoDeUnidad(u, i)] ?? 0}
                  valorPrincipal={u.restante}
                  dardoInfo={activo && modoEntrada !== "total" ? t("marcador.dardoN").replace("{n}", Math.min(tiradasVisita.length + 1, 3)) : null}
                  slides={[
                    {
                      titulo: "Esta partida",
                      filas: [
                        ["Promedio", fmtProm(promedio3Dardos(legActual.puntos, legActual.dardos))],
                        ["Última", ultimaVisitaLado[i] ?? "—"],
                        ["Dardos", legActual.dardos || 0],
                      ],
                    },
                    {
                      titulo: "Partido",
                      filas: [
                        ["% cierre", fmtPct(partidoTotal.cierresConvertidos, partidoTotal.intentosCierre)],
                        ["Cierre máx.", partidoTotal.checkoutMax ?? "—"],
                        ["Prom. partido", fmtProm(promedio3Dardos(partidoTotal.puntos, partidoTotal.dardos))],
                      ],
                    },
                  ]}
                />
              );
            })}
          </div>
        </div>

        {fase === "jugando" && ganadorIdx === null && !esMiTurno && (
          <EsperaRival tirador={tiradorActual(unidades[turnoIdx])} tiradasRival={tiradasRival} camarasRival={camarasRival} />
        )}
        {fase === "jugando" && ganadorIdx === null && esMiTurno && (
          <div className="marcador-tablero-entrada">
            {preguntaDoble && (
              <PreguntaDoble
                tirador={tiradorActual(unidades[preguntaDoble.turnoIdx])}
                necesitaConfirmarCierre={preguntaDoble.necesitaConfirmarCierre}
                restanteInicioVisita={preguntaDoble.restanteInicioVisita}
                onResponder={responderDardosDoble}
              />
            )}
            <SelectorModoEntrada modo={modoEntrada} onCambiar={setModoEntrada} permitirTotal />
            {modoEntrada === "diana" && <Diana onTirada={tirar} marcas={tiradasVisita.map((tv) => tv.pos).filter(Boolean)} deshabilitada={finVisita || !!preguntaDoble} />}
            {modoEntrada === "numeros" && <TecladoNumeros onTirada={tirar} deshabilitada={finVisita || !!preguntaDoble} />}
            {modoEntrada === "total" && <TecladoPuntuacion onEnviar={tirarVisitaTotal} deshabilitada={finVisita || !!preguntaDoble} />}
            <p className="marcador-tiradas-visita">
              {t("marcador.estaVisita")} {tiradasVisita.length ? tiradasVisita.map((tv) => etiquetaTiradaMostrar(tv.resultado.etiqueta, t)).join(", ") : "—"}
            </p>
            {sugerencia && <p className="admin-msg admin-msg-ok">{t("marcador.sugerenciaCierre")} {sugerencia.join(" → ")}</p>}
            {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
            {!preguntaDoble && (
              <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
                {/* En modo "total" cada envío ya avanza solo al siguiente jugador (ver
                    tirarVisitaTotal), así que este botón se oculta salvo que finVisita
                    se haya quedado a true de antes de cambiar a este modo a medio turno
                    — caso raro, pero si pasara no queremos dejar el teclado bloqueado
                    sin forma de continuar. */}
                {(modoEntrada !== "total" || finVisita) && (
                  <button
                    type="button"
                    className={finVisita ? "admin-link-btn marcador-boton-destacado" : "admin-link-btn"}
                    onClick={() => finalizarVisita(unidades, turnoIdx)}
                  >
                    {finVisita ? t("marcador.siguienteJugador") : t("marcador.terminarTurno")}
                  </button>
                )}
                <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
                  {t(modoEntrada === "total" ? "marcador.deshacerVisita" : "marcador.deshacerDardo")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <EstadoFinLeg
        fase={fase}
        errorEnvio={errorEnvio}
        onReintentar={() => {
          setFase("jugando");
          setIntentoEnvio((n) => n + 1);
        }}
      />

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        {textoSalir}
      </button>
    </div>
  );
}

// --- Marcador Cricket --------------------------------------------------

function nuevaLegCricket(partida, numeroLeg) {
  const base = construirUnidadesPartida(partida).map((u) => ({ ...u, marcas: marcasVacias() }));
  return { unidades: base, turnoIdx: (numeroLeg - 1) % base.length };
}

function MarcadorPartidaCricket({ partida, token, miJugadorId, esRemota, onLegTerminado, onActualizada, onSalir, textoSalir, camarasRival }) {
  const { t } = useLang();
  // Ver el comentario equivalente en MarcadorPartida501: al retomar una
  // partida remota a media visita se arranca desde visitaEnCurso, no desde
  // el principio del leg.
  const inicio = useMemo(() => {
    const base = nuevaLegCricket(partida, partida.legs.length + 1);
    if (esRemota && partida.visitaEnCurso?.unidades) {
      return {
        unidades: partida.visitaEnCurso.unidades,
        turnoIdx: partida.visitaEnCurso.turnoIdx,
        estadisticas: partida.visitaEnCurso.estadisticas || {},
        ultimaVisitaLado: partida.visitaEnCurso.ultimaVisitaLado || sinUltimasVisitas(partida.visitaEnCurso.unidades),
      };
    }
    return { ...base, estadisticas: {}, ultimaVisitaLado: sinUltimasVisitas(base.unidades) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partida.id, partida.legs.length]);
  const [unidades, setUnidades] = useState(inicio.unidades);
  const [turnoIdx, setTurnoIdx] = useState(inicio.turnoIdx);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [finVisita, setFinVisita] = useState(false);
  const [modoEntrada, setModoEntrada] = useModoEntrada("cricket");
  // Al retomar un amistoso remoto a media visita, se arranca desde las
  // estadísticas ya sincronizadas, no desde cero (ver el comentario
  // equivalente en MarcadorPartida501).
  const [estadisticas, setEstadisticas] = useState(inicio.estadisticas);
  // Marcas de la última visita de cada lado (0/1) EN ESTE LEG — ver el
  // comentario equivalente en MarcadorPartida501.
  const [ultimaVisitaLado, setUltimaVisitaLado] = useState(inicio.ultimaVisitaLado);
  const [fase, setFase] = useState("jugando");
  const [errorEnvio, setErrorEnvio] = useState("");
  const [intentoEnvio, setIntentoEnvio] = useState(0);

  const puntos = useMemo(
    () => (partida.modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(unidades) : calcularPuntosCricket(unidades)),
    [unidades, partida.modoCricket]
  );

  function registrarVisita(jugadorId, marcas) {
    setEstadisticas((prev) => {
      const actual = prev[jugadorId] || { visitas: 0, marcas: 0, mejorVisita: 0 };
      return {
        ...prev,
        [jugadorId]: { visitas: actual.visitas + 1, marcas: actual.marcas + marcas, mejorVisita: Math.max(actual.mejorVisita, marcas) },
      };
    });
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null || finVisita) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaLado })]);

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

    const puntosNuevos = partida.modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(nuevasUnidades) : calcularPuntosCricket(nuevasUnidades);
    const unidadQueTiro = nuevasUnidades[turnoIdx];
    const jugadorId = idJugadorTirador(partida, unidades[turnoIdx]);
    const marcasVisita = nuevasTiradas.reduce((s, t) => s + (marcasDelDardo(t.resultado)?.marcas || 0), 0);

    if (jugadorHaCerradoTodo(unidadQueTiro)) {
      const mejor = partida.modoCricket === "cutthroat" ? Math.min(...puntosNuevos) : Math.max(...puntosNuevos);
      const cumpleCondicion = partida.modoCricket === "cutthroat" ? puntosNuevos[turnoIdx] <= mejor : puntosNuevos[turnoIdx] >= mejor;
      if (cumpleCondicion) {
        registrarVisita(jugadorId, marcasVisita);
        setUltimaVisitaLado((prev) => prev.map((v, i) => (i === turnoIdx ? marcasVisita : v)));
        setGanadorIdx(turnoIdx);
        return;
      }
    }

    if (nuevasTiradas.length >= 3) {
      registrarVisita(jugadorId, marcasVisita);
      setUltimaVisitaLado((prev) => prev.map((v, i) => (i === turnoIdx ? marcasVisita : v)));
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
    setUltimaVisitaLado(previo.ultimaVisitaLado);
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

  const miLadoIdx = ladoIdxDe(partida, miJugadorId);
  const esMiTurno = !esRemota || ladoDeUnidad(unidades[turnoIdx], turnoIdx) === miLadoIdx;
  const [tiradasRival, setTiradasRival] = useState([]);

  useEnvioVisita({
    partida,
    token,
    esRemota,
    esMiTurno,
    activo: ganadorIdx === null && fase === "jugando",
    unidades,
    turnoIdx,
    tiradasVisita,
    estadisticas,
    ultimaVisitaLado,
    inicioTurnoIdx: inicio.turnoIdx,
  });

  useSondeoTurnoRemoto({
    partida,
    token,
    miLadoIdx,
    esRemota,
    esMiTurno,
    activo: ganadorIdx === null && fase === "jugando",
    onActualizada,
    onEstadoRemoto: (v) => {
      setUnidades(v.unidades);
      setTurnoIdx(v.turnoIdx);
      setTiradasVisita([]);
      setTiradasRival([]);
      setMensaje("");
      setFinVisita(false);
      setEstadisticas(v.estadisticas || {});
      setUltimaVisitaLado(v.ultimaVisitaLado || sinUltimasVisitas(v.unidades));
    },
    onVistaRival: (v) => {
      // Con 3 o más, el turno también puede pasar entre otros dos jugadores
      // mientras este dispositivo espera.
      setTurnoIdx(v.turnoIdx);
      setUnidades(v.unidades);
      setEstadisticas(v.estadisticas || {});
      setUltimaVisitaLado(v.ultimaVisitaLado || sinUltimasVisitas(v.unidades));
      setTiradasRival(v.tiradas || []);
    },
  });

  useLegTerminado({ ganadorIdx, unidades, estadisticas, fase, setFase, setErrorEnvio, intentoEnvio, onLegTerminado, onActualizada });

  return (
    <div>
      <CabeceraPartida alMejorDe={partida.alMejorDe} numeroLeg={partida.legs.length + 1} />
      <div className="marcador-tablero">
        <div className="marcador-tablero-jugadores">
          <div className="marcador-jugadores">
            {unidades.map((u, i) => {
              const idsLado = ladosDe(partida)[ladoDeUnidad(u, i)]?.jugadoresId || [];
              const legActual = sumarEstadisticasCricket(...idsLado.map((id) => estadisticas[id]));
              const partidoTotal = sumarEstadisticasCricket(
                ...idsLado.map((id) => estadisticas[id]),
                ...partida.legs.flatMap((leg) => idsLado.map((id) => leg.estadisticas?.[id]))
              );
              const activo = turnoIdx === i && ganadorIdx === null;
              return (
                <CuadroJugador
                  key={u.id}
                  unidad={u}
                  esInicioLeg={i === inicio.turnoIdx}
                  activo={activo}
                  ganador={ganadorIdx === i}
                  legsGanados={legsGanadosDe(partida)[ladoDeUnidad(u, i)] ?? 0}
                  valorPrincipal={puntos[i]}
                  dardoInfo={activo ? t("marcador.dardoN").replace("{n}", Math.min(tiradasVisita.length + 1, 3)) : null}
                  slides={[
                    {
                      titulo: "Esta partida",
                      filas: [
                        ["Marcas/visita", fmtProm(legActual.visitas ? legActual.marcas / legActual.visitas : null)],
                        ["Última", ultimaVisitaLado[i] ?? "—"],
                        ["Visitas", legActual.visitas || 0],
                      ],
                    },
                    {
                      titulo: "Partido",
                      filas: [
                        ["Mejor visita", partidoTotal.mejorVisita ?? "—"],
                        ["Marcas/visita", fmtProm(partidoTotal.visitas ? partidoTotal.marcas / partidoTotal.visitas : null)],
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
                    <th key={u.id} className={ganadorIdx === i ? "marcador-jugador-ganador" : ""}>{u.etiqueta}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NUMEROS_CRICKET.map((num) => (
                  <tr key={num.clave}>
                    <th scope="row">{num.etiqueta}</th>
                    {unidades.map((u, i) => (
                      <td key={u.id} className={u.marcas[num.clave] >= 3 ? "marcador-celda-cerrada" : ""}>{simboloMarcas(u.marcas[num.clave])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {fase === "jugando" && ganadorIdx === null && !esMiTurno && (
          <EsperaRival tirador={tiradorActual(unidades[turnoIdx])} tiradasRival={tiradasRival} camarasRival={camarasRival} />
        )}
        {fase === "jugando" && ganadorIdx === null && esMiTurno && (
          <div className="marcador-tablero-entrada">
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
          </div>
        )}
      </div>

      <EstadoFinLeg
        fase={fase}
        errorEnvio={errorEnvio}
        onReintentar={() => {
          setFase("jugando");
          setIntentoEnvio((n) => n + 1);
        }}
      />

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        {textoSalir}
      </button>
    </div>
  );
}

// Punto de entrada: el marcador del juego de la partida (501 o Cricket).
// key=legs.length en quien lo monta, para que se remonte entero en cada leg.
export default function MarcadorPartida(props) {
  return props.partida.juego === "cricket" ? <MarcadorPartidaCricket {...props} /> : <MarcadorPartida501 {...props} />;
}
