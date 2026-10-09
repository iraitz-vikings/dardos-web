import CargaExterna from "./CargaExterna.jsx";
import { useLang } from "./i18n.jsx";
import { CLUB } from "./club.js";

const VIDEO_ID = CLUB.videoPortadaYoutube;

// Antes se cargaba la API de YouTube al abrir la portada e intentaba
// reproducirse sola. Ahora el vídeo no se pide a YouTube hasta que el
// visitante pulsa "Reproducir" (ver CargaExterna.jsx), y se usa el dominio
// sin cookies de YouTube (revisión de normativa 2026-09-29).
export default function VideoHome() {
  const { t } = useLang();

  if (!VIDEO_ID) return null;

  return (
    <section id="video" className="video-home">
      <p className="eyebrow">{t("video.eyebrow")}</p>
      <h2 className="chronicle-title">{t("video.title")}</h2>
      <div className="video-home-embed">
        <CargaExterna servicio="YouTube" boton={t("video.play")}>
          {() => (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&playsinline=1`}
              title={t("video.title")}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          )}
        </CargaExterna>
      </div>
    </section>
  );
}
