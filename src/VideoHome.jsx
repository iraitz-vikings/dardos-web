import { useEffect, useRef, useState } from "react";
import { useLang } from "./i18n.jsx";

const VIDEO_ID = "jxptIpCYAJA";

let apiCargandose = null;
function cargarYoutubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (apiCargandose) return apiCargandose;
  apiCargandose = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (anterior) anterior();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiCargandose;
}

export default function VideoHome() {
  const { t } = useLang();
  const contenedorRef = useRef(null);
  const playerRef = useRef(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    cargarYoutubeApi().then(() => {
      if (cancelado || !contenedorRef.current) return;
      playerRef.current = new window.YT.Player(contenedorRef.current, {
        videoId: VIDEO_ID,
        playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            e.target.setVolume(9);
            setTimeout(() => {
              if (cancelado || !playerRef.current) return;
              const estado = playerRef.current.getPlayerState();
              if (estado === 1) setReproduciendo(true);
              else setBloqueado(true);
            }, 1200);
          },
          onStateChange: (e) => {
            if (e.data === 1) {
              setReproduciendo(true);
              setBloqueado(false);
            }
          },
        },
      });
    });

    return () => {
      cancelado = true;
    };
  }, []);

  function reproducirManual() {
    playerRef.current?.playVideo();
  }

  return (
    <section id="video" className="video-home">
      <p className="eyebrow">{t("video.eyebrow")}</p>
      <h2 className="chronicle-title">{t("video.title")}</h2>
      <div className="video-home-embed">
        <div ref={contenedorRef} />
        {bloqueado && !reproduciendo && (
          <button type="button" className="video-home-play" onClick={reproducirManual}>
            {t("video.play")}
          </button>
        )}
      </div>
    </section>
  );
}
