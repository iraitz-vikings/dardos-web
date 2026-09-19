import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiHerramienta.js";

// Cámaras en directo durante un partido (plan "camaras-partidas", guardado en
// el proyecto): un dispositivo con dos cámaras (una a la diana, otra al
// lanzador — la más habitual se llama "Virt Camera Target") se puede activar
// al jugar con la herramienta, y se retransmite por WebRTC — sin servidor de
// medios ni TURN de pago, solo STUN público, ver más abajo — a quien esté
// viendo el partido: el rival en un amistoso remoto (el caso importante,
// pedido por Iraitz), o espectadores de la página pública (secundario, no
// construido todavía — este componente solo cubre "emisor ↔ un espectador").
//
// Prioridad de Iraitz (2026-09-18): lo importante es que lo vean LOS
// JUGADORES. En torneo/liga (dispositivo compartido junto a la diana) eso ya
// queda cubierto con la vista previa local de este mismo componente — ni
// siquiera hace falta señalización, los dos jugadores están delante del
// mismo dispositivo. En amistoso remoto (cada uno en el suyo) es donde
// realmente hace falta la retransmisión.
//
// Sin TURN: solo servidores STUN públicos y gratuitos para que cada lado
// descubra su IP pública. Cubre la gran mayoría de redes domésticas/4G, pero
// alguna red muy restrictiva (NAT simétrico, ciertas redes corporativas)
// puede no conseguir conectar — sin presupuesto para TURN no hay forma de
// salvar ese caso siempre, así que si falla se muestra "cámara no
// disponible" y el marcador sigue funcionando igual.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

const CLAVE_DIANA = "camarasPartida.dianaId";
const CLAVE_LANZADOR = "camarasPartida.lanzadorId";

function adivinarCamara(dispositivos, patrones) {
  return dispositivos.find((d) => patrones.some((p) => (d.label || "").toLowerCase().includes(p)));
}

function pararStream(stream) {
  stream?.getTracks().forEach((t) => t.stop());
}

// Amplía un <video> a pantalla completa al tocarlo — no hay más interacción
// que esta (las miniaturas van "las dos a la vez, en pequeño", decisión de
// Iraitz 2026-09-18).
function VideoCamara({ videoRef, etiqueta }) {
  return (
    <div className="camaras-partida-video-caja" onClick={() => videoRef.current?.requestFullscreen?.().catch(() => {})}>
      <video ref={videoRef} className="camaras-partida-video" autoPlay playsInline muted />
      <span className="camaras-partida-video-etiqueta">{etiqueta}</span>
    </div>
  );
}

// --- Lado emisor: quien tiene el dispositivo con las dos cámaras ----------

