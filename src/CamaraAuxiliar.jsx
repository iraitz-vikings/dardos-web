import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./apiHerramienta.js";
import { obtenerIceServers, VIDEO_ANCHO, VIDEO_ALTO, VIDEO_FPS } from "./CamarasPartida.jsx";

// Página /camara: el dispositivo AUXILIAR de las cámaras (pedido de Iraitz,
// 2026-10-09). Típicamente un móvil en un trípode mirando a la diana, que se
// abre escaneando el QR que enseña el dispositivo principal (la tablet con
// el marcador, ver useCamaraAuxiliar en CamarasPartida.jsx). Solo abre la
// cámara y la manda al principal por WebRTC; el principal la reenvía al
// rival/público como su cámara de la diana.
//
// El enlace lleva en el fragmento (#p=<partida>&t=<token>, no llega a los
// logs del servidor) un token que solo vale para la señalización de esta
// cámara auxiliar — nunca el PIN del jugador.
//
// Sin i18n a propósito, igual que el resto de la herramienta de marcador.

// El vídeo va al principal por la red local casi siempre: algo más de
// bitrate que hacia el rival, que el principal vuelve a codificar después.
const BITRATE_AUXILIAR = 1_500_000;

function leerEnlace() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return { partidaId: params.get("p") || "", token: params.get("t") || "" };
}

function restricciones(camara) {
  return {
    audio: false,
    video: {
      facingMode: { ideal: camara },
      width: { ideal: VIDEO_ANCHO },
      height: { ideal: VIDEO_ALTO },
      frameRate: { ideal: VIDEO_FPS },
    },
  };
}

