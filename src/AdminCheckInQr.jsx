import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useCerrarConEscape } from "./cabeceraDesplegable.js";
import { API_URL } from "./config.js";

// Check-in con QR de un cuadrante (pestaña Participantes del admin de
// torneos): en vez de que todos pasen por la mesa, el admin abre el
// check-in y enseña el QR (en la tele del local o en su móvil); cada
// jugador lo lee, se identifica con su PIN o su cuenta de socio y marca su
// propia presencia — ver src/routes/checkIn.js en el backend y
// CheckInQr.jsx (la página que abre el QR). Mientras está abierto, la lista
// de participantes se recarga sola para ver los checks según llegan. El
// QR deja de valer al cerrarlo o al hacer el sorteo.
const RECARGA_MS = 5000;

export default function AdminCheckInQr({ token, torneoNombre, cuadrante, onRecargar }) {
  const [estado, setEstado] = useState(null); // { abierto, token }
  const [mostrarQr, setMostrarQr] = useState(false);
  const [error, setError] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const ruta = `${API_URL}/api/torneos-club/cuadrantes/${cuadrante.id}/check-in`;
  const sorteado = (cuadrante.partidos || []).some((p) => p.jugador1 || p.jugador2 || p.ganador || p.resultado);
  const participantes = cuadrante.participantes || [];
  const conCheck = participantes.filter((p) => p.confirmado !== false).length;

  useEffect(() => {
    fetch(ruta, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setEstado(d))
      .catch(() => {});
    // Al sortear, el backend cierra el check-in: se vuelve a consultar.
  }, [ruta, token, sorteado]);

  // onRecargar cambia en cada render del padre: se guarda en una ref para no
  // reiniciar el intervalo con cada recarga.
  const recargarRef = useRef(onRecargar);
  recargarRef.current = onRecargar;
  useEffect(() => {
    if (!estado?.abierto || sorteado) return;
    const id = setInterval(() => recargarRef.current(), RECARGA_MS);
    return () => clearInterval(id);
  }, [estado?.abierto, sorteado]);

  async function cambiar(abrir) {
    setOcupado(true);
    setError(null);
    try {
      const r = await fetch(ruta, { method: abrir ? "POST" : "DELETE", headers: { "x-admin-token": token } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "No se pudo cambiar el check-in.");
      setEstado(d);
      setMostrarQr(abrir);
    } catch (err) {
      setError(err.message);
    } finally {
      setOcupado(false);
    }
  }

  if (sorteado || !estado) return null;

  const url = estado.abierto ? `${window.location.origin}/checkin/${estado.token}` : null;

  return (
    <div className="admin-hint" style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "center", margin: ".6rem 0" }}>
      {!estado.abierto ? (
        <>
          <button type="button" className="admin-link-btn" disabled={ocupado} onClick={() => cambiar(true)}>
            📱 Abrir check-in con QR
          </button>
          <span>Cada jugador lee el QR desde su cuenta y se marca el check él mismo.</span>
        </>
      ) : (
        <>
          <strong>📱 Check-in con QR abierto</strong>
          <span>· {conCheck}/{participantes.length} con check (se actualiza solo)</span>
          <button type="button" className="admin-link-btn" onClick={() => setMostrarQr(true)}>Mostrar QR</button>
          <button type="button" className="admin-link-btn" disabled={ocupado} onClick={() => cambiar(false)}>Cerrar check-in</button>
        </>
      )}
      {error && <span className="admin-msg admin-msg-error">{error}</span>}
      {mostrarQr && url && (
        <PantallaQr
          url={url}
          titulo={torneoNombre}
          subtitulo={cuadrante.nombre}
          conCheck={conCheck}
          total={participantes.length}
          onCerrar={() => setMostrarQr(false)}
        />
      )}
    </div>
  );
}

const INSTRUCCIONES = [
  "Escanéalo con el móvil, identifícate y listo: ¡no hace falta pasar por la mesa!",
  "Eskaneatu mugikorrarekin, identifikatu eta kito: ez duzu mahaitik pasa beharrik!",
  "Scanne-le avec ton téléphone, identifie-toi et c'est fait : pas besoin de passer à la table !",
];

// QR a pantalla completa, pensado para ponerlo en la tele/tablet del local
// o enseñarlo desde el móvil del admin. Se puede descargar como imagen
// para imprimirlo.
function PantallaQr({ url, titulo, subtitulo, conCheck, total, onCerrar }) {
  const [src, setSrc] = useState(null);
  useCerrarConEscape(true, onCerrar);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 720, margin: 2 })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [url]);

  return (
    <div className="admin-partido-modal" onClick={onCerrar} style={{ zIndex: 100 }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", color: "#111", borderRadius: 12, padding: "1.2rem", textAlign: "center", maxWidth: "min(92vw, 640px)", width: "100%" }}
      >
        <p style={{ margin: 0, fontSize: ".95rem", textTransform: "uppercase", letterSpacing: ".08em" }}>Check-in</p>
        <h3 style={{ margin: ".2rem 0 0", color: "#111" }}>{titulo}</h3>
        {subtitulo && <p style={{ margin: ".1rem 0 .6rem" }}>{subtitulo}</p>}
        {src ? (
          <img src={src} alt="Código QR del check-in" style={{ width: "min(80vw, 62vh, 520px)", height: "auto" }} />
        ) : (
          <p>Generando QR…</p>
        )}
        {/* La pantalla la ven todos a la vez: la instrucción va en los tres
            idiomas de la web. La página del QR (CheckInQr.jsx) ya sale en el
            idioma de cada uno. */}
        {INSTRUCCIONES.map((texto, i) => (
          <p key={i} style={{ margin: ".25rem 0", fontSize: i === 0 ? "1.05rem" : ".95rem", opacity: i === 0 ? 1 : 0.8 }}>
            {texto}
          </p>
        ))}
        <p style={{ margin: ".2rem 0", fontWeight: 600 }}>{conCheck}/{total} con check</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: ".6rem", flexWrap: "wrap" }}>
          {src && (
            <a href={src} download={`check-in-${(subtitulo || titulo || "qr").replace(/\s+/g, "-")}.png`} style={{ color: "#111" }}>
              Descargar imagen
            </a>
          )}
          <button type="button" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
