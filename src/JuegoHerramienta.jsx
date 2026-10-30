import { useEffect, useMemo, useRef, useState } from "react";
import Diana from "./Diana.jsx";
import TecladoNumeros from "./TecladoNumeros.jsx";
import TecladoPuntuacion from "./TecladoPuntuacion.jsx";
import PreguntaDoble from "./PreguntaDoble.jsx";
import { CabeceraPartida, CuadroJugador, fmtProm, fmtPct } from "./CuadroJugador.jsx";
import useModoEntrada from "./useModoEntrada.js";
import CamarasPartida, { CamarasRival } from "./CamarasPartida.jsx";
import { apiFetch } from "./apiHerramienta.js";
import { CLUB } from "./club.js";
import { construirUnidadesPartida, ladoDeUnidad, ladoIdxDe, ladosDe, legsGanadosDe, ordenTiroDe } from "./ladosPartida.js";
import { useLang } from "./i18n.jsx";
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

// Flujo público de juego con la herramienta de marcador, para partidos de
// torneo/liga con la herramienta activada (ver ConfiguracionHerramientaPanel.jsx
// en el admin y el plan "herramienta-marcador-torneos-ligas" guardado en el
// proyecto — Slice 3+4). A diferencia de Marcadores.jsx (calculadora suelta,
// sin guardar nada), aquí los jugadores/reglas vienen del partido real y,
// leg a leg, el resultado se manda al backend — que en cuanto se alcanza "al
// mejor de N" lo aplica solo al partido (ver src/routes/partidasHerramienta.js).
//
// Simplificaciones de esta primera fase (dispositivo compartido junto a la
// diana, ver decisión en el plan):
// - El modo "puntuación total" no sabe cuántos dardos ha usado realmente el
//   jugador en la visita: para la media se cuenta como 3 dardos siempre
//   (igual que se ha hecho al añadir este modo a Marcadores.jsx).
// - Quién empieza cada leg va rotando por el orden de tiro (leg 1: el
//   primero, leg 2: el segundo…); el orden se elige en la sala de espera.

// apiFetch/API_URL se extrajeron a apiHerramienta.js (plan "camaras-partidas",
// guardado en el proyecto) para que CamarasPartida.jsx pueda usarlos sin
// depender en círculo de este fichero. Mismo comportamiento de siempre.
const clonar = (x) => JSON.parse(JSON.stringify(x));

function etiquetaModalidad(modalidad) {
  if (modalidad === "doble") return "Doble";
  if (modalidad === "master") return "Master (doble o triple)";
  return "Simple (cualquier dardo)";
}

// --- Paso 1: identificación con PIN ---------------------------------------

