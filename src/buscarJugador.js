// Buscar y mostrar jugadores del club por nombre o por mote (campo `apodo`)
// al apuntarlos a torneos y ligas (pedido de Iraitz, 2026-10-15): mucha
// gente del club se conoce más por el mote que por el nombre.

// Texto en minúsculas y sin tildes, para que el buscador de jugadores
// encuentre "Martín" escribiendo "martin".
export function normalizarBusqueda(texto) {
  return (texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Nombre para mostrar en las listas de elegir jugador: `Nombre "mote"`.
// Sirve también para las entradas del pool ({ nombre, apodo }).
export function etiquetaJugador(j) {
  return j.apodo ? `${j.nombre} "${j.apodo}"` : j.nombre;
}

// ¿Coincide el jugador con lo escrito en el buscador, por nombre o por mote?
export function coincideJugador(j, texto) {
  const t = normalizarBusqueda(texto);
  return !t || normalizarBusqueda(j.nombre).includes(t) || normalizarBusqueda(j.apodo).includes(t);
}
