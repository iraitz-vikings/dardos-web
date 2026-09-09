import { useState } from "react";
import VideoDirectoEmbed from "./VideoDirectoEmbed.jsx";

// Pestaña de admin ("Vídeo en directo") para gestionar el enlace de YouTube
// en directo de un torneo/liga (`videoDirectoUrl` — ver
// dardos-club-backend/src/lib/videoDirecto.js). Compartida entre
// AdminTorneosClub.jsx y AdminLigasClub.jsx: mismo patrón de guardado que
// ImagenesAvisos/ConfiguracionHerramientaPanel — el padre hace el PUT real y
// devuelve { ok } o { ok: false, error }.
export default function VideoDirectoPanel({ entidad, onGuardar }) {
  const [url, setUrl] = useState(entidad.videoDirectoUrl || "");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const valor = url.trim();
      const resultado = await onGuardar(entidad, valor);
      if (resultado?.ok) {
        setMensaje({ tipo: "ok", texto: valor ? "Vídeo guardado — ya se muestra en la página pública." : "Vídeo quitado." });
      } else {
        setMensaje({ tipo: "error", texto: resultado?.error || "No se pudo guardar." });
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="admin-form">
      <p className="admin-hint" style={{ marginTop: 0 }}>
        Pega aquí el enlace de YouTube cuando estéis retransmitiendo en directo. Se mostrará embebido en esta página
        pública{entidad.visibilidad === "publico" ? " y también en la portada de la web principal" : ""}. Cuando
        termine la retransmisión, borra el campo y guarda para quitarlo.
      </p>
      <label>
        Enlace de YouTube en directo
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </label>
      <button type="button" disabled={guardando} onClick={guardar}>
        {guardando ? "Guardando…" : "Guardar vídeo"}
      </button>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      {url.trim() && <VideoDirectoEmbed url={url.trim()} titulo={entidad.nombre} />}
    </div>
  );
}
