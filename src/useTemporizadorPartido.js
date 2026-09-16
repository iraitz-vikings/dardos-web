import { useEffect, useState } from "react";

// Sigue en tiempo real el temporizador de un partido "en curso" (ver
// TorneoClub.temporizadorActivo/temporizadorMinutos y
// CuadroPartido.enCursoDesde/partidoIniciado en el backend): el plazo que
// tiene un jugador para presentarse a jugar desde que su partido se marca
// "en curso" — ver también AdminTorneosClub.jsx (botón "Marcar en curso"/
// "Empezado") y BracketView.jsx (aviso en el cuadro gráfico).
//
// Devuelve null si no aplica (torneo sin temporizador activo, partido no en
// curso, o ya marcado "Empezado" con el botón "Empezado"); si no, un objeto
// { estado: "normal"|"urgente"|"agotado", restanteSeg } — "urgente" cuando
// queda 1 minuto o menos, "agotado" al llegar a 0.
//
// Solo hace tick (cada segundo, con setInterval) mientras hay algo que
// contar, para no generar renders de sobra en el resto de partidos que no
// están en esta situación.
export default function useTemporizadorPartido(partido, temporizadorActivo, temporizadorMinutos) {
  const activo = !!(
    temporizadorActivo && temporizadorMinutos && partido.enCurso && partido.enCursoDesde && !partido.partidoIniciado
  );
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    if (!activo) return undefined;
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activo]);

  if (!activo) return null;
  const limiteMs = new Date(partido.enCursoDesde).getTime() + temporizadorMinutos * 60000;
  const restanteSeg = Math.round((limiteMs - ahora) / 1000);
  return { estado: restanteSeg <= 0 ? "agotado" : restanteSeg <= 60 ? "urgente" : "normal", restanteSeg };
}

// Formatea segundos restantes como "m:ss" (nunca negativo — el llamador ya
// distingue "agotado" por separado).
export function formatoCuentaAtras(seg) {
  const s = Math.max(0, seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
