import useResaltadoReciente from "./useResaltadoReciente.js";
import { useLang } from "./i18n.jsx";

function Partido({ p, mostrarCuadrante }) {
  const reciente = useResaltadoReciente(p.enCurso, p.actualizadoEn);
  return (
    <div
      className={`bracket-match ${p.ganador ? "bracket-match-decided" : ""} ${p.enCurso ? "bracket-match-en-curso" : ""} ${reciente ? "bracket-match-reciente" : ""}`}
    >
      {mostrarCuadrante && p.cuadranteNombre && <span className="bracket-cuadrante">{p.cuadranteNombre}</span>}
      <span className={p.ganador && p.ganador === p.jugador1 ? "bracket-winner" : ""}>{p.jugador1 || (p.ganador ? "BYE" : "?")}</span>
      <span className="bracket-vs">vs</span>
      <span className={p.ganador && p.ganador === p.jugador2 ? "bracket-winner" : ""}>{p.jugador2 || (p.ganador ? "BYE" : "?")}</span>
      {p.resultado && <span className="bracket-resultado">{p.resultado}</span>}
    </div>
  );
}

export default function TorneoResumen({ torneo }) {
  const { t } = useLang();
  const cuadrantes = torneo.cuadrantes || [];
  // Los cuadrantes ya marcados "finalizado" (modo "por jornadas", ver
  // TorneoClub.modoJornadas) se excluyen de este resumen por máquina — igual
  // que en el banner "En directo" de la portada (LiveTicker.jsx). Además, un
  // partido con ganador ya nunca cuenta como "actual" aunque su flag
  // `enCurso` se hubiera quedado colgado a true de antes de este arreglo
  // (partidos ya jugados con datos antiguos): un partido decidido no está
  // "en directo".
  const partidos = cuadrantes
    .filter((c) => c.estado !== "finalizado")
    .flatMap((c) => c.partidos.map((p) => ({ ...p, cuadranteNombre: c.nombre })));
  const porMaquina = {};
  for (const p of partidos) {
    if (!p.maquina) continue;
    if (!porMaquina[p.maquina]) porMaquina[p.maquina] = [];
    porMaquina[p.maquina].push(p);
  }
  const maquinas = Object.keys(porMaquina).sort();

  return (
    <div className="live-tournament">
      <h3>{torneo.nombre}</h3>
      {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}

      {maquinas.length === 0 ? (
        <p className="chronicle-status">{t("live.notPublished")}</p>
      ) : (
        <div className="live-tournament-machines">
          {maquinas.map((maquina) => {
            const actual = porMaquina[maquina].find((p) => p.enCurso && !p.ganador);
            return (
              <div key={maquina} className="live-tournament-machine">
                <h4>{maquina}</h4>
                {actual ? <Partido p={actual} mostrarCuadrante={cuadrantes.length > 1} /> : <p className="bracket-sin-actual">{t("live.noActiveMatch")}</p>}
              </div>
            );
          })}
        </div>
      )}

      <a href={`/torneo/${torneo.id}`} className="gallery-teaser-link">{t("live.viewFull")}</a>
    </div>
  );
}
