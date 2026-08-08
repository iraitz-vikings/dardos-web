function Partido({ p, mostrarCuadrante }) {
  return (
    <div className={`bracket-match ${p.ganador ? "bracket-match-decided" : ""} ${p.enCurso ? "bracket-match-en-curso" : ""}`}>
      {mostrarCuadrante && p.cuadranteNombre && <span className="bracket-cuadrante">{p.cuadranteNombre}</span>}
      <span className={p.ganador && p.ganador === p.jugador1 ? "bracket-winner" : ""}>{p.jugador1 || "?"}</span>
      <span className="bracket-vs">vs</span>
      <span className={p.ganador && p.ganador === p.jugador2 ? "bracket-winner" : ""}>{p.jugador2 || "?"}</span>
      {p.resultado && <span className="bracket-resultado">{p.resultado}</span>}
    </div>
  );
}

export default function TorneoResumen({ torneo }) {
  const cuadrantes = torneo.cuadrantes || [];
  const partidos = cuadrantes.flatMap((c) => c.partidos.map((p) => ({ ...p, cuadranteNombre: c.nombre })));
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
        <p className="chronicle-status">El cuadro todavía no está publicado.</p>
      ) : (
        <div className="live-tournament-machines">
          {maquinas.map((maquina) => {
            const actual = porMaquina[maquina].find((p) => p.enCurso);
            return (
              <div key={maquina} className="live-tournament-machine">
                <h4>{maquina}</h4>
                {actual ? <Partido p={actual} mostrarCuadrante={cuadrantes.length > 1} /> : <p className="bracket-sin-actual">Sin enfrentamiento en curso</p>}
              </div>
            );
          })}
        </div>
      )}

      <a href={`/torneo/${torneo.id}`} className="gallery-teaser-link">Ver torneo completo →</a>
    </div>
  );
}