export function LoginPin({ onEntrar }) {
  const { t } = useLang();
  const [jugadores, setJugadores] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [jugadorId, setJugadorId] = useState("");
  const [pin, setPin] = useState("");
  const [pinRepetido, setPinRepetido] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiFetch("/api/partidas-herramienta/jugadores")
      .then(setJugadores)
      .catch(() => setError(t("pin.errorLista")));
  }, []);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return jugadores;
    return jugadores.filter((j) => (j.apodo || j.nombre).toLowerCase().includes(q));
  }, [jugadores, filtro]);

  const jugador = jugadores.find((j) => j.id === jugadorId) || null;

  function elegirJugador(j) {
    setJugadorId(j.id);
    setPin("");
    setPinRepetido("");
    setError("");
  }

  // Si el jugador todavía no tiene PIN de partidas puesto (primera vez que
  // usa la herramienta), se lo pone él mismo aquí mismo en vez de tener que
  // pasar antes por el admin o por su perfil de socio.
  async function crearPinYEntrar() {
    if (!/^\d{4}$/.test(pin)) {
      setError(t("pin.eligePin4"));
      return;
    }
    if (pin !== pinRepetido) {
      setError(t("pin.noCoinciden"));
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const data = await apiFetch("/api/partidas-herramienta/pin", {
        method: "POST",
        body: JSON.stringify({ jugadorId, pin }),
      });
      onEntrar(data);
    } catch (err) {
      setError(err.message || t("pin.errorCrear"));
    } finally {
      setEnviando(false);
    }
  }

  async function entrar() {
    if (!jugadorId || !/^\d{4}$/.test(pin)) {
      setError(t("pin.eligeYEscribe"));
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const data = await apiFetch("/api/partidas-herramienta/login", {
        method: "POST",
        body: JSON.stringify({ jugadorId, pin }),
      });
      onEntrar(data);
    } catch (err) {
      setError(err.status === 401 ? t("pin.incorrecto") : err.message || t("pin.incorrecto"));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="admin-form" style={{ maxWidth: 380 }}>
      <label>
        {t("pin.quienEres")}
        <input type="text" placeholder={t("pin.buscarNombre")} value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>
      <div className="marcador-lista-jugadores" style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: ".3rem" }}>
        {filtrados.map((j) => (
          <button
            key={j.id}
            type="button"
            className={`admin-tab ${jugadorId === j.id ? "admin-tab-active" : ""}`}
            onClick={() => elegirJugador(j)}
          >
            {j.apodo || j.nombre}
            {!j.tienePinPartidas && <small style={{ opacity: 0.7 }}> · {t("pin.sinPin")}</small>}
          </button>
        ))}
        {filtrados.length === 0 && <p className="chronicle-status">{t("pin.nadie")}</p>}
      </div>

      {jugador && !jugador.tienePinPartidas ? (
        <>
          <p className="chronicle-status" style={{ margin: 0 }}>
            {t("pin.primeraVez").replace("{nombre}", jugador.apodo || jugador.nombre)}
          </p>
          <label>
            {t("pin.elige")}
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label>
            {t("pin.repite")}
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinRepetido}
              onChange={(e) => setPinRepetido(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          {error && <p className="admin-msg admin-msg-error">{error}</p>}
          <button type="button" disabled={enviando} onClick={crearPinYEntrar}>
            {enviando ? t("pin.creando") : t("pin.crearYEntrar")}
          </button>
        </>
      ) : (
        <>
          <label>
            {t("pin.tuPin")}
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          {error && <p className="admin-msg admin-msg-error">{error}</p>}
          <button type="button" disabled={enviando} onClick={entrar}>
            {enviando ? t("pin.comprobando") : t("pin.entrar")}
          </button>
        </>
      )}
    </div>
  );
}

// --- Paso 2: elegir el partido pendiente -----------------------------------

