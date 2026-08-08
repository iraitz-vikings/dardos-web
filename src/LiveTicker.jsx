import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function LiveTicker() {
  const [partidos, setPartidos] = useState([]);

  useEffect(() => {
    const cargar = () => {
      fetch(`${API_URL}/api/torneos-club`)
        .then((r) => (r.ok ? r.json() : []))
        .then((torneos) => {
          const enCurso = torneos
            .filter((t) => !t.finalizado)
            .flatMap((t) =>
              (t.cuadrantes || []).flatMap((c) =>
                c.partidos
                  .filter((p) => p.enCurso)
                  .map((p) => ({ ...p, torneoId: t.id, torneoNombre: t.nombre }))
              )
            );
          setPartidos(enCurso);
        })
        .catch(() => {});
    };
    cargar();
    const intervalo = setInterval(cargar, 15000);
    return () => clearInterval(intervalo);
  }, []);

  if (partidos.length === 0) return null;

  return (
    <div className="live-ticker">
      <span className="live-ticker-etiqueta">● En directo</span>
      <div className="live-ticker-lista">
        {partidos.map((p) => (
          <a key={p.id} href={`/torneo/${p.torneoId}`} className="live-ticker-item">
            {p.maquina && <strong>{p.maquina}</strong>}
            {p.jugador1} vs {p.jugador2}
          </a>
        ))}
      </div>
    </div>
  );
}
