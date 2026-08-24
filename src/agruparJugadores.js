// Separa una lista de jugadores del club en socios (tienen cuenta,
// usuarioId no nulo) e invitados (sin cuenta) — usado en todos los sitios
// donde se elige gente de "todo el plantel" (torneos, ligas, equipos), para
// que la lista/desplegable los muestre agrupados en dos bloques en vez de
// mezclados sin ninguna marca. Mantiene el orden en el que vinieran (el
// backend ya los devuelve ordenados por nombre).
export function agruparPorSocio(jugadores) {
  const socios = [];
  const invitados = [];
  for (const j of jugadores || []) {
    (j.usuarioId ? socios : invitados).push(j);
  }
  return { socios, invitados };
}