function SelectorPartidoPendiente({ token, entidadTipo, entidadId, onElegido, onSalir }) {
  const [pendientes, setPendientes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // entidadTipo/entidadId son opcionales (ver AccesoHerramienta): la
    // entrada pública nueva /partidas, sin torneo/liga concretos, no los
    // pasa, y entonces trae TODOS los pendientes del jugador (torneo, liga y
    // amistosos juntos) — ver plan "partido-amistoso-remoto" guardado en el
    // proyecto.
    const params = new URLSearchParams();
    if (entidadTipo) params.set("entidadTipo", entidadTipo);
    if (entidadId) params.set("entidadId", entidadId);
    const query = params.toString();
    apiFetch(`/api/partidas-herramienta/pendientes${query ? `?${query}` : ""}`, { token })
      .then(setPendientes)
      .catch((err) => setError(err.message || "No se han podido cargar tus partidos."));
  }, [token, entidadTipo, entidadId]);

  return (
    <div className="admin-form" style={{ maxWidth: 460 }}>
      <p className="chronicle-status" style={{ margin: 0 }}>Elige el partido que vas a jugar:</p>
      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      {pendientes && pendientes.length === 0 && (
        <p className="chronicle-status">No tienes ningún partido pendiente aquí con la herramienta activada.</p>
      )}
      {pendientes && pendientes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {pendientes.map((p) => (
            <button key={p.partidoId || p.partidaHerramientaId} type="button" className="admin-tab" style={{ textAlign: "left" }} onClick={() => onElegido(p)}>
              {p.etiquetaPropia} vs {p.etiquetaRival}
              <br />
              <small>
                {p.tipo === "amistosa"
                  ? "Amistoso"
                  : p.tipo === "jornada"
                  ? `Jornada ${p.jornada}`
                  : p.rama === "final"
                  ? "Final"
                  : `Ronda ${p.ronda}`}{" "}
                ·{" "}
                {p.juegoConfigurado === "ambos" ? "501 o Cricket" : p.juegoConfigurado} · al mejor de {p.alMejorDe}
              </small>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="admin-link-btn" onClick={onSalir}>
        ← Salir
      </button>
    </div>
  );
}

function SelectorJuegoAmbos({ onElegido, onSalir }) {
  return (
    <div className="admin-form" style={{ maxWidth: 380 }}>
      <p className="chronicle-status" style={{ margin: 0 }}>¿A qué vais a jugar este partido?</p>
      <div className="live-tournament-toggle">
        <button type="button" onClick={() => onElegido("501")}>501</button>
        <button type="button" onClick={() => onElegido("cricket")}>Cricket</button>
      </div>
      <button type="button" className="admin-link-btn" onClick={onSalir}>
        ← Salir
      </button>
    </div>
  );
}

// --- Construcción de unidades a partir de la PartidaHerramienta ------------
//
// construirUnidadesPartida y el resto de ayudas de lados (2 o más, orden de
// tiro) viven en ladosPartida.js, compartido con DirectoPartida.jsx.

// Jugador al que le toca tirar en una unidad (en parejas, el integrante que
// toque dentro del lado).
function idJugadorTirador(partida, unidad) {
  const lado = ladosDe(partida)[unidad.ladoIdx ?? 0];
  return lado?.jugadoresId[unidad.siguienteIntegranteIdx];
}

// --- Sincronización remota -------------------------------------------------
//
// Partida remota: cada lado juega desde su dispositivo (plan
// "partido-amistoso-remoto" guardado en el proyecto), cuando en la sala de
// espera todos los lados pulsan "Inicio" cada uno desde el suyo (modoJuego
// "remoto"). Cualquier partida — torneo, liga o amistoso — se puede jugar
// también en local, todos en un dispositivo (modoJuego "local"; 2026-10-30).
// Amistosos de antes de existir modoJuego: remotos, como entonces.
function esPartidaRemota(partida) {
  return partida.modoJuego ? partida.modoJuego === "remoto" : !!partida.amistosa;
}

// Sala completada: cada lado tiene al menos un jugador que ha pulsado
// "Inicio" (en parejas basta con uno, ver POST /:id/listo en el backend).
function ladosListos(partida) {
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
    if (!activo) return;
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
        tiradas: tiradasVisita.map((t) => t.resultado.etiqueta),
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
  return (
    <div className="marcador-tablero-entrada">
      <p className="chronicle-status">
        Tira <strong>{tirador}</strong>…
      </p>
      <p className="marcador-tiradas-visita">
        Su visita: {tiradasRival.length ? tiradasRival.join(", ") : "—"}
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

function MarcadorPartida501({ partida, token, miJugadorId, esRemota, onActualizada, onSalir, camarasRival }) {
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
      nuevoMensaje = `No cuenta: falta abrir a ${etiquetaModalidad(partida.apertura).toLowerCase()}.`;
    } else {
      const abreEsteDardo = !yaAbierto;
      const nuevoRestante = unidad.restante - resultado.valor;
      if (nuevoRestante < 0 || nuevoRestante === 1) {
        bust = true;
        nuevoMensaje = `Bust: la tirada no cuenta, sigue con ${restanteInicioVisita}.`;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
      } else if (nuevoRestante === 0) {
        if (cumpleModalidad(resultado, partida.cierre)) {
          gana = true;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
        } else {
          bust = true;
          nuevoMensaje = `Bust: llegas a 0 pero ese dardo no vale para cerrar (hace falta ${etiquetaModalidad(partida.cierre).toLowerCase()}).`;
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
      const puntosVisita = nuevasTiradas.reduce((s, t) => s + t.resultado.valor, 0);
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
      const puntosVisita = nuevasTiradas.reduce((s, t) => s + t.resultado.valor, 0);
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
      setMensaje("La puntuación de una visita tiene que estar entre 0 y 180.");
      return;
    }
    const unidad = unidades[turnoIdx];
    if (!unidad.abierto && partida.apertura !== "simple") {
      setMensaje(
        `Con este modo no se puede abrir a ${etiquetaModalidad(partida.apertura).toLowerCase()}: usa la diana o el teclado de números para el dardo de apertura.`
      );
      return;
    }
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas, ultimaVisitaLado })]);

    const resultado = { etiqueta: `${valorTotal} (visita)`, numero: null, multiplicador: null, valor: valorTotal, esDoble: false, esTriple: false, esBull: false };
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
      nuevoMensaje = `Bust: la visita no cuenta, sigue con ${restanteInicioVisita}.`;
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

  useEffect(() => {
    if (ganadorIdx === null || fase !== "jugando") return;
    setFase("enviando");
    apiFetch(`/api/partidas-herramienta/${partida.id}/legs`, {
      token,
      method: "POST",
      body: JSON.stringify({ ladoGanador: ladoDeUnidad(unidades[ganadorIdx], ganadorIdx) + 1, estadisticas }),
    })
      .then((actualizada) => {
        onActualizada(actualizada);
      })
      .catch((err) => {
        setErrorEnvio(err.message || "No se ha podido guardar el resultado del leg.");
        setFase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx]);

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
                  dardoInfo={activo && modoEntrada !== "total" ? `Dardo ${Math.min(tiradasVisita.length + 1, 3)} de 3` : null}
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
            <div className="live-tournament-toggle">
              <button type="button" className={modoEntrada === "total" ? "active" : ""} onClick={() => setModoEntrada("total")}>Puntuación total</button>
              <button type="button" className={modoEntrada === "numeros" ? "active" : ""} onClick={() => setModoEntrada("numeros")}>Números</button>
              <button type="button" className={modoEntrada === "diana" ? "active" : ""} onClick={() => setModoEntrada("diana")}>Diana</button>
            </div>
            {modoEntrada === "diana" && <Diana onTirada={tirar} marcas={tiradasVisita.map((t) => t.pos).filter(Boolean)} deshabilitada={finVisita || !!preguntaDoble} />}
            {modoEntrada === "numeros" && <TecladoNumeros onTirada={tirar} deshabilitada={finVisita || !!preguntaDoble} />}
            {modoEntrada === "total" && <TecladoPuntuacion onEnviar={tirarVisitaTotal} deshabilitada={finVisita || !!preguntaDoble} />}
            <p className="marcador-tiradas-visita">
              Esta visita: {tiradasVisita.length ? tiradasVisita.map((t) => t.resultado.etiqueta).join(", ") : "—"}
            </p>
            {sugerencia && <p className="admin-msg admin-msg-ok">Sugerencia de cierre: {sugerencia.join(" → ")}</p>}
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
                    {finVisita ? "Siguiente jugador →" : "Terminar turno ahora"}
                  </button>
                )}
                <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
                  Deshacer {modoEntrada === "total" ? "última visita" : "último dardo"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {fase === "enviando" && <p className="chronicle-status">Guardando el resultado del leg…</p>}
      {fase === "error" && (
        <>
          <p className="admin-msg admin-msg-error">{errorEnvio}</p>
          <button type="button" onClick={() => setFase("jugando")}>Reintentar</button>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        ← Salir de la herramienta
      </button>
    </div>
  );
}

// --- Marcador Cricket --------------------------------------------------

function nuevaLegCricket(partida, numeroLeg) {
  const base = construirUnidadesPartida(partida).map((u) => ({ ...u, marcas: marcasVacias() }));
  return { unidades: base, turnoIdx: (numeroLeg - 1) % base.length };
}

function MarcadorPartidaCricket({ partida, token, miJugadorId, esRemota, onActualizada, onSalir, camarasRival }) {
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
      nuevoMensaje = resultado.etiqueta === "Fuera" ? "Fuera de la diana, no cuenta." : `${resultado.etiqueta}: no juega en cricket, sin efecto.`;
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

  useEffect(() => {
    if (ganadorIdx === null || fase !== "jugando") return;
    setFase("enviando");
    apiFetch(`/api/partidas-herramienta/${partida.id}/legs`, {
      token,
      method: "POST",
      body: JSON.stringify({ ladoGanador: ladoDeUnidad(unidades[ganadorIdx], ganadorIdx) + 1, estadisticas }),
    })
      .then((actualizada) => onActualizada(actualizada))
      .catch((err) => {
        setErrorEnvio(err.message || "No se ha podido guardar el resultado del leg.");
        setFase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx]);

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
                  dardoInfo={activo ? `Dardo ${Math.min(tiradasVisita.length + 1, 3)} de 3` : null}
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
            <div className="live-tournament-toggle" style={{ marginTop: "1rem" }}>
              <button type="button" className={modoEntrada === "numeros" ? "active" : ""} onClick={() => setModoEntrada("numeros")}>Números</button>
              <button type="button" className={modoEntrada === "diana" ? "active" : ""} onClick={() => setModoEntrada("diana")}>Diana</button>
            </div>
            {modoEntrada === "diana" ? (
              <Diana onTirada={tirar} marcas={tiradasVisita.map((t) => t.pos).filter(Boolean)} deshabilitada={finVisita} />
            ) : (
              <TecladoNumeros onTirada={tirar} deshabilitada={finVisita} />
            )}
            <p className="marcador-tiradas-visita">
              Esta visita: {tiradasVisita.length ? tiradasVisita.map((t) => t.resultado.etiqueta).join(", ") : "—"}
            </p>
            {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
            <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
              <button
                type="button"
                className={finVisita ? "admin-link-btn marcador-boton-destacado" : "admin-link-btn"}
                onClick={() => finalizarVisita(unidades, turnoIdx)}
              >
                {finVisita ? "Siguiente jugador →" : "Terminar turno ahora"}
              </button>
              <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
                Deshacer último dardo
              </button>
            </div>
          </div>
        )}
      </div>

      {fase === "enviando" && <p className="chronicle-status">Guardando el resultado del leg…</p>}
      {fase === "error" && (
        <>
          <p className="admin-msg admin-msg-error">{errorEnvio}</p>
          <button type="button" onClick={() => setFase("jugando")}>Reintentar</button>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        ← Salir de la herramienta
      </button>
    </div>
  );
}

// --- Sala de espera ---------------------------------------------------------

// Antes de empezar: cada uno activa y revisa sus cámaras (una o dos), ve las
// del rival (en cuanto ha dado su "Todo correcto"), se saludan, y cuando los
// dos lados pulsan "Inicio" aparece el marcador, cada uno en su dispositivo.
// Las cámaras siguen conectadas de la sala al partido (CamarasPartida vive
// fuera, ver PartidaCompleta).
//
// En torneo/liga (pedido de Iraitz, 2026-10-30) además se puede empezar con
// los dos lados en este mismo dispositivo, como se jugaba antes.
function SalaEspera({ partida, token, miJugadorId, camarasRival, miRevisada, onActualizada, onJugarAqui }) {
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const listos = partida.listosInicio || [];
  const yoListo = listos.includes(miJugadorId);
  const lados = ladosDe(partida);
  const miLadoIdx = ladoIdxDe(partida, miJugadorId);
  const orden = ordenTiroDe(partida);
  const varios = lados.length > 2;

  async function enviar(ruta, cuerpo, errorPorDefecto) {
    setEnviando(true);
    setError("");
    try {
      const data = await apiFetch(`/api/partidas-herramienta/${partida.id}/${ruta}`, {
        token,
        method: "POST",
        body: JSON.stringify(cuerpo),
      });
      if (cuerpo.local) onJugarAqui();
      onActualizada(data);
    } catch (err) {
      setError(err.message || errorPorDefecto);
    } finally {
      setEnviando(false);
    }
  }

  // Orden de tiro (pedido de Iraitz, 2026-10-30): cualquiera de los
  // participantes lo puede cambiar mientras el partido no ha empezado.
  function mover(pos, delta) {
    const nuevo = [...orden];
    [nuevo[pos], nuevo[pos + delta]] = [nuevo[pos + delta], nuevo[pos]];
    enviar("orden", { orden: nuevo }, "No se ha podido cambiar el orden.");
  }

  return (
    <div className="admin-form" style={{ maxWidth: 460 }}>
      <h3 style={{ marginTop: 0 }}>Sala de espera</h3>
      <p className="chronicle-status" style={{ margin: 0 }}>
        {lados.map((l) => l.etiqueta).join(" vs ")} · al mejor de {partida.alMejorDe}
      </p>
      {miRevisada ? (
        camarasRival
      ) : (
        <p className="chronicle-status">
          Si jugáis cada uno desde su dispositivo, activa tus cámaras (con una basta) y pulsa «Todo correcto» para ver
          las de {varios ? "los demás" : "tu rival"} y saludaros. (Si no vas a usar cámaras, puedes pulsar Inicio igualmente.)
        </p>
      )}

      <div>
        <p className="chronicle-status" style={{ margin: ".4rem 0 .3rem" }}>
          Orden de tiro (el primero empieza el leg 1, el segundo el leg 2…):
        </p>
        <ol className="sala-orden-tiro">
          {orden.map((ladoIdx, pos) => {
            const lado = lados[ladoIdx];
            const listo = lado.jugadoresId.some((id) => listos.includes(id));
            return (
              <li key={ladoIdx}>
                <span className="sala-orden-tiro-nombre">
                  {pos + 1}. {lado.etiqueta}
                  {ladoIdx === miLadoIdx ? " (tú)" : ""}
                </span>
                <span className="sala-orden-tiro-estado" title={listo ? "Ha pulsado Inicio" : "Todavía no ha pulsado Inicio"}>
                  {listo ? "✅" : "⏳"}
                </span>
                <button type="button" className="admin-link-btn" disabled={enviando || pos === 0} onClick={() => mover(pos, -1)} aria-label={`Subir a ${lado.etiqueta}`}>
                  ↑
                </button>
                <button type="button" className="admin-link-btn" disabled={enviando || pos === orden.length - 1} onClick={() => mover(pos, 1)} aria-label={`Bajar a ${lado.etiqueta}`}>
                  ↓
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      <button type="button" disabled={enviando} onClick={() => enviar("listo", { listo: !yoListo }, "No se ha podido marcar tu Inicio.")}>
        {yoListo ? "Cancelar (aún no estoy listo)" : "▶ Inicio (cada uno en su dispositivo)"}
      </button>
      {yoListo && (
        <p className="chronicle-status">
          Esperando a que {varios ? "los demás pulsen" : "tu rival pulse"} Inicio en su dispositivo…
        </p>
      )}
      {!yoListo && (
        <>
          <p className="chronicle-status" style={{ margin: ".8rem 0 0" }}>
            ¿Jugáis {varios ? "todos" : "los dos"} en este dispositivo, junto a la diana?
          </p>
          <button type="button" className="admin-link-btn" disabled={enviando} onClick={() => enviar("listo", { local: true }, "No se ha podido empezar el partido.")}>
            {varios ? "Jugamos todos aquí →" : "Jugamos los dos aquí →"}
          </button>
        </>
      )}
    </div>
  );
}

// --- Envoltorio: partida completa (varios legs hasta terminar) ------------

// Dispositivo en el que se ha elegido "Jugamos aquí" (modo local): se
// recuerda por partida para que, si otro jugador entra desde el suyo, no se
// ponga a jugar en paralelo un segundo marcador.
const CLAVE_LOCAL = "herramientaPartidaLocal:";
function esDispositivoLocal(partidaId) {
  try { return localStorage.getItem(CLAVE_LOCAL + partidaId) === "1"; } catch { return false; }
}
function marcarDispositivoLocal(partidaId) {
  try { localStorage.setItem(CLAVE_LOCAL + partidaId, "1"); } catch { /* almacenamiento no disponible */ }
}

function PartidaCompleta({ partida, token, miJugadorId, onSalir }) {
  const [partidaActual, setPartidaActual] = useState(partida);
  const [rivales, setRivales] = useState({});
  const [miRevisada, setMiRevisada] = useState(false);
  const [localAqui, setLocalAqui] = useState(() => esDispositivoLocal(partida.id));
  // Sala de espera previa: hasta que cada lado pulsa "Inicio" (o se elige
  // jugar todos en un dispositivo) no aparece el marcador. Partidas de
  // torneo/liga ya empezadas antes de existir la sala (con legs jugados y sin
  // modoJuego) siguen en local, como entonces.
  const sinEmpezar = !partidaActual.finalizada && (partidaActual.legs || []).length === 0;
  const enSala = sinEmpezar && !partidaActual.modoJuego && !(partidaActual.amistosa && ladosListos(partidaActual));
  const esRemota = esPartidaRemota(partidaActual);
  // Otro jugador ha elegido "Jugamos aquí" en SU dispositivo: este no debe
  // llevar otro marcador a la vez.
  const localEnOtro = partidaActual.modoJuego === "local" && !localAqui;
  useEffect(() => {
    if (!enSala) return undefined;
    const intervalo = setInterval(async () => {
      try {
        const data = await apiFetch(`/api/partidas-herramienta/${partidaActual.id}`, { token });
        setPartidaActual((p) =>
          JSON.stringify([p.listosInicio, p.modoJuego, p.ordenLados]) === JSON.stringify([data.listosInicio, data.modoJuego, data.ordenLados]) ? p : data
        );
      } catch { /* se reintenta en el siguiente sondeo */ }
    }, 2500);
    return () => clearInterval(intervalo);
  }, [enSala, partidaActual.id, token]);
  function alCambiarRival(id, datos) {
    setRivales((r) => {
      if (datos) return { ...r, [id]: datos };
      const { [id]: _quitado, ...resto } = r;
      return resto;
    });
  }
  function jugarAqui() {
    marcarDispositivoLocal(partidaActual.id);
    setLocalAqui(true);
  }

  if (partidaActual.finalizada) {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          🏆 Partido terminado:{" "}
          {ladosDe(partidaActual)
            .map((l, i) => `${l.etiqueta} ${legsGanadosDe(partidaActual)[i]}`)
            .join(" — ")}
        </p>
        <p className="chronicle-status">El resultado ya se ha aplicado al partido.</p>
        <button type="button" onClick={onSalir}>Volver a mis partidos</button>
      </div>
    );
  }

  if (localEnOtro) {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <p className="chronicle-status" style={{ margin: 0 }}>
          Este partido se está jugando con todos los jugadores en otro dispositivo. Sigue allí el marcador (o en el
          directo de la página de la liga/torneo).
        </p>
        <button type="button" className="admin-link-btn" onClick={jugarAqui}>
          Continuar en este dispositivo igualmente
        </button>
        <button type="button" className="admin-link-btn" onClick={onSalir}>
          ← Volver a mis partidos
        </button>
      </div>
    );
  }

  // CamarasPartida vive FUERA del marcador con key=legs.length (más abajo):
  // así la emisión/recepción WebRTC no se corta ni se reconecta entre legs,
  // solo cuando el partido entero empieza o termina — ver CamarasPartida.jsx
  // (plan "camaras-partidas", guardado en el proyecto).
  // id de jugador -> nombre, para rotular las cámaras del rival.
  const nombresPorId = {};
  ladosDe(partidaActual).forEach((lado) => {
    lado.jugadoresId.forEach((id, i) => {
      nombresPorId[id] = lado.nombres[i] || lado.etiqueta;
    });
  });
  // Rivales de los que interesa el estado de sus cámaras: los de los otros
  // lados, en la sala y en partida remota (en local están delante, en este
  // mismo dispositivo).
  const miLadoIdx = ladoIdxDe(partidaActual, miJugadorId);
  const idsRivales = ladosDe(partidaActual).flatMap((l, i) => (i === miLadoIdx ? [] : l.jugadoresId));
  // Streams de las cámaras del rival (los guarda aquí, fuera del marcador, para
  // que sobrevivan al remontaje de cada leg) y se pintan en el hueco del
  // teclado cuando le toca tirar al rival.
  const camaras = <CamarasPartida partidaId={partidaActual.id} token={token} miJugadorId={miJugadorId} onRivalEstado={alCambiarRival} onMiRevisada={setMiRevisada} rivalIds={enSala || esRemota ? idsRivales : []} nombresPorId={nombresPorId} />;
  const camarasRival = <CamarasRival rivales={rivales} nombresPorId={nombresPorId} />;

  if (enSala) {
    return (
      <>
        {camaras}
        <SalaEspera
          partida={partidaActual}
          token={token}
          miJugadorId={miJugadorId}
          camarasRival={camarasRival}
          miRevisada={miRevisada}
          onActualizada={setPartidaActual}
          onJugarAqui={jugarAqui}
        />
      </>
    );
  }

  // key=legs.length fuerza que el marcador se remonte entero al empezar cada
  // leg nuevo (nuevas unidades a 501/marcas vacías, turno según toque) — si
  // no, el estado interno (unidades, turno, historial…) del leg anterior se
  // quedaría colgado al recibir la partida actualizada del backend.
  const Marcador = partidaActual.juego === "cricket" ? MarcadorPartidaCricket : MarcadorPartida501;
  return (
    <>
      {camaras}
      <Marcador
        key={partidaActual.legs.length}
        partida={partidaActual}
        token={token}
        miJugadorId={miJugadorId}
        esRemota={esRemota}
        onActualizada={setPartidaActual}
        onSalir={onSalir}
        camarasRival={camarasRival}
      />
    </>
  );
}

// --- Componente principal ---------------------------------------------------

export const CLAVE_TOKEN = "herramientaPartidasToken";
export const CLAVE_JUGADOR = "herramientaPartidasJugador";

export default function AccesoHerramienta({ activa, entidadTipo, entidadId, entidadNombre, autoAbrir, partidaIdDirecta }) {
  const [mostrar, setMostrar] = useState(!!autoAbrir || !!partidaIdDirecta);
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; }
  });
  const [jugador, setJugador] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_JUGADOR) || "null"); } catch { return null; }
  });
  const [pendienteElegido, setPendienteElegido] = useState(null);
  const [partida, setPartida] = useState(null);
  const [errorIniciar, setErrorIniciar] = useState("");

  function salirDeSesion() {
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem(CLAVE_JUGADOR);
    } catch { /* almacenamiento no disponible, no pasa nada */ }
    setToken("");
    setJugador(null);
    setPendienteElegido(null);
    setPartida(null);
  }

  function alEntrar({ token: nuevoToken, jugador: nuevoJugador }) {
    try {
      sessionStorage.setItem(CLAVE_TOKEN, nuevoToken);
      sessionStorage.setItem(CLAVE_JUGADOR, JSON.stringify(nuevoJugador));
    } catch { /* almacenamiento no disponible, se queda solo en memoria */ }
    setToken(nuevoToken);
    setJugador(nuevoJugador);
  }

  // Los amistosos (plan "partido-amistoso-remoto", guardado en el proyecto)
  // no pasan por /iniciar: la PartidaHerramienta ya existe entera desde que
  // se creó (POST /amistosa, en la Zona de miembros), así que aquí solo hace
  // falta pedirla por su id. También se usa para el enlace directo del aviso
  // de "te han retado" (partidaIdDirecta, ver más abajo).
  async function abrirPartidaPorId(id) {
    setErrorIniciar("");
    try {
      const data = await apiFetch(`/api/partidas-herramienta/${id}`, { token });
      setPartida(data);
    } catch (err) {
      if (err.status === 401) {
        salirDeSesion();
        return;
      }
      setErrorIniciar(err.message || "No se ha podido abrir el partido.");
    }
  }

  function abrirAmistoso(pendiente) {
    abrirPartidaPorId(pendiente.partidaHerramientaId);
  }

  // Enlace directo del aviso de "te han retado a un amistoso" (?partida=id en
  // /partidas, ver PaginaPartidas.jsx): en cuanto hay sesión (PIN metido), se
  // abre esa partida sola, sin pasar por la lista de pendientes.
  useEffect(() => {
    if (token && partidaIdDirecta && !partida) {
      abrirPartidaPorId(partidaIdDirecta);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, partidaIdDirecta]);

  async function iniciarPartido(pendiente, juegoElegido) {
    setErrorIniciar("");
    try {
      const data = await apiFetch("/api/partidas-herramienta/iniciar", {
        token,
        method: "POST",
        body: JSON.stringify({ tipo: pendiente.tipo, partidoId: pendiente.partidoId, juegoElegido }),
      });
      setPartida(data);
    } catch (err) {
      if (err.status === 401) {
        salirDeSesion();
        return;
      }
      setErrorIniciar(err.message || "No se ha podido empezar la partida.");
      setPendienteElegido(null);
    }
  }

  if (!activa) return null;

  if (!mostrar) {
    return (
      <div style={{ marginTop: "1.5rem" }}>
        <button type="button" className="vikingscounter-btn" onClick={() => setMostrar(true)}>
          <span className="vikingscounter-btn-icon" aria-hidden="true">🎯</span>
          <span className="vikingscounter-btn-label">
            <span className="vikingscounter-btn-text">{CLUB.nombreMarcador}</span>
            <span className="vikingscounter-btn-sub">Jugar con el marcador</span>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="marcador-herramienta-publica" style={{ marginTop: "1.5rem", border: "1px solid var(--line)", padding: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>{CLUB.nombreMarcador} — {entidadNombre}</h3>

      {!token && <LoginPin onEntrar={alEntrar} />}

      {token && !partida && (
        <>
          <p className="chronicle-status">
            Sesión: <strong>{jugador?.nombre}</strong>{" "}
            <button type="button" className="admin-link-btn" onClick={salirDeSesion}>(cambiar de jugador)</button>
          </p>
          {errorIniciar && <p className="admin-msg admin-msg-error">{errorIniciar}</p>}
          {!pendienteElegido && (
            <SelectorPartidoPendiente
              token={token}
              entidadTipo={entidadTipo}
              entidadId={entidadId}
              onElegido={(p) => {
                if (p.tipo === "amistosa") {
                  abrirAmistoso(p);
                } else if (p.juegoConfigurado === "ambos") {
                  setPendienteElegido(p);
                } else {
                  iniciarPartido(p);
                }
              }}
              onSalir={() => setMostrar(false)}
            />
          )}
          {pendienteElegido && (
            <SelectorJuegoAmbos
              onElegido={(juego) => iniciarPartido(pendienteElegido, juego)}
              onSalir={() => setPendienteElegido(null)}
            />
          )}
        </>
      )}

      {token && partida && (
        <PartidaCompleta
          partida={partida}
          token={token}
          miJugadorId={jugador?.id}
          onSalir={() => {
            setPartida(null);
            setPendienteElegido(null);
          }}
        />
      )}
    </div>
  );
}
