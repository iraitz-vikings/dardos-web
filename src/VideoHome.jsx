import { useEffect, useRef, useState } from "react";
import { useLang } from "./i18n.jsx";

const VIDEO_URL = "https://res.cloudinary.com/lodi1y1k/video/upload/v1786280571/VID-20260809-WA0007_goixms.mp4";

export default function VideoHome() {
  const { t } = useLang();
  const videoRef = useRef(null);
  const [silenciado, setSilenciado] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 0.6;
    video.muted = false;
    const intento = video.play();
    if (intento !== undefined) {
      intento.catch(() => {
        // El navegador bloqueó el autoplay con sonido: reintentamos silenciado
        video.muted = true;
        setSilenciado(true);
        video.play();
      });
    }
  }, []);

  function activarSonido() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 0.6;
    video.play();
    setSilenciado(false);
  }

  return (
    <section id="video" className="video-home">
      <p className="eyebrow">{t("video.eyebrow")}</p>
      <h2 className="chronicle-title">{t("video.title")}</h2>
      <div className="video-home-embed">
        <video ref={videoRef} src={VIDEO_URL} playsInline autoPlay loop controls />
        {silenciado && (
          <button type="button" className="video-home-play" onClick={activarSonido}>
            {t("video.unmute")}
          </button>
        )}
      </div>
    </section>
  );
}
