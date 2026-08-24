import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import BracketView from "./BracketView.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function calcularClasificacion(liga) {
  const stats = {};
  function fila(nombre) {
    if (!stats[nombre]) stats[nombre] = { nombre, jugados: 0, victorias: 0, empates: 0, derrotas: 0, partidasGanadas: 0, partidasPerdidas: 0, puntos: 0 };
    return stats[nombre];
  }
  for (const p of liga.participantes || []) fila(p.etiqueta);
  function parseResultado(resultado) {
    if (!resultado) return null;
    const m = resultado.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2])];
  }
  for (const p of liga.partidos || []) {
    const numeros = parseResultado(p.resultado);
    if (numeros) {
      const [a, b] = numeros;
      const f1 = fila(p.participante1);
      const f2 = fila(p.participante2);
      f1.jugados++; f2.jugados++;
      f1.partidasGanadas += a; f1.partidasPerdidas += b;
      f2.partidasGanadas += b; f2.partidasPerdidas += a;
      if (a > b) { f1.victorias++; f1.puntos += 2; f2.derrotas++; }
      else if (a < b) { f2.victorias++; f2.puntos += 2; f1.derrotas++; }
      else { f1.empates++; f2.empates++; f1.puntos += 1; f2.puntos += 1; }
    } else if (p.ganador) {
      const perdedor = p.ganador === p.participante1 ? p.participante2 : p.participante1;
      const fg = fila(p.ganador);
      const fp = fila(perdedor);
      fg.jugados++; fp.jugados++;
      fg.victorias++; fg.puntos += 2;
      fp.derrotas++;
    }
  }
  return Object.values(stats).sort((x, y) => y.puntos - x.puntos || (y.partidasGanadas - y.partidasPerdidas) - (x.partidasGanadas - x.partidasPerdidas));
}

export default function LigaPage({ id }) {
  const [liga, setLiga] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [vista, setVista] = useState("liga");
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let primera = true;
    const cargar = () => {
      fetch(`${API_URL}/api/ligas-club/${id}`)
        .then((r) => {
          if (!r.ok) throw new Error("no encontrada");
          return r.json();
        })
        .then((data) => {
          setLiga(data);
          setEstado("ok");
        })
        .catch(() => {
          if (primera) setEstado("error");
        })
        .finally(() => {
          primera = false;
        });
    };
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, [id]);

  const clasificacion = liga ? calcularClasificacion(liga) : [];
  const porJornada = {};
  for (const p of liga?.partidos || []) {
    if (!porJornada[p.jornada]) porJornada[p.jornada] = [];
    porJornada[p.jornada].push(p);
  }
  const jornadas = Object.keys(porJornada).map(Number).sort((a, b) => a - b);

  const cuadrante = liga?.cuadrantes?.[0];

  return (
    <>
      <Nav />
      <main>
        <section className="torneo-pagina">
          {estado === "cargando" && <p className="chronicle-status">Cargando…</p>}
          {estado === "error" && <p className="chronicle-status">No hemos encontrado esta liga.</p>}
          {estado === "ok" && liga && (
            <>
              <p className="eyebrow">Liga del club</p>
              <h1 className="chronicle-title">{liga.nombre}</h1>
              <p className="torneo-pagina-fechas">
                {formatFecha(liga.fechaInicio)} – {formatFecha(liga.fechaFin)}
                {liga.finalizado ? " · Finalizada" : ""}
              </p>
              {liga.insigniaUrl && <img src={liga.insigniaUrl} alt={`Insignia ${liga.nombre}`} className="torneo-pagina-insignia" />}
              {liga.descripcion && <p className="event-description">{liga.descripcion}</p>}

              <details className="torneo-pagina-qr">
                <summary>Compartir / código QR</summary>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                  alt="Código QR de esta página"
                  width={160}
                  height={160}
                />
                <p className="torneo-pagina-qr-url">{window.location.href}</p>
              </details>

              {cuadrante && (
                <div className="live-tournament-toggle">
                  <button className={vista === "liga" ? "active" : ""} onClick={() => setVista("liga")}>
                    Liga
                  </button>
                  <button className={vista === "cuadrante" ? "active" : ""} onClick={() => setVista("cuadrante")}>
                    Cuadrante final
                  </button>
                </div>
              )}

              {vista === "liga" && (
                <>
                  {clasificacion.length > 0 && (
                    <>
                      <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Clasificación</h2>
                      <table className="admin-tabla-clasificacion">
                        <thead>
                          <tr><th>#</th><th>Participante</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>+</th><th>−</th><th>Pts</th></tr>
                        </thead>
                        <tbody>
                          {clasificacion.map((f, i) => (
                            <tr key={f.nombre}>
                              <td>{i + 1}</td><td>{f.nombre}</td><td>{f.jugados}</td><td>{f.victorias}</td>
                              <td>{f.empates}</td><td>{f.derrotas}</td><td>{f.partidasGanadas}</td>
                              <td>{f.partidasPerdidas}</td><td><strong>{f.puntos}</strong></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {jornadas.length > 0 && (
                    <>
                      <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Calendario</h2>
                      {jornadas.map((j) => (
                        <div key={j} style={{ marginBottom: "1rem" }}>
                          <strong>Jornada {j}</strong>
                          <ul>
                            {porJornada[j].map((p) => (
                              <li key={p.id}>
                                {p.participante1} vs {p.participante2}
                                {p.resultado ? ` — ${p.resultado}` : p.ganador ? ` — ganó ${p.ganador}` : " — pendiente"}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {vista === "cuadrante" && cuadrante && (
                <>
                  <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Cuadrante final</h2>
                  <input
                    type="text"
                    className="bracket-busqueda"
                    placeholder="Buscar jugador…"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    style={{ marginBottom: "1rem" }}
                  />
                  <BracketView cuadrante={cuadrante} busqueda={busqueda} />
                </>
              )}
            </>
          )}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
