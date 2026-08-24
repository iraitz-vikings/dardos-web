// Métodos de sorteo de parejas por grupos de nivel (AB, ABC, ABCD), usados
// tanto en los cuadrantes de torneos del club (AdminTorneosClub.jsx) como en
// las ligas del club (AdminLigasClub.jsx) — la misma constante estaba
// duplicada en ambos archivos. El backend tiene su propia copia equivalente
// en src/lib/sorteoParejasGrupos.js (dardos-club-backend), ya que son
// proyectos/repos separados.
export const GRUPOS_POR_METODO = { AB: ["A", "B"], ABC: ["A", "B", "C"], ABCD: ["A", "B", "C", "D"] };
