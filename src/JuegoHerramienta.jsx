import { useEffect, useMemo, useState } from "react";
import CamarasPartida, { CamarasRival } from "./CamarasPartida.jsx";
import MarcadorPartida, { esPartidaRemota, ladosListos } from "./MarcadorPartida.jsx";
import { apiFetch } from "./apiHerramienta.js";
import { CLUB } from "./club.js";
import { ladoIdxDe, ladosDe, legsGanadosDe, ordenTiroDe } from "./ladosPartida.js";
import { useLang } from "./i18n.jsx";

// Flujo público de juego con la herramienta de marcador, para partidos de
// torneo/liga con la herramienta activada (ver ConfiguracionHerramientaPanel.jsx
// en el admin y el plan "herramienta-marcador-torneos-ligas" guardado en el
// proyecto — Slice 3+4) y amistosos (RetarAmistoso.jsx): identificación por
// PIN, elección del partido, sala de espera (local o remoto, orden de tiro,
// cámaras) y la partida en sí. Aquí los jugadores/reglas vienen del partido
// real y, leg a leg, el resultado se manda al backend — que en cuanto se
// alcanza "al mejor de N" lo aplica solo al partido (ver
// src/routes/partidasHerramienta.js). El marcador en sí (501 y Cricket) es
// el mismo que el de la partida libre: MarcadorPartida.jsx.

// apiFetch/API_URL se extrajeron a apiHerramienta.js (plan "camaras-partidas",
// guardado en el proyecto) para que CamarasPartida.jsx pueda usarlos sin
// depender en círculo de este fichero. Mismo comportamiento de siempre.

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
  const { t } = useLang();
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
  return (
    <>
      {camaras}
      <MarcadorPartida
        key={partidaActual.legs.length}
        partida={partidaActual}
        token={token}
        miJugadorId={miJugadorId}
        esRemota={esRemota}
        onLegTerminado={(ladoIdx, estadisticas) =>
          apiFetch(`/api/partidas-herramienta/${partidaActual.id}/legs`, {
            token,
            method: "POST",
            body: JSON.stringify({ ladoGanador: ladoIdx + 1, estadisticas }),
          })
        }
        onActualizada={setPartidaActual}
        onSalir={onSalir}
        textoSalir={t("marcador.salirHerramienta")}
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
