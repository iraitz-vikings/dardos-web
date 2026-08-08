import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import TorneoResumen from "./TorneoResumen.jsx";
import VideoHome from "./VideoHome.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function formatRangoTorneo(inicioIso, finIso) {
  const ini = new Date(inicioIso);
  const fin = new Date(finIso);
  const mesAnio = fin.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return {
    diaIni: ini.getDate(),
    diaFin: fin.getDate(),
    mesAnio: mesAnio.charAt(0).toUpperCase() + mesAnio.slice(1),
  };
}

function idVideoYoutube(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function esVideoDirecto(url) {
  return url.includes("res.cloudinary.com") && url.includes("/video/upload/");
}

// Convierte una URL de vídeo (YouTube o subido directamente) en un objeto
// { tipo: "youtube", id } o { tipo: "directo", url }, o null si no se reconoce.
function analizarVideo(url) {
  const ytId = idVideoYoutube(url);
  if (ytId) return { tipo: "youtube", id: ytId };
  if (esVideoDirecto(url)) return { tipo: "directo", url };
  return null;
}

const HERO_LOGO_URL = "https://res.cloudinary.com/lodi1y1k/image/upload/v1785702066/dardos-club/niuidh6tslgizgcrx71n.png";
const TOURNAMENT_BADGE_URL = "https://res.cloudinary.com/lodi1y1k/image/upload/v1785705038/dardos-club/ykdezhnoze0porj7fk8q.jpg";

const EMBERS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 7 + (i % 3) * 5) % 100,
  delay: (i * 0.6) % 8,
  duration: 6 + (i % 5),
  drift: (i % 2 === 0 ? 1 : -1) * (10 + (i % 4) * 8),
}));