function SelectorCamaras({ partidaId, token }) {
  const [abierto, setAbierto] = useState(false);
  const [dispositivos, setDispositivos] = useState([]);
  const [dianaId, setDianaId] = useState(() => {
    try { return localStorage.getItem(CLAVE_DIANA) || ""; } catch { return ""; }
  });
  const [lanzadorId, setLanzadorId] = useState(() => {
    try { return localStorage.getItem(CLAVE_LANZADOR) || ""; } catch { return ""; }
  });
  const [activa, setActiva] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const streamsRef = useRef({ diana: null, lanzador: null });
  const videoDianaRef = useRef(null);
  const videoLanzadorRef = useRef(null);
  // viewerId -> { pc, iceGenerados: [], iceGeneradosEnviados, iceReceptorAplicados }
  const conexionesRef = useRef(new Map());

  // Pide permiso de cámara una vez para que enumerateDevices() devuelva las
  // etiquetas (sin permiso concedido, los labels llegan vacíos) y adivina
  // cuál es cuál por nombre — cubre "Virt Camera Target" sin que Iraitz
  // tenga que elegirla a mano cada vez.
  useEffect(() => {
    if (!abierto) return undefined;
    let cancelado = false;
    (async () => {
      try {
        const previo = await navigator.mediaDevices.getUserMedia({ video: true });
        pararStream(previo);
        const lista = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        if (cancelado) return;
        setDispositivos(lista);
        setDianaId((actual) => actual || adivinarCamara(lista, ["target", "diana"])?.deviceId || "");
        setLanzadorId((actual) => actual || adivinarCamara(lista, ["thrower", "lanzador"])?.deviceId || "");
      } catch {
        if (!cancelado) setError("No se ha podido acceder a la cámara: revisa los permisos del navegador.");
      }
    })();
    return () => { cancelado = true; };
  }, [abierto]);

  function cerrarTodo() {
    for (const { pc } of conexionesRef.current.values()) pc.close();
    conexionesRef.current.clear();
    pararStream(streamsRef.current.diana);
    pararStream(streamsRef.current.lanzador);
    streamsRef.current = { diana: null, lanzador: null };
  }

  async function activar() {
    if (!dianaId || !lanzadorId) {
      setError("Elige las dos cámaras antes de activarlas.");
      return;
    }
    setError("");
    setCargando(true);
    try {
      const [streamDiana, streamLanzador] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: dianaId } } }),
        navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: lanzadorId } } }),
      ]);
      // Orden diana→lanzador consistente con VisorCamaras, que distingue las
      // pistas que le llegan por orden de llegada (WebRTC no manda nombres).
      streamsRef.current = { diana: streamDiana, lanzador: streamLanzador };
      try {
        localStorage.setItem(CLAVE_DIANA, dianaId);
        localStorage.setItem(CLAVE_LANZADOR, lanzadorId);
      } catch { /* almacenamiento no disponible, no pasa nada */ }
      await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/activar`, { token, method: "POST" });
      setActiva(true);
    } catch {
      cerrarTodo();
      setError("No se han podido activar las dos cámaras.");
    } finally {
      setCargando(false);
    }
  }

  async function desactivar() {
    cerrarTodo();
    setActiva(false);
    try {
      await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/desactivar`, { token, method: "POST" });
    } catch { /* best-effort: si falla, el propio backend la dará por caducada */ }
  }

  // Los <video> de la vista local solo existen mientras activa=true, así que
  // el stream se engancha aquí, ya con los elementos montados (antes se
  // asignaba dentro de activar(), cuando los refs todavía eran null, y las
  // miniaturas propias se quedaban en negro).
  useEffect(() => {
    if (!activa) return;
    for (const [ref, stream] of [[videoDianaRef, streamsRef.current.diana], [videoLanzadorRef, streamsRef.current.lanzador]]) {
      if (ref.current && stream) {
        ref.current.srcObject = stream;
        ref.current.play?.().catch(() => {});
      }
    }
  }, [activa]);

  // Si se sale de la pantalla (o se cambia de partido) con las cámaras
  // encendidas, se apagan solas — no debe quedar una emisión huérfana. Un
  // cierre brusco de la pestaña (sin pasar por aquí) sí puede dejar
  // camarasActivas=true sin nadie emitiendo de verdad: quien vuelva a entrar
  // puede reclamar el rol pulsando "Activar mis cámaras" otra vez (ver
  // apartado de recuperación en VisorCamaras/CamarasPartida más abajo).
  useEffect(() => {
    return () => {
      if (activa) {
        cerrarTodo();
        apiFetch(`/api/partidas-herramienta/${partidaId}/camara/desactivar`, { token, method: "POST" }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa]);

  // Atiende espectadores: crea una RTCPeerConnection y les manda oferta en
  // cuanto se registran, aplica su respuesta y va intercambiando candidatos
  // ICE — todo por polling cada 2.5s, igual que el resto de la herramienta
  // (sin websockets).
  useEffect(() => {
    if (!activa) return undefined;
    const intervalo = setInterval(async () => {
      let viewers;
      try {
        ({ viewers } = await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/senal`, { token }));
      } catch {
        return;
      }
      for (const [viewerId, info] of Object.entries(viewers || {})) {
        let entrada = conexionesRef.current.get(viewerId);

        if (!entrada && info.estado === "esperando") {
          const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
          entrada = { pc, iceGenerados: [], iceGeneradosEnviados: 0, iceReceptorAplicados: 0 };
          conexionesRef.current.set(viewerId, entrada);
          pc.onicecandidate = (e) => {
            if (e.candidate) entrada.iceGenerados.push(e.candidate.toJSON());
          };
          if (streamsRef.current.diana) streamsRef.current.diana.getTracks().forEach((t) => pc.addTrack(t, streamsRef.current.diana));
          if (streamsRef.current.lanzador) streamsRef.current.lanzador.getTracks().forEach((t) => pc.addTrack(t, streamsRef.current.lanzador));
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/senal`, {
              token,
              method: "PUT",
              body: JSON.stringify({ viewerId, offer: pc.localDescription }),
            });
          } catch {
            pc.close();
            conexionesRef.current.delete(viewerId);
          }
          continue;
        }

        if (!entrada) continue;
        const { pc } = entrada;
        try {
          if (info.answer && pc.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(info.answer);
          }
          const nuevosIce = (info.iceReceptor || []).slice(entrada.iceReceptorAplicados);
          for (const c of nuevosIce) await pc.addIceCandidate(c);
          entrada.iceReceptorAplicados = (info.iceReceptor || []).length;

          if (entrada.iceGenerados.length > entrada.iceGeneradosEnviados) {
            const pendientes = entrada.iceGenerados.slice(entrada.iceGeneradosEnviados);
            entrada.iceGeneradosEnviados = entrada.iceGenerados.length;
            await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/senal`, {
              token,
              method: "PUT",
              body: JSON.stringify({ viewerId, iceEmisor: pendientes }),
            });
          }
        } catch {
          // Best-effort: si un intercambio puntual falla, se reintenta en el
          // siguiente sondeo — no se cierra la conexión por un fallo suelto.
        }
      }
    }, 2500);
    return () => clearInterval(intervalo);
  }, [activa, partidaId, token]);

  // Ya no se pide permiso de cámara nada más entrar: este bloque está siempre
  // presente (a la vez que las cámaras del rival), y quien solo quiere ver no
  // tiene por qué recibir el aviso del navegador.
  if (!abierto && !activa) {
    return (
      <div className="camaras-partida">
        <button type="button" onClick={() => setAbierto(true)}>🎥 Usar mis cámaras</button>
      </div>
    );
  }

  return (
    <div className="camaras-partida">
      {!activa && (
        <div className="camaras-partida-selector">
          <label>
            Cámara diana
            <select value={dianaId} onChange={(e) => setDianaId(e.target.value)}>
              <option value="">— elige una cámara —</option>
              {dispositivos.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || "Cámara sin nombre"}</option>
              ))}
            </select>
          </label>
          <label>
            Cámara lanzador
            <select value={lanzadorId} onChange={(e) => setLanzadorId(e.target.value)}>
              <option value="">— elige una cámara —</option>
              {dispositivos.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || "Cámara sin nombre"}</option>
              ))}
            </select>
          </label>
          {error && <p className="admin-msg admin-msg-error">{error}</p>}
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={activar} disabled={cargando}>
              {cargando ? "Activando…" : "🎥 Activar mis cámaras"}
            </button>
            <button type="button" className="admin-link-btn" onClick={() => setAbierto(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
      {activa && (
        <>
          <div className="camaras-partida-videos">
            <VideoCamara videoRef={videoDianaRef} etiqueta="Diana" />
            <VideoCamara videoRef={videoLanzadorRef} etiqueta="Lanzador" />
          </div>
          <button type="button" className="admin-link-btn" onClick={desactivar}>
            Apagar mis cámaras
          </button>
        </>
      )}
    </div>
  );
}

// --- Lado espectador: rival remoto (o, en el futuro, público) -------------

function VisorCamaras({ partidaId, emisorId, nombre, onCaducado }) {
  const [viewerId, setViewerId] = useState("");
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState("");
  const videoDianaRef = useRef(null);
  const videoLanzadorRef = useRef(null);
  const pcRef = useRef(null);
  const iceEmisorAplicadosRef = useRef(0);
  const iceGeneradosRef = useRef([]);
  const iceGeneradosEnviadosRef = useRef(0);

  useEffect(() => {
    let cancelado = false;
    apiFetch(`/api/partidas-herramienta/${partidaId}/camara/ver`, { method: "POST", body: JSON.stringify({ emisorId }) })
      .then(({ viewerId: id }) => { if (!cancelado) setViewerId(id); })
      .catch(() => { if (!cancelado) setError("No se han podido conectar las cámaras."); });
    return () => { cancelado = true; };
  }, [partidaId, emisorId]);

  useEffect(() => {
    if (!viewerId) return undefined;
    let primerTrackAsignado = false;
    const idsAsignados = new Set();
    const intervalo = setInterval(async () => {
      let data;
      try {
        data = await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/senal/${viewerId}`);
      } catch (err) {
        // 404: el rival ha reiniciado sus cámaras y nuestro registro ya no
        // existe — el padre nos vuelve a montar para registrarnos de nuevo.
        if (err.status === 404) onCaducado?.();
        return;
      }
      if (!data.camarasActivas) return;

      let pc = pcRef.current;
      if (!pc && data.offer) {
        pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;
        pc.ontrack = (e) => {
          // Sin nombres en WebRTC: se asigna por orden de llegada, el mismo
          // orden (diana, luego lanzador) en que el emisor añade sus pistas
          // — ver SelectorCamaras.
          const stream = e.streams[0] || new MediaStream([e.track]);
          if (idsAsignados.has(stream.id)) return;
          idsAsignados.add(stream.id);
          const destino = !primerTrackAsignado ? videoDianaRef.current : videoLanzadorRef.current;
          primerTrackAsignado = true;
          if (destino) {
            destino.srcObject = stream;
            destino.play?.().catch(() => {});
          }
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) iceGeneradosRef.current.push(e.candidate.toJSON());
        };
        try {
          await pc.setRemoteDescription(data.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/senal/${viewerId}`, {
            method: "PUT",
            body: JSON.stringify({ answer: pc.localDescription }),
          });
          setConectado(true);
        } catch {
          setError("No se ha podido conectar con las cámaras del rival.");
          return;
        }
      }

      if (pc) {
        try {
          const nuevosIce = (data.iceEmisor || []).slice(iceEmisorAplicadosRef.current);
          for (const c of nuevosIce) await pc.addIceCandidate(c);
          iceEmisorAplicadosRef.current = (data.iceEmisor || []).length;

          if (iceGeneradosRef.current.length > iceGeneradosEnviadosRef.current) {
            const pendientes = iceGeneradosRef.current.slice(iceGeneradosEnviadosRef.current);
            iceGeneradosEnviadosRef.current = iceGeneradosRef.current.length;
            await apiFetch(`/api/partidas-herramienta/${partidaId}/camara/senal/${viewerId}`, {
              method: "PUT",
              body: JSON.stringify({ iceReceptor: pendientes }),
            });
          }
        } catch {
          // Best-effort, se reintenta en el siguiente sondeo.
        }
      }
    }, 2500);
    return () => clearInterval(intervalo);
  }, [viewerId, partidaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => pcRef.current?.close(), []);

  return (
    <div className="camaras-partida">
      <p className="chronicle-status" style={{ margin: 0 }}>Cámaras de {nombre}</p>
      <div className="camaras-partida-videos">
        <VideoCamara videoRef={videoDianaRef} etiqueta="Diana" />
        <VideoCamara videoRef={videoLanzadorRef} etiqueta="Lanzador" />
      </div>
      {!conectado && !error && <p className="chronicle-status">Conectando con las cámaras…</p>}
      {error && <p className="admin-msg admin-msg-error">{error}</p>}
    </div>
  );
}

// --- Componente principal ---------------------------------------------------

// Sondea si las cámaras están activas cada 4s (más espaciado que el resto de
// la herramienta: es un dato secundario, no hace falta la misma inmediatez
// que el turno de juego) — así el otro lado se entera si el rival enciende
// o apaga las suyas, sin recargar la página.
function useEstadoCamaras(partidaId) {
  const [emisores, setEmisores] = useState([]);
  useEffect(() => {
    let cancelado = false;
    function sondear() {
      apiFetch(`/api/partidas-herramienta/${partidaId}/camara/estado`)
        .then(({ emisores: ids }) => {
          if (cancelado) return;
          const nuevos = ids || [];
          // Solo se actualiza si cambia la lista, para no re-renderizar en cada sondeo.
          setEmisores((actual) => (actual.join(",") === nuevos.join(",") ? actual : nuevos));
        })
        .catch(() => {});
    }
    sondear();
    const intervalo = setInterval(sondear, 4000);
    return () => { cancelado = true; clearInterval(intervalo); };
  }, [partidaId]);
  return emisores;
}

// Punto de entrada montado desde JuegoHerramienta.jsx (PartidaCompleta).
// Emisión en los dos sentidos a la vez (2026-09-19): cada jugador puede tener
// SUS cámaras encendidas (SelectorCamaras) y a la vez ver las del rival (un
// VisorCamaras por cada otro emisor activo) — antes eran excluyentes.
export default function CamarasPartida({ partidaId, token, miJugadorId, nombresPorId = {} }) {
  const emisores = useEstadoCamaras(partidaId);
  const [reintentos, setReintentos] = useState({});
  const ajenos = emisores.filter((id) => id !== miJugadorId);

  return (
    <div className="camaras-partida-doble">
      <SelectorCamaras partidaId={partidaId} token={token} />
      {ajenos.map((id) => (
        <VisorCamaras
          key={`${id}-${reintentos[id] || 0}`}
          partidaId={partidaId}
          emisorId={id}
          nombre={nombresPorId[id] || "tu rival"}
          onCaducado={() => setReintentos((r) => ({ ...r, [id]: (r[id] || 0) + 1 }))}
        />
      ))}
    </div>
  );
}
