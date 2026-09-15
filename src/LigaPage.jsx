import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import BracketView from "./BracketView.jsx";
import AccesoHerramienta from "./JuegoHerramienta.jsx";
import VideoDirectoEmbed from "./VideoDirectoEmbed.jsx";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function TablaClasificacion({ filas, t }) {
  if (!filas || filas.length === 0) return null;
  return (
    <table className="admin-tabla-clasificacion">
      <thead>
        <tr><th>#</th><th>{t("ligaPage.colParticipante")}</th><th>PJ</th><th>V</th><th>E</th><th>D</th><th>+</th><th>−</th><th>+/−</th><th>Pts</th></tr>
      </thead>
      <tbody>
        {filas.map((f, i) => {
          const diferencia = f.partidasGanadas - f.partidasPerdidas;
          return (
            <tr key={f.nombre}>
              <td>{i + 1}</td><td>{f.nombre}</td><td>{f.jugados}</td><td>{f.victorias}</td>
              <td>{f.empates}</td><td>{f.derrotas}</td><td>{f.partidasGanadas}</td>
              <td>{f.partidasPerdidas}</td><td>{diferencia > 0 ? `+${diferencia}` : diferencia}</td>
              <td><strong>{f.puntos}</strong></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Estado visual de una jornada, para poder plegarla automáticamente una vez
// jugada y dejar a la vista solo la que está en curso — igual que las rondas
// de los cuadrantes de torneos en el panel de admin.
function estadoJornada(partidos) {
  const terminada = partidos.every((p) => !!p.ganador);
  if (terminada) return "terminada";
  const empezada = partidos.some((p) => !!p.ganador || p.enCurso);
  return empezada ? "en_curso" : "pendiente";
}
function etiquetaEstadoJornada(t, estado) {
  if (estado === "terminada") return t("ligaPage.estadoTerminada");
  if (estado === "en_curso") return t("ligaPage.estadoEnCurso");
  return t("ligaPage.estadoPendiente");
}

function CalendarioGrupo({ grupo, porJornada, mostrarGrupo, t }) {
  const [jornadasManual, setJornadasManual] = useState({});
  const jornadas = Object.keys(porJornada).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {mostrarGrupo && (
        <h3>
          {grupo === "_sin_grupo" ? t("ligaPage.grupo").replace("{letra}", t("ligaPage.sinGrupo")) : t("ligaPage.grupo").replace("{letra}", grupo)}
        </h3>
      )}
      {jornadas.map((j) => {
        const partidosJornada = porJornada[j];
        const estado = estadoJornada(partidosJornada);
        const desplegada = jornadasManual[j] !== undefined ? jornadasManual[j] : estado === "en_curso";
        return (
          <div key={j} className="admin-cuadro-maquina">
            <h4 className="admin-ronda-header" onClick={() => setJornadasManual((prev) => ({ ...prev, [j]: !desplegada }))}>
              <span>
                {t("ligaPage.jornada").replace("{n}", j)} <span className={`admin-ronda-estado admin-ronda-estado-${estado}`}>{etiquetaEstadoJornada(t, estado)}</span>
              </span>
              <span className="admin-ronda-toggle">{desplegada ? t("ligaPage.ocultar") : t("ligaPage.ver")}</span>
            </h4>
            {desplegada && (
              <ul>
                {partidosJornada.map((p) => (
                  <li key={p.id}>
                    {p.participante1} vs {p.participante2}
                    {p.resultado
                      ? ` — ${p.resultado}`
                      : p.ganador
                      ? ` — ${t("ligaPage.partidoGano").replace("{nombre}", p.ganador)}`
                      : ` — ${t("ligaPage.partidoPendiente")}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function LigaPage({ id }) {
  const { t } = useLang();
  const [liga, setLiga] = useState(null);
  const [estado, setEstado] = useState("cargando");
  const [vista, setVista] = useState("clasificacion");
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
          {estado === "cargando" && <p className="chronicle-status">{t("ligaPage.loading")}</p>}
          {estado === "error" && <p className="chronicle-status">{t("ligaPage.notfound")}</p>}
          {estado === "ok" && liga && (
            <>
              <p className="eyebrow">{t("ligaPage.eyebrow")}</p>
              <h1 className="chronicle-title">{liga.nombre}</h1>
              <p className="torneo-pagina-fechas">
                {formatFecha(liga.fechaInicio)} – {formatFecha(liga.fechaFin)}
                {liga.finalizado ? ` · ${t("ligaPage.finalizada")}` : ""}
              </p>
              {liga.insigniaUrl && <img src={liga.insigniaUrl} alt={`Insignia ${liga.nombre}`} className="torneo-pagina-insignia" />}
              {liga.descripcion && <p className="event-description">{liga.descripcion}</p>}

              <details className="torneo-pagina-qr">
                <summary>{t("torneoPage.share")}</summary>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                  alt="Código QR de esta página"
                  width={160}
                  height={160}
                />
                <p className="torneo-pagina-qr-url">{window.location.href}</p>
              </details>

              {liga.videoDirectoUrl && <VideoDirectoEmbed url={liga.videoDirectoUrl} titulo={liga.nombre} />}

              <AccesoHerramienta
                activa={!!liga.configuracionHerramienta?.activa}
                entidadTipo="liga"
                entidadId={liga.id}
                entidadNombre={liga.nombre}
              />

              <div className="live-tournament-toggle">
                <button className={vista === "clasificacion" ? "active" : ""} onClick={() => setVista("clasificacion")}>
                  {t("ligaPage.tabClasificacion")}
                </button>
                <button className={vista === "calendario" ? "active" : ""} onClick={() => setVista("calendario")}>
                  {t("ligaPage.tabCalendario")}
                </button>
                {cuadrante && (
                  <button className={vista === "cuadrante" ? "active" : ""} onClick={() => setVista("cuadrante")}>
                    {t("ligaPage.tabCuadrante")}
                  </button>
                )}
              </div>

              {vista === "clasificacion" && (
                <>
                  <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>{t("ligaPage.tabClasificacion")}</h2>
                  {!clasificacion ? (
                    <p className="chronicle-status">{t("ligaPage.loading")}</p>
                  ) : (liga.numeroGrupos ? letrasGrupos.some((g) => (clasificacion.grupos[g] || []).length > 0) : (clasificacion.sinGrupo || []).length > 0) ? (
                    liga.numeroGrupos
                      ? letrasGrupos.map((g) => (
                          <div key={g} style={{ marginBottom: "1.5rem" }}>
                            <h3>{t("ligaPage.grupo").replace("{letra}", g)}</h3>
                            <TablaClasificacion filas={clasificacion.grupos[g]} t={t} />
                          </div>
                        ))
                      : <TablaClasificacion filas={clasificacion.sinGrupo} t={t} />
                  ) : (
                    <p className="chronicle-status">{t("ligaPage.sinClasificacion")}</p>
                  )}
                </>
              )}

              {vista === "calendario" && (
                <>
                  <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>{t("ligaPage.tabCalendario")}</h2>
                  {gruposConCalendario.length > 0 ? (
                    gruposConCalendario.map((g) => (
                      <CalendarioGrupo key={g} grupo={g} porJornada={porGrupoJornada[g]} mostrarGrupo={!!liga.numeroGrupos} t={t} />
                    ))
                  ) : (
                    <p className="chronicle-status">{t("ligaPage.sinCalendario")}</p>
                  )}
                </>
              )}

              {vista === "cuadrante" && cuadrante && (
                <>
                  <h2 className="chronicle-title" style={{ fontSize: "1.3rem", marginTop: "2rem" }}>{t("ligaPage.tabCuadrante")}</h2>
                  <input
                    type="text"
                    className="bracket-busqueda"
                    placeholder={t("ligaPage.buscarJugador")}
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
