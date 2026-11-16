import { useEffect, useState } from "react";
import CargaExterna from "./CargaExterna.jsx";
import { useLang } from "./i18n.jsx";
import { API_URL } from "./config.js";
import { idVideoYoutube } from "./youtubeEmbed.js";

// Sección "VikingsTV" de la zona de socios (el nombre sale de
// club.config.js → nombreTv): emisiones y vídeos de YouTube solo para socios.
// Arriba el reproductor con el vídeo elegido (por defecto la emisión en
// directo, si la hay, o el último publicado) y debajo la lista del resto.
// Los socios con rol admin publican, marcan "en directo" y borran desde aquí
// mismo — backend: dardos-club-backend/src/routes/tv.js.
//
// No se muestran miniaturas de YouTube en la lista: cargarlas conectaría con
// Google sin consentimiento (ver CargaExterna.jsx). El vídeo solo se carga
// tras el clic en el reproductor; una vez aceptado, al elegir otro de la
// lista se cambia directamente.

function formatFecha(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const FORM_VACIO = { titulo: "", url: "", descripcion: "", enDirecto: false, notificar: true };

export default function VikingsTV({ usuario }) {
  const { t, lang } = useLang();
  const esAdmin = usuario?.rol === "admin";
  const [videos, setVideos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [elegidoId, setElegidoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const token = () => localStorage.getItem("socioToken");
  const cabeceras = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token()}` });

  const cargar = () =>
    fetch(`${API_URL}/api/tv`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setVideos)
      .catch(() => {})
      .finally(() => setCargando(false));

  useEffect(() => {
    cargar();
  }, []);

  // La lista ya viene ordenada: en directo primero y luego lo más reciente.
  const elegido = videos.find((v) => v.id === elegidoId) || videos[0] || null;
  const idYoutube = idVideoYoutube(elegido?.url);

  async function publicar(e) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/tv`, { method: "POST", headers: cabeceras(), body: JSON.stringify(form) });
      const datos = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: datos.error || t("tv.errorPublicar") });
        return;
      }
      setForm(FORM_VACIO);
      setMostrarFormulario(false);
      setElegidoId(datos.id);
      await cargar();
    } catch {
      setMensaje({ tipo: "error", texto: t("socios.errorConexion") });
    } finally {
      setEnviando(false);
    }
  }

  // Al marcar en directo se pregunta si avisar a los socios (push/Telegram).
  async function cambiarDirecto(v) {
    const notificar = !v.enDirecto && confirm(t("tv.confirmarAvisar"));
    await fetch(`${API_URL}/api/tv/${v.id}`, {
      method: "PUT",
      headers: cabeceras(),
      body: JSON.stringify({ enDirecto: !v.enDirecto, notificar }),
    }).catch(() => {});
    cargar();
  }

  async function borrar(v) {
    if (!confirm(t("tv.confirmarBorrar"))) return;
    await fetch(`${API_URL}/api/tv/${v.id}`, { method: "DELETE", headers: cabeceras() }).catch(() => {});
    if (elegidoId === v.id) setElegidoId(null);
    cargar();
  }

  return (
    <div className="vikings-tv">
      <h3>{t("zona.tv")}</h3>
      <p className="admin-hint-bloque">{t("tv.intro")}</p>

      {esAdmin && !mostrarFormulario && (
        <button type="button" onClick={() => setMostrarFormulario(true)} style={{ marginBottom: "1rem" }}>
          ＋ {t("tv.anadir")}
        </button>
      )}

      {esAdmin && mostrarFormulario && (
        <form onSubmit={publicar} style={{ marginBottom: "1.5rem" }}>
          <label>
            {t("tv.tituloLabel")}
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required maxLength={200} />
          </label>
          <label>
            {t("tv.urlLabel")}
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://www.youtube.com/live/…"
              required
            />
          </label>
          <label>
            {t("tv.descripcionLabel")}
            <textarea rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} maxLength={1000} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
            <input
              type="checkbox"
              checked={form.enDirecto}
              onChange={(e) => setForm({ ...form, enDirecto: e.target.checked })}
              style={{ width: "auto" }}
            />
            {t("tv.enDirectoLabel")}
          </label>
          {form.enDirecto && (
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
              <input
                type="checkbox"
                checked={form.notificar}
                onChange={(e) => setForm({ ...form, notificar: e.target.checked })}
                style={{ width: "auto" }}
              />
              {t("tv.notificarLabel")}
            </label>
          )}
          <div style={{ display: "flex", gap: ".6rem" }}>
            <button type="submit" disabled={enviando}>{enviando ? t("tv.publicando") : t("tv.publicar")}</button>
            <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>{t("tv.cancelar")}</button>
          </div>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}

      {cargando && <p className="chronicle-status">{t("tv.cargando")}</p>}
      {!cargando && videos.length === 0 && <p className="chronicle-status">{t("tv.vacio")}</p>}

      {elegido && idYoutube && (
        <div className="vikings-tv-reproductor">
          <div className="video-directo-embed-marco">
            <CargaExterna servicio="YouTube" boton={t("video.play")}>
              {() => (
                <iframe
                  key={idYoutube}
                  src={`https://www.youtube-nocookie.com/embed/${idYoutube}?autoplay=1`}
                  title={elegido.titulo}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </CargaExterna>
          </div>
          <div className="vikings-tv-reproductor-info">
            <h4>
              {elegido.enDirecto && <span className="vikings-tv-directo">{t("tv.enDirecto")}</span>}
              {elegido.titulo}
            </h4>
            {elegido.descripcion && <p>{elegido.descripcion}</p>}
            <a href={elegido.url} target="_blank" rel="noopener noreferrer">{t("tv.verEnYoutube")}</a>
          </div>
        </div>
      )}

      {videos.length > 1 && <h4 className="vikings-tv-lista-titulo">{t("tv.masVideos")}</h4>}
      <ul className="vikings-tv-lista">
        {videos.length > 1 &&
          videos.map((v) => (
            <li key={v.id} className={`vikings-tv-item ${elegido?.id === v.id ? "vikings-tv-item-activo" : ""}`}>
              <button type="button" className="vikings-tv-item-boton" onClick={() => setElegidoId(v.id)}>
                <strong>
                  {v.enDirecto && <span className="vikings-tv-directo">{t("tv.enDirecto")}</span>}
                  {v.titulo}
                </strong>
                <time>{formatFecha(v.fechaPublicacion, lang)}</time>
              </button>
              {esAdmin && (
                <div className="vikings-tv-item-acciones">
                  <button type="button" className="admin-link-btn" onClick={() => cambiarDirecto(v)}>
                    {v.enDirecto ? t("tv.quitarDirecto") : t("tv.marcarDirecto")}
                  </button>
                  <button type="button" className="admin-link-btn" onClick={() => borrar(v)}>{t("tv.borrar")}</button>
                </div>
              )}
            </li>
          ))}
      </ul>

      {/* Con un único vídeo no hay lista: las acciones de admin van bajo el reproductor. */}
      {esAdmin && videos.length === 1 && (
        <div className="vikings-tv-item-acciones">
          <button type="button" className="admin-link-btn" onClick={() => cambiarDirecto(videos[0])}>
            {videos[0].enDirecto ? t("tv.quitarDirecto") : t("tv.marcarDirecto")}
          </button>
          <button type="button" className="admin-link-btn" onClick={() => borrar(videos[0])}>{t("tv.borrar")}</button>
        </div>
      )}
    </div>
  );
}
