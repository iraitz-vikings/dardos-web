import { useEffect, useRef, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const AUDIO_GALERIA_URL = "https://res.cloudinary.com/lodi1y1k/video/upload/v1786204416/Sons_of_the_Northern_Light_h7lq9t.mp3";

function idVideoYoutube(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function esVideoDirecto(url) {
  return url.includes("res.cloudinary.com") && url.includes("/video/upload/");
}

function posterVideoDirecto(url) {
  return url.replace(/\.[a-zA-Z0-9]+$/, ".jpg");
}

function analizarVideo(url) {
  const ytId = idVideoYoutube(url);
  if (ytId) return { tipo: "youtube", id: ytId };
  if (esVideoDirecto(url)) return { tipo: "directo", url };
  return null;
}

export default function Galeria() {
  const [noticias, setNoticias] = useState([]);
  const [galeriaSuelta, setGaleriaSuelta] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [audioBloqueado, setAudioBloqueado] = useState(false);
  const [audioSonando, setAudioSonando] = useState(false);
  const [silenciado, setSilenciado] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.18;
    audio.play()
      .then(() => setAudioSonando(true))
      .catch(() => setAudioBloqueado(true));
  }, []);

  function reproducirAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setAudioSonando(true);
      setAudioBloqueado(false);
    });
  }

  function alternarSilencio() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setSilenciado(audio.muted);
  }

  useEffect(() => {
    fetch(`${API_URL}/api/noticias`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setNoticias)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/galeria`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setGaleriaSuelta)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const galeria = [
    ...noticias.flatMap((n) => [
      ...(n.fotos || []).map((src) => ({ tipo: "foto", src, noticia: n.titulo })),
      ...(n.videos || [])
        .map((url) => {
          const v = analizarVideo(url);
          return v ? { ...v, noticia: n.titulo } : null;
        })
        .filter(Boolean),
    ]),
    ...galeriaSuelta
      .map((item) => {
        if (item.tipo === "video") return analizarVideo(item.url);
        return { tipo: "foto", src: item.url };
      })
      .filter(Boolean),
  ];

  return (
    <>
      <Nav />

      <audio ref={audioRef} src={AUDIO_GALERIA_URL} preload="auto" />

      <main>
        <section className="gallery gallery-page">
          <p className="eyebrow">Galería</p>
          <h2 className="chronicle-title">Fotos y vídeos del club</h2>

          {audioBloqueado && !audioSonando && (
            <button type="button" className="audio-play-btn" onClick={reproducirAudio}>
              🔊 Reproducir sonido
            </button>
          )}
          {audioSonando && (
            <button type="button" className="audio-play-btn" onClick={alternarSilencio}>
              {silenciado ? "🔇 Sonido silenciado" : "🔊 Silenciar"}
            </button>
          )}

          {galeria.length === 0 ? (
            <p className="chronicle-status">
              Todavía no hay nada en la galería. Se irá llenando con cada noticia y foto o vídeo que se publique.
            </p>
          ) : (
            <div className="gallery-grid">
              {galeria.map((item, i) => {
                if (item.tipo === "foto") {
                  return (
                    <img
                      key={i}
                      src={item.src}
                      alt=""
                      loading="lazy"
                      className="gallery-item gallery-photo"
                      onClick={() => setLightbox({ tipo: "foto", src: item.src })}
                    />
                  );
                }
                const poster =
                  item.tipo === "youtube"
                    ? `https://img.youtube.com/vi/${item.id}/hqdefault.jpg`
                    : posterVideoDirecto(item.url);
                return (
                  <button
                    key={i}
                    className="gallery-item gallery-video"
                    onClick={() =>
                      setLightbox(
                        item.tipo === "youtube"
                          ? { tipo: "youtube", id: item.id }
                          : { tipo: "directo", url: item.url }
                      )
                    }
                    aria-label="Reproducir vídeo"
                  >
                    <img src={poster} alt="" loading="lazy" />
                    <span className="gallery-play" aria-hidden="true">▶</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)} aria-label="Cerrar">✕</button>
          {lightbox.tipo === "foto" && (
            <img src={lightbox.src} alt="" onClick={(e) => e.stopPropagation()} />
          )}
          {lightbox.tipo === "youtube" && (
            <div className="lightbox-video" onClick={(e) => e.stopPropagation()}>
              <iframe
                src={`https://www.youtube.com/embed/${lightbox.id}?autoplay=1`}
                title="Vídeo"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            </div>
          )}
          {lightbox.tipo === "directo" && (
            <div className="lightbox-video" onClick={(e) => e.stopPropagation()}>
              <video src={lightbox.url} controls autoPlay />
            </div>
          )}
        </div>
      )}

      <Footer simple />
    </>
  );
}
