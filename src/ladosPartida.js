import { construirUnidades } from "./dardosLogica.js";

// Lados de una partida de la herramienta (PartidaHerramienta), de 2 o más —
// amistosos de 3 o más jugadores desde 2026-10-30. El backend ya manda
// siempre `lados` y `legsGanadosLados` (ver formatearPartida); el respaldo
// con etiqueta1/2… es para respuestas de un backend anterior. Compartido por
// JuegoHerramienta.jsx y DirectoPartida.jsx.
export function ladosDe(partida) {
  if (Array.isArray(partida.lados) && partida.lados.length >= 2) return partida.lados;
  return [
    { etiqueta: partida.etiqueta1, jugadoresId: partida.jugadoresId1 || [], nombres: partida.nombres1 || [] },
    { etiqueta: partida.etiqueta2, jugadoresId: partida.jugadoresId2 || [], nombres: partida.nombres2 || [] },
  ];
}

export function legsGanadosDe(partida) {
  if (Array.isArray(partida.legsGanadosLados) && partida.legsGanadosLados.length >= 2) return partida.legsGanadosLados;
  return [partida.legsGanados1 || 0, partida.legsGanados2 || 0];
}

// Índice de lado (0..N-1) de un jugador en la partida, o null si no juega.
export function ladoIdxDe(partida, jugadorId) {
  const i = ladosDe(partida).findIndex((l) => (l.jugadoresId || []).includes(jugadorId));
  return i === -1 ? null : i;
}

// Lado al que pertenece una unidad del marcador. Las unidades llevan
// `ladoIdx` desde que se puede elegir el orden de tiro (van ordenadas por
// turno, no por lado); estados guardados antes de eso no lo llevan, y
// entonces su posición coincide con el lado.
export function ladoDeUnidad(unidad, posicion) {
  return unidad?.ladoIdx ?? posicion;
}

// Orden de tiro (índices de lado), el elegido en la sala de espera o, si no
// hay ninguno válido, el de los lados tal cual.
export function ordenTiroDe(partida) {
  const n = ladosDe(partida).length;
  const orden = partida.ordenLados;
  if (Array.isArray(orden) && orden.length === n && new Set(orden).size === n && orden.every((i) => i >= 0 && i < n)) {
    return orden;
  }
  return ladosDe(partida).map((_, i) => i);
}

// Unidades del marcador (una por lado, en orden de tiro) a partir de la
// partida: individual si cada lado es un solo jugador, si no parejas con
// marcador compartido (turnándose dentro del lado).
export function construirUnidadesPartida(partida) {
  const lados = ladosDe(partida);
  const individual = lados.every((l) => l.jugadoresId.length === 1);
  const unidades = individual
    ? construirUnidades({ modo: "individual", jugadores: lados.map((l) => l.nombres[0] || l.etiqueta) })
    : construirUnidades({
        modo: "parejas",
        equipos: lados.map((l) => ({ nombre: l.etiqueta, integrantes: l.nombres })),
        marcadorCompartido: true,
      });
  const conLado = unidades.map((u, i) => ({ ...u, ladoIdx: i }));
  return ordenTiroDe(partida).map((i) => conLado[i]);
}
