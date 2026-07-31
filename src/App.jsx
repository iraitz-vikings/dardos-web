import { useEffect, useState } from "react";
import { EMBLEM_DATA_URI } from "./emblem.js";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function App() {
    const [noticias, setNoticias] = useState([]);
    const [estado, setEstado] = useState("cargando"); // cargando | ok | error

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

  return (
        <>
              <header className="nav">
                      <a className="nav-brand" href="#inicio">
                                <img src={EMBLEM_DATA_URI} alt="Escudo Vikings" className="nav-emblem" />
                                <span>Vikings <em>Darts Club</em>em></span>span>
                      </a>a>
                      <nav className="nav-links">
                                <a href="#cronica">Crónica</a>a>
                                <a href="#torneo">Próximo torneo</a>a>
                                <a href="#contacto">Contacto</a>a>
                      </nav>nav>
              </header>header>
        
              <main>
                      <section id="inicio" className="hero">
                                <div className="hero-emblem-wrap">
                                            <img src={EMBLEM_DATA_URI} alt="Escudo Vikings" className="hero-emblem" />
                                </div>div>
                                <p className="eyebrow">Vikings · Club de dardos</p>p>
                                <h1>La incursión<br /><span>ya ha comenzado</span>span></h1>h1>
                                <p className="hero-sub">
                                            Noticias, fotos de eventos y crónicas del club. Un solo lugar para
                                            seguir todo lo que pasa dentro y fuera de la diana.
                                </p>p>
                      </section>section>
              
                      <section id="torneo" className="tournament">
                                <div className="tournament-card">
                                            <p className="event-eyebrow">Próximo torneo</p>p>
                                            <h2>II Open Villa<br />Errenteria</h2>h2>
                                            <div className="event-dates">
                                                          <span>10</span>span>
                                                          <em>—</em>em>
                                                          <span>11</span>span>
                                                          <small>Octubre 2026</small>small>
                                            </div>div>
                                            <p className="event-note">
                                                          Vikings is coming. Próximamente más información: inscripciones,
                                                          horarios y categorías.
                                            </p>p>
                                </div>div>
                      </section>section>
              
                      <section id="cronica" className="chronicle">
                                <p className="eyebrow">Crónica del club</p>p>
                                <h2 className="chronicle-title">Últimas noticias</h2>h2>
                      
                        {estado === "cargando" && (
                      <p className="chronicle-status">Desenterrando las últimas noticias…</p>p>
                                )}
                      
                        {estado === "error" && (
                      <p className="chronicle-status">
                                    No hemos podido cargar la crónica ahora mismo. Vuelve a intentarlo en unos minutos.
                      </p>p>
                                )}
                      
                        {estado === "ok" && noticias.length === 0 && (
                      <p className="chronicle-status">
                                    Aún no hay crónicas publicadas. La primera incursión no tardará en llegar.
                      </p>p>
                                )}
                      
                        {estado === "ok" && noticias.length > 0 && (
                      <ol className="timeline">
                        {noticias.map((n) => (
                                        <li key={n.id} className="timeline-item">
                                                          <div className="timeline-node" aria-hidden="true">⚔</div>div>
                                                          <div className="timeline-content">
                                                                              <time>{formatFecha(n.fechaPublicacion)}</time>time>
                                                                              <h3>{n.titulo}</h3>h3>
                                                                              <p>{n.contenido}</p>p>
                                                            {n.fotos?.length > 0 && (
                                                                <div className="timeline-photos">
                                                                  {n.fotos.map((src, i) => (
                                                                                            <img key={i} src={src} alt="" loading="lazy" />
                                                                                          ))}
                                                                </div>div>
                                                                              )}
                                                          </div>div>
                                        </li>li>
                                      ))}
                      </ol>ol>
                                )}
                      </section>section>
              </main>main>
        
              <footer id="contacto" className="footer">
                      <p>© {new Date().getFullYear()} · Vikings Club de Dardos</p>p>
              </footer>footer>
        </>>
      );
}
</>
