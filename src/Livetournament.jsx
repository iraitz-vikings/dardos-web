import { useState } from "react";

function agrupar(partidos, campo) {
  const grupos = {};
  for (const p of partidos) {
    if (!grupos[p[campo]]) grupos[p[campo]] = [];
    grupos[p[campo]].push(p);
  }
  return grupos;
}

function Partido({ p, mostrarMaquina }) {
  return (
    <div className={`bracket-match ${p.ganador ? "bracket-match-decided" : ""} ${p.enCurso ? "bracket-match-en-curso" : ""}`}>
      <span className="bracket-round">{p.ronda}</span>
      {mostrarMaquina && <span className="bracket-maquina">{p.maquina}</span>}
      <span className={p.ganador && p.ganador === p.jugador1 ? "bracket-winner" : ""}>{p.jugador1 || "?"}</span>
      <span className="bracket-vs">vs</span>
      <span className={p.ganador && p.ganador === p.jugador2 ? "bracket-winner" : ""}>{p.jugador2 || "?"}</span>
      {p.resultado && <span className="bracket-resultado">{p.resultado}</span>}
    </div>
  );
}

export default function LiveTournament({ torneo }) {
  const [vista, setVista] = useState("maquina");
  const partidos = torneo.partidos || [];

  if (partidos.length === 0) {
    return (
      <div className="live-tournament">
        <h3>{torneo.nombre}</h3>
        {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}
        <p className="chronicle-status">El cuadro todavía no está publicado.</p>
      </div>
    );
  }

  const porMaquina = agrupar(partidos, "maquina");
  const porNivel = agrupar(partidos, "nivel");

  return (
    <div className="live-tournament">
      <h3>{torneo.nombre}</h3>
      {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}

      <div className="live-tournament-toggle">
        <button className={vista === "maquina" ? "active" : ""} onClick={() => setVista("maquina")}>
          Por máquina
        </button>
        <button className={vista === "nivel" ? "active" : ""} onClick={() => setVista("nivel")}>
          Por cuadrante
        </button>
      </div>

      {vista === "maquina" ? (
        <div className="live-tournament-machines">
          {Object.entries(porMaquina).map(([maquina, partidosMaquina]) => {
            const actual = partidosMaquina.find((p) => p.enCurso);
            return (
              <div key={maquina} className="live-tournament-machine">
                <h4>{maquina}</h4>
                {actual ? (
                  <Partido p={actual} />
                ) : (
                  <p className="bracket-sin-actual">Sin enfrentamiento en curso</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="live-tournament-machines">
          {Object.entries(porNivel).map(([nivel, partidosNivel]) => (
            <div key={nivel} className="live-tournament-machine">
              <h4>{nivel}</h4>
              {partidosNivel.map((p) => (
                <Partido key={p.id} p={p} mostrarMaquina />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