export default function CamaraAuxiliar() {
  const [{ partidaId, token }] = useState(leerEnlace);
  const [camara, setCamara] = useState("environment"); // trasera por defecto
  const [stream, setStream] = useState(null);
  const [estado, setEstado] = useState("iniciando"); // iniciando | sin-camara | conectando | conectado | desconectado | caducado | terminado | parado
  const [detalle, setDetalle] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const senderRef = useRef(null);

  const enlaceValido = !!(partidaId && token);
  const emitiendo = !!stream && !["caducado", "terminado", "parado"].includes(estado);

  async function abrirCamara(modo) {
    try {
      const nuevo = await navigator.mediaDevices.getUserMedia(restricciones(modo));
      const anterior = streamRef.current;
      streamRef.current = nuevo;
      setStream(nuevo);
      // Cambio de cámara en marcha: se sustituye la pista sin renegociar.
      if (senderRef.current) await senderRef.current.replaceTrack(nuevo.getVideoTracks()[0]).catch(() => {});
      anterior?.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      setEstado("sin-camara");
      return false;
    }
  }

  function parar() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setEstado("parado");
  }

  // Abre la cámara al entrar.
  useEffect(() => {
    if (!enlaceValido) return undefined;
    abrirCamara(camara);
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      if (stream) videoRef.current.play?.().catch(() => {});
    }
  }, [stream]);

  // Pantalla siempre encendida mientras emite (si el navegador lo permite):
  // con la pantalla apagada o la página en segundo plano, el móvil corta la
  // cámara. El bloqueo se pierde al ocultarse la página, así que se vuelve a
  // pedir al volver; y si la cámara se ha cortado, se reabre.
  useEffect(() => {
    if (!emitiendo) return undefined;
    let bloqueo = null;
    async function pedirBloqueo() {
      try { bloqueo = await navigator.wakeLock?.request("screen"); } catch { /* no soportado */ }
    }
    function alVolver() {
      if (document.visibilityState !== "visible") return;
      pedirBloqueo();
      const pista = streamRef.current?.getVideoTracks()[0];
      if (!pista || pista.readyState === "ended") abrirCamara(camara);
    }
    pedirBloqueo();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      bloqueo?.release?.().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitiendo, camara]);

  // Conexión con el principal: el móvil ofrece (tiene la pista) y el
  // principal contesta. Por polling cada 2s, como el resto de la
  // herramienta. Se vuelve a ofrecer si la conexión cae o si el principal lo
  // pide (p. ej. porque ha recargado la página).
  const hayStream = !!stream;
  const finalizado = ["caducado", "terminado", "parado"].includes(estado);
  useEffect(() => {
    if (!enlaceValido || !hayStream || finalizado) return undefined;
    const ruta = `/api/partidas-herramienta/${partidaId}/camara/auxiliar/movil`;
    let cancelado = false;
    let pc = null;
    let intento = null;
    let reinicioVisto = null;
    let iceAplicados = 0;
    let iceGenerados = [];
    let iceEnviados = 0;
    let caidaDesde = null;
    let ocupado = false;

    async function ofrecer() {
      pc?.close();
      senderRef.current = null;
      intento = null;
      iceAplicados = 0;
      iceGenerados = [];
      iceEnviados = 0;
      caidaDesde = null;
      setEstado("conectando");
      const nuevo = new RTCPeerConnection({ iceServers: await obtenerIceServers(partidaId, token) });
      if (cancelado) { nuevo.close(); return; }
      pc = nuevo;
      nuevo.onicecandidate = (e) => {
        if (e.candidate && pc === nuevo) iceGenerados.push(e.candidate.toJSON());
      };
      nuevo.onconnectionstatechange = () => {
        if (pc !== nuevo) return;
        const s = nuevo.connectionState;
        setDetalle(s);
        if (s === "connected") { caidaDesde = null; setEstado("conectado"); }
        else if (s === "disconnected" || s === "failed") setEstado("desconectado");
      };
      const pista = streamRef.current?.getVideoTracks()[0];
      if (!pista) return;
      senderRef.current = nuevo.addTrack(pista, streamRef.current);
      const offer = await nuevo.createOffer();
      await nuevo.setLocalDescription(offer);
      try {
        const params = senderRef.current.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = BITRATE_AUXILIAR;
        await senderRef.current.setParameters(params);
      } catch { /* no soportado, bitrate automático */ }
      const r = await apiFetch(ruta, { token, method: "PUT", body: JSON.stringify({ offer: nuevo.localDescription }) });
      intento = r.intento;
    }

    async function sondear() {
      if (ocupado) return;
      ocupado = true;
      try {
        let data;
        try {
          data = await apiFetch(ruta, { token });
        } catch (err) {
          if (err.status === 401 || err.status === 404) {
            setEstado("caducado");
            setDetalle(err.message);
          }
          return;
        }
        if (cancelado) return;
        if (data.finalizada) {
          setEstado("terminado");
          return;
        }
        const pideReinicio = reinicioVisto !== null && data.reinicio !== reinicioVisto;
        reinicioVisto = data.reinicio;
        // Sin conexión todavía, el principal pide una oferta nueva, o la
        // conexión lleva caída más de 8s: se ofrece de nuevo.
        const estadoPc = pc?.connectionState;
        if (estadoPc === "disconnected" || estadoPc === "failed") caidaDesde = caidaDesde || Date.now();
        else caidaDesde = null;
        if (!pc || intento === null || pideReinicio || (caidaDesde && Date.now() - caidaDesde > 8000)) {
          await ofrecer();
          return;
        }
        if (data.intento !== intento) return;
        if (data.answer && pc.signalingState === "have-local-offer") await pc.setRemoteDescription(data.answer);
        if (pc.remoteDescription) {
          const nuevosIce = (data.iceTablet || []).slice(iceAplicados);
          for (const c of nuevosIce) await pc.addIceCandidate(c);
          iceAplicados = (data.iceTablet || []).length;
        }
        if (iceGenerados.length > iceEnviados) {
          const pendientes = iceGenerados.slice(iceEnviados);
          iceEnviados = iceGenerados.length;
          await apiFetch(ruta, { token, method: "PUT", body: JSON.stringify({ intento, iceAux: pendientes }) });
        }
      } catch {
        // Best-effort, se reintenta en el siguiente sondeo.
      } finally {
        ocupado = false;
      }
    }

    sondear();
    const intervalo = setInterval(sondear, 2000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
      pc?.close();
      senderRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enlaceValido, hayStream, finalizado]);

  function cambiarCamara() {
    const otra = camara === "environment" ? "user" : "environment";
    setCamara(otra);
    abrirCamara(otra);
  }

  function reanudar() {
    setEstado("iniciando");
    abrirCamara(camara);
  }

  const textos = {
    iniciando: "Abriendo la cámara…",
    "sin-camara": "No se ha podido abrir la cámara: revisa los permisos del navegador.",
    conectando: "Conectando con el dispositivo principal…",
    conectado: "✓ Conectado. Apunta a la diana y deja esta página abierta (pantalla encendida).",
    desconectado: "Se ha perdido la conexión. Reintentando…",
    caducado: detalle || "Este enlace ya no es válido. Escanea el QR otra vez.",
    terminado: "El partido ha terminado. Ya puedes cerrar esta página.",
    parado: "Cámara parada.",
  };

  if (!enlaceValido) {
    return (
      <main className="camara-auxiliar">
        <h1>Cámara de la diana</h1>
        <p className="admin-msg admin-msg-error">
          Enlace incompleto. Abre esta página escaneando el QR que aparece en el dispositivo principal, al elegir
          «Otro dispositivo» como cámara de la diana.
        </p>
      </main>
    );
  }

  return (
    <main className="camara-auxiliar">
      <h1>Cámara de la diana</h1>
      <div className="camara-auxiliar-video-caja">
        <video ref={videoRef} className="camara-auxiliar-video" autoPlay playsInline muted />
      </div>
      <p
        className={estado === "caducado" || estado === "sin-camara" ? "admin-msg admin-msg-error" : "chronicle-status"}
        style={{ margin: ".6rem 0" }}
      >
        {textos[estado] || ""}
        {estado === "desconectado" && detalle ? ` [${detalle}]` : ""}
      </p>
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", justifyContent: "center" }}>
        {emitiendo && (
          <>
            <button type="button" onClick={cambiarCamara}>🔄 Cambiar cámara</button>
            <button type="button" className="admin-link-btn" onClick={parar}>Parar</button>
          </>
        )}
        {(estado === "parado" || estado === "sin-camara") && (
          <button type="button" onClick={reanudar}>🎥 Volver a emitir</button>
        )}
      </div>
    </main>
  );
}
