import { useState } from "react";

const RAMA_ETIQUETA = { ganadores: "Cuadro de ganadores", perdedores: "Cuadro de perdedores", final: "Gran final" };

function Partido({ p }) {
  return (
    <div className={`bracket-match ${p.ganador ? "bracket-match-decided" : ""} ${p.enCurso ? "bracket-match-en-curso" : ""}`}>
      {p.maquina && <span className="bracket-maquina">{p.maquina}</span>}
      <span className={p.ganador && p.ganador === p.jugador1 ? "bracket-winner" : ""}>{p.jugador1 || "?"}</span>
      <span className="bracket-vs">vs</span>
      <span className={p.ganador && p.ganador === p.jugador2 ? "bracket-winner" : ""}>{p.jugador2 || "?"}</span>
      {p.resultado && <span className="bracket-resultado">{p.resultado}</span>}
    </div>
  );
}

function Cuadrante({ cuadrante }) {
  const porRama = {};
  for (const p of cuadrante.partidos) {
    if (!porRama[p.rama]) porRama[p.rama] = {};
    if (!porRama[p.rama][p.ronda]) porRama[p.rama][p.ronda] = [];
    porRama[p.rama][p.ronda].push(p);
  }
  const ramas = ["ganadores", "perdedores", "final"].filter((r) => porRama[r]);

  return (
    <div className="live-tournament-machine">
      <h4>{cuadrante.nombre}</h4>
      {ramas.map((rama) => (
        <div key={rama} className="bracket-rama">
          <p className="bracket-rama-titulo">{RAMA_ETIQUETA[rama]}</p>
          {Object.keys(porRama[rama]).sort((a, b) => a - b).map((ronda) => (
            <div key={ronda} className="bracket-ronda">
              <span className="bracket-ronda-titulo">Ronda {ronda}</span>
              {porRama[rama][ronda]
                .sort((a, b) => a.posicion - b.posicion)
                .map((p) => <Partido key={p.id} p={p} />)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LiveTournament({ torneo }) {
  const [vista, setVista] = useState("maquina");
  const cuadrantes = torneo.cuadrantes || [];
  const partidos = cuadrantes.flatMap((c) => c.partidos);

  if (partidos.length === 0) {
    return (
      <div className="live-tournament">
        <h3>{torneo.nombre}</h3>
        {torneo.descripcion && <p className="event-description">{torneo.descripcion}</p>}
        <p className="chronicle-status">El cuadro todavía no está publicado.</p>
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
          Por máquina
        </button>
        <button className={vista === "cuadrante" ? "active" : ""} onClick={() => setVista("cuadrante")}>
          Por cuadrante
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
                  {actual ? <Partido p={actual} /> : <p className="bracket-sin-actual">Sin enfrentamiento en curso</p>}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="live-tournament-machines live-tournament-cuadrantes">
          {cuadrantes.map((c) => <Cuadrante key={c.id} cuadrante={c} />)}
        </div>
      )}
    </div>
  );
}