export default function App() {
  const [noticias, setNoticias] = useState([]);
  const [estado, setEstado] = useState("cargando"); // cargando | ok | error
  const [lightbox, setLightbox] = useState(null); // { tipo: "foto"|"video", src }
  const [torneo, setTorneo] = useState(null);
  const [torneosClub, setTorneosClub] = useState([]);

  useEffect(() => {
    const cargar = () => {
      fetch(`${API_URL}/api/torneos-club`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setTorneosClub)
        .catch(() => {});
    };
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/noticias`)
      .then((r) => {
        if (!r.ok) throw new Error("respuesta no válida");
        return r.json();
      })
      .then((data) => {
        setNoticias(data);
        setEstado("ok");
      })
      .catch(() => setEstado("error"));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/torneo-destacado`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setTorneo)
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

  const fechas = torneo ? formatRangoTorneo(torneo.fechaInicio, torneo.fechaFin) : null;

  return (
    <>
      <Nav />

      <main>
        <section id="inicio" className="hero">
          <div className="embers" aria-hidden="true">
            {EMBERS.map((e, i) => (
              <span
                key={i}
                className="ember"
                style={{
                  left: `${e.left}%`,
                  animationDelay: `${e.delay}s`,
                  animationDuration: `${e.duration}s`,
                  "--drift": `${e.drift}px`,
                }}
              />
            ))}
          </div>
          <div className="hero-emblem-wrap">
            <img src={HERO_LOGO_URL} alt="Escudo Vikings" className="hero-emblem" />
          </div>
          <p className="eyebrow">Vikings · Club de dardos</p>
          <h1>La incursión<br /><span>ya ha comenzado</span></h1>
          <p className="hero-sub">
            Noticias, fotos de eventos y crónicas del club. Un solo lugar para
            seguir todo lo que pasa dentro y fuera de la diana.
          </p>
        </section>

        <VideoHome />

        <section id="torneo" className="tournament">
          <div className="tournament-heading">
            <p className="eyebrow">Próximo evento</p>
            <h2 className="chronicle-title">Próximo torneo</h2>
          </div>
          <div className="tournament-card">
            <img
              src={torneo?.insigniaUrl || TOURNAMENT_BADGE_URL}
              alt={torneo ? `Insignia ${torneo.nombre}` : "Insignia del torneo"}
              className="tournament-badge"
            />
            <h3>{torneo ? torneo.nombre : "II Open Villa Errenteria"}</h3>
            {torneo?.cartelUrl && (
              <img
                src={torneo.cartelUrl}
                alt={`Cartel ${torneo.nombre}`}
                className="tournament-poster"
                onClick={() => setLightbox({ tipo: "foto", src: torneo.cartelUrl })}
              />
            )}
            {fechas ? (
              <div className="event-dates">
                <span>{fechas.diaIni}</span>
                <em>—</em>
                <span>{fechas.diaFin}</span>
                <small>{fechas.mesAnio}</small>
              </div>
            ) : (
              <div className="event-dates">
                <span>10</span>
                <em>—</em>
                <span>11</span>
                <small>Octubre 2026</small>
              </div>
            )}
            {torneo?.descripcion && (
              <p className="event-description">{torneo.descripcion}</p>
            )}
            <p className="event-note">
              Vikings is coming. Próximamente más información: inscripciones,
              horarios y categorías.
            </p>
          </div>
        </section>

        <section id="torneos-en-directo" className="live-tournaments">
          <p className="eyebrow">En directo</p>
          <h2 className="chronicle-title">Torneos en directo</h2>

          {torneosClub.filter((t) => !t.finalizado).length === 0 ? (
            <p className="chronicle-status">Ahora mismo no hay ningún torneo en directo.</p>
          ) : (
            torneosClub.filter((t) => !t.finalizado).map((t) => <TorneoResumen key={t.id} torneo={t} />)
          )}
        </section>

        <section id="cronica" className="chronicle">
          <p className="eyebrow">Crónica del club</p>
          <h2 className="chronicle-title">Últimas noticias</h2>

          {estado === "cargando" && (
            <p className="chronicle-status">Desenterrando las últimas noticias…</p>
          )}

          {estado === "error" && (
            <p className="chronicle-status">
              No hemos podido cargar la crónica ahora mismo. Vuelve a intentarlo en unos minutos.
            </p>
          )}

          {estado === "ok" && noticias.length === 0 && (
            <p className="chronicle-status">
              Aún no hay crónicas publicadas. La primera incursión no tardará en llegar.
            </p>
          )}

          {estado === "ok" && noticias.length > 0 && (
            <ol className="timeline">
              {noticias.map((n) => (
                <li key={n.id} className="timeline-item">
                  <div className="timeline-node" aria-hidden="true">⚔</div>
                  <div className="timeline-content">
                    <time>{formatFecha(n.fechaPublicacion)}</time>
                    <h3>{n.titulo}</h3>
                    <p>{n.contenido}</p>
                    {n.fotos?.length > 0 && (
                      <div className="timeline-photos">
                        {n.fotos.map((src, i) => (
                          <img
                            key={i}
                            src={src}
                            alt=""
                            loading="lazy"
                            onClick={() => setLightbox({ tipo: "foto", src })}
                            className="timeline-photo-thumb"
                          />
                        ))}
                      </div>
                    )}
                    {n.videos?.length > 0 && (
                      <div className="timeline-videos">
                        {n.videos.map((url, i) => {
                          const v = analizarVideo(url);
                          if (!v) return null;
                          return (
                            <div key={i} className="timeline-video-embed">
                              {v.tipo === "youtube" ? (
                                <iframe
                                  src={`https://www.youtube.com/embed/${v.id}`}
                                  title="Vídeo de la noticia"
                                  loading="lazy"
                                  allowFullScreen
                                />
                              ) : (
                                <video src={v.url} controls preload="metadata" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="gallery-teaser">
          <p className="eyebrow">Galería</p>
          <h2 className="chronicle-title">Fotos y vídeos del club</h2>
          <p className="hero-sub">Revive los mejores momentos del club: fotos de eventos y vídeos de partidas.</p>
          <a href="/galeria" className="gallery-teaser-link">Ver galería completa →</a>
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

      <Footer />
    </>
  );
}
