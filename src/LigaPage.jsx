import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import BracketView from "./BracketView.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function TablaClasificacion({ filas }) {
  if (!filas || filas.length === 0) return null;
  return (
    <table className="admin-tabla-clasificacion">
      <thead>
        <tr><th>#</th><th>Participante</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>+</th><th>−</th><th>Pts</th></tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={f.nombre}>
            <td>{i + 1}</td><td>{f.nombre}</td><td>{f.jugados}</td><td>{f.victorias}</td>
            <td>{f.empates}</td><td>{f.derrotas}</td><td>{f.partidasGanadas}</td>
            <td>{f.partidasPerdidas}</td><td><strong>{f.puntos}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function LigaPage({ id }) {
  const [liga, setLiga] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [vista, setVista] = useState("liga");
  const [busqueda, setBusqueda] = useState("");

  const [clasificacion, setClasificacion] = useState(null);

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
      // Clasificación calculada en el backend (con la cascada de desempate
      // de lib/clasificacionLiga.js), ya dividida por grupo si la liga los
      // usa — así el orden mostrado aquí es siempre el mismo que en el
      // panel de admin.
      fetch(`${API_URL}/api/ligas-club/${id}/clasificacion`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setClasificacion)
        .catch(() => {});
    };
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, [id]);

  const porGrupoJornada = {};
  for (const p of liga?.partidos || []) {
    const g = p.grupo || "_sin_grupo";
    if (!porGrupoJornada[g]) porGrupoJornada[g] = {};
    if (!porGrupoJornada[g][p.jornada]) porGrupoJornada[g][p.jornada] = [];
    porGrupoJornada[g][p.jornada].push(p);
  }
  const gruposConCalendario = Object.keys(porGrupoJornada).sort();

  const cuadrante = liga?.cuadrantes?.[0];
  const letrasGrupos = liga?.numeroGrupos ? Array.from({ length: liga.numeroGrupos }, (_, i) => String.fromCharCode(65 + i)) : [];

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
                  {clasificacion && (liga.numeroGrupos ? letrasGrupos.some((g) => (clasificacion.grupos[g] || []).length > 0) : (clasificacion.sinGrupo || []).length > 0) && (
                    <>
                      <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Clasificación</h2>
                      {liga.numeroGrupos
                        ? letrasGrupos.map((g) => (
                            <div key={g} style={{ marginBottom: "1.5rem" }}>
                              <h3>Grupo {g}</h3>
                              <TablaClasificacion filas={clasificacion.grupos[g]} />
                            </div>
                          ))
                        : <TablaClasificacion filas={clasificacion.sinGrupo} />}
                    </>
                  )}

                  {gruposConCalendario.length > 0 && (
                    <>
                      <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>Calendario</h2>
                      {gruposConCalendario.map((g) => (
                        <div key={g} style={{ marginBottom: "1.5rem" }}>
                          {liga.numeroGrupos && <h3>Grupo {g === "_sin_grupo" ? "sin asignar" : g}</h3>}
                          {Object.keys(porGrupoJornada[g]).map(Number).sort((a, b) => a - b).map((j) => (
                            <div key={j} style={{ marginBottom: "1rem" }}>
                              <strong>Jornada {j}</strong>
                              <ul>
                                {porGrupoJornada[g][j].map((p) => (
                                  <li key={p.id}>
                                    {p.participante1} vs {p.participante2}
                                    {p.resultado ? ` — ${p.resultado}` : p.ganador ? ` — ganó ${p.ganador}` : " — pendiente"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
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
