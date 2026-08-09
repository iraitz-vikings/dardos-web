import { useEffect, useRef, useState } from "react";
import { useLang } from "./i18n.jsx";

const VIDEO_URL = "https://res.cloudinary.com/lodi1y1k/video/upload/v1786280571/VID-20260809-WA0007_goixms.mp4";

export default function VideoHome() {
  const { t } = useLang();
  const videoRef = useRef(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = 0.8;
    const intento = video.play();
    if (intento !== undefined) {
      intento.then(() => setReproduciendo(true)).catch(() => setBloqueado(true));
    }
  }, []);

  function reproducirManual() {
    videoRef.current?.play();
    setReproduciendo(true);
    setBloqueado(false);
  }

  return (
    <section id="video" className="video-home">
      <p className="eyebrow">{t("video.eyebrow")}</p>
      <h2 className="chronicle-title">{t("video.title")}</h2>
      <div className="video-home-embed">
        <video
          ref={videoRef}
          src={VIDEO_URL}
          playsInline
          controls
          preload="auto"
          onPlay={() => setReproduciendo(true)}
        />
        {bloqueado && !reproduciendo && (
          <button type="button" className="video-home-play" onClick={reproducirManual}>
            {t("video.play")}
          </button>
        )}
      </div>
    </section>
  );
}
