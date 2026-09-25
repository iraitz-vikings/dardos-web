import { useState } from "react";
import BracketView from "./BracketView.jsx";
import useResaltadoReciente from "./useResaltadoReciente.js";
import { useLang } from "./i18n.jsx";
import DirectoPartida, { BotonDirecto } from "./DirectoPartida.jsx";

function Partido({ p, mostrarCuadrante, onVerDirecto }) {
  const reciente = useResaltadoReciente(p.enCurso, p.actualizadoEn);
  return (
    <div
      className={`bracket-match ${p.ganador ? "bracket-match-decided" : ""} ${p.enCurso ? "bracket-match-en-curso" : ""} ${reciente ? "bracket-match-reciente" : ""}`}
    >
      {mostrarCuadrante && p.cuadranteNombre && <span className="bracket-cuadrante">{p.cuadranteNombre}</span>}
      {p.maquina && <span className="bracket-maquina">{p.maquina}</span>}
      <span className={p.ganador && p.ganador === p.jugador1 ? "bracket-winner" : ""}>{p.jugador1 || (p.ganador ? "BYE" : "?")}</span>
      <span className="bracket-vs">vs</span>
      <span className={p.ganador && p.ganador === p.jugador2 ? "bracket-winner" : ""}>{p.jugador2 || (p.ganador ? "BYE" : "?")}</span>
      {p.resultado && <span className="bracket-resultado">{p.resultado}</span>}
      <BotonDirecto partido={p} onVer={onVerDirecto} />
    </div>
  );
}

function ClasificacionCuadrante({ puntosJornada }) {
  if (!puntosJornada || puntosJornada.length === 0) return null;
  return (
    <div className="live-tournament-clasificacion">
      <h5>Clasificación</h5>
      <table className="admin-tabla-clasificacion">
        <thead>
          <tr><th>Pos.</th><th>Participante</th><th>Puntos</th></tr>
        </thead>
        <tbody>
          {puntosJornada.map((p) => (
            <tr key={p.id}>
              <td>{p.posicion}º</td>
              <td>{p.etiqueta}</td>
              <td>{p.puntos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cuadrante({ cuadrante, busqueda, onVerDirecto }) {
  return (
    <div className="live-tournament-cuadrante-visual">
      <h4>{cuadrante.nombre}</h4>
      <BracketView cuadrante={cuadrante} busqueda={busqueda} onVerDirecto={onVerDirecto} />
      <ClasificacionCuadrante puntosJornada={cuadrante.puntosJornada} />
    </div>
  );
}

export default function LiveTournament({ torneo }) {
  const { t } = useLang();
  const [vista, setVista] = useState("maquina");
  const [busqueda, setBusqueda] = useState("");
  // Partido cuyo marcador en directo está abierto (ventanita, ver DirectoPartida.jsx).
  const [directo, setDirecto] = useState(null);
  const verDirecto = (p) => setDirecto({ partidaId: p.partidaHerramienta.id, titulo: `${p.jugador1 || "?"} vs ${p.jugador2 || "?"}` });
  const cuadrantes = torneo.cuadrantes || [];
  const partidos = cuadrantes.flatMap((c) => c.partidos.map((p) => ({ ...p, cuadranteNombre: c.nombre })));

  if (partidos.length === 0) {
    return (
      <div className="live-tournament">
        <h3>{torneo.nombre}</h3>
        {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}
        <p className="chronicle-status">{t("live.notPublished")}</p>
      </div>
    );
  }

  const porMaquina = {};
  for (const p of partidos) {
    if (!p.maquina) continue;
    if (!porMaquina[p.maquina]) porMaquina[p.maquina] = [];
    porMaquina[p.maquina].push(p);
  }

  return (
    <div className="live-tournament">
      <h3>{torneo.nombre}</h3>
      {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}

      <div className="live-tournament-toggle">
        <button className={vista === "maquina" ? "active" : ""} onClick={() => setVista("maquina")}>
          {t("live.byMachine")}
        </button>
        <button className={vista === "cuadrante" ? "active" : ""} onClick={() => setVista("cuadrante")}>
          {t("live.byBracket")}
        </button>
      </div>

      {vista === "maquina" ? (
        Object.keys(porMaquina).length === 0 ? (
          <p className="chronicle-status">Todavía no hay enfrentamientos asignados a ninguna máquina.</p>
        ) : (
          <div className="live-tournament-machines">
            {Object.entries(porMaquina).map(([maquina, partidosMaquina]) => {
              const actual = partidosMaquina.find((p) => p.enCurso);
              return (
                <div key={maquina} className="live-tournament-machine">
                  <h4>{maquina}</h4>
                  {actual ? <Partido p={actual} mostrarCuadrante={cuadrantes.length > 1} onVerDirecto={verDirecto} /> : <p className="bracket-sin-actual">{t("live.noActiveMatch")}</p>}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="live-tournament-cuadrantes-lista">
          <input
            type="text"
            className="bracket-busqueda"
            placeholder={t("live.searchPlaceholder")}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {cuadrantes.map((c) => <Cuadrante key={c.id} cuadrante={c} busqueda={busqueda} onVerDirecto={verDirecto} />)}
        </div>
      )}
      {directo && <DirectoPartida partidaId={directo.partidaId} titulo={directo.titulo} onCerrar={() => setDirecto(null)} />}
    </div>
  );
}
