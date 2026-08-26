// Lógica pura de los marcadores de dardos (501 y Cricket), separada de los
// componentes React para poder probarla con scripts sueltos antes de
// integrarla en la interfaz. No depende de nada del DOM.

// --- Geometría de la diana -------------------------------------------

// Orden real de los sectores de una diana estándar, en sentido horario
// empezando por el 20 arriba del todo.
export const ORDEN_SECTORES = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Radios de cada anillo, normalizados respecto al radio exterior del anillo
// de doble (1.0 = borde exterior de la zona de puntuación). El bull usa las
// proporciones reales (WDF/PDC, 6.35mm/15.9mm sobre 170mm). Los anillos de
// triple y doble se han ENSANCHADO a propósito respecto a una diana real
// (que ronda un 5% del radio cada uno) — feedback de Iraitz tras probarlo en
// el móvil: son muy finos para acertar con el dedo en una herramienta táctil
// de apoyo, así que aquí se sacrifica fidelidad exacta a cambio de que sea
// cómodo de usar. Como tanto la diana (Diana.jsx) como la detección del
// click (resultadoDardo, más abajo) leen estos mismos valores, visual y
// zona clicable van siempre sincronizados.
export const RADIOS = {
  bullInterior: 6.35 / 170, // bull doble (50)
  bullExterior: 15.9 / 170, // bull simple (25)
  tripleInterior: 0.56,
  tripleExterior: 0.65,
  dobleInterior: 0.9,
  dobleExterior: 1.0,
};

// dx, dy: distancia al centro de la diana, ya dividida entre el radio en
// píxeles del borde exterior del doble (así el resultado no depende del
// tamaño en pantalla). dy positivo hacia abajo, como es habitual en SVG.
export function resultadoDardo(dx, dy) {
  const r = Math.hypot(dx, dy);

  if (r > RADIOS.dobleExterior * 1.1) {
    return { etiqueta: "Fuera", numero: 0, multiplicador: 0, valor: 0, esDoble: false, esTriple: false, esBull: false };
  }
  if (r <= RADIOS.bullInterior) {
    return { etiqueta: "Bull (50)", numero: 25, multiplicador: 2, valor: 50, esDoble: true, esTriple: false, esBull: true };
  }
  if (r <= RADIOS.bullExterior) {
    return { etiqueta: "25", numero: 25, multiplicador: 1, valor: 25, esDoble: false, esTriple: false, esBull: true };
  }
  if (r > RADIOS.dobleExterior) {
    // entre el borde real y el margen de tolerancia: se cuenta como fuera
    return { etiqueta: "Fuera", numero: 0, multiplicador: 0, valor: 0, esDoble: false, esTriple: false, esBull: false };
  }

  let anguloDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (anguloDeg < 0) anguloDeg += 360;
  const indiceSector = Math.round(anguloDeg / 18) % 20;
  const numero = ORDEN_SECTORES[indiceSector];

  let multiplicador = 1;
  if (r >= RADIOS.tripleInterior && r <= RADIOS.tripleExterior) multiplicador = 3;
  else if (r >= RADIOS.dobleInterior) multiplicador = 2;

  const prefijo = multiplicador === 3 ? "T" : multiplicador === 2 ? "D" : "";
  return {
    etiqueta: `${prefijo}${numero}`,
    numero,
    multiplicador,
    valor: numero * multiplicador,
    esDoble: multiplicador === 2,
    esTriple: multiplicador === 3,
    esBull: false,
  };
}

// --- Modalidades de apertura/cierre del 501 -----------------------------

// simple: cualquier dardo vale. doble: tiene que ser doble (o bull 50, que
// cuenta como doble). master: doble o triple (bull 50 también cuenta, bull
// 25 NO, porque no es ni doble ni triple).
export function cumpleModalidad(dardo, modalidad) {
  if (modalidad === "simple") return true;
  if (modalidad === "doble") return dardo.esDoble;
  if (modalidad === "master") return dardo.esDoble || dardo.esTriple;
  return true;
}

// --- Buscador de combinación de cierre ----------------------------------

function todosLosDardosPosibles() {
  const vals = [];
  for (let n = 1; n <= 20; n++) {
    vals.push({ etiqueta: `S${n}`, valor: n, esDoble: false, esTriple: false });
    vals.push({ etiqueta: `D${n}`, valor: n * 2, esDoble: true, esTriple: false });
    vals.push({ etiqueta: `T${n}`, valor: n * 3, esDoble: false, esTriple: true });
  }
  vals.push({ etiqueta: "25", valor: 25, esDoble: false, esTriple: false });
  vals.push({ etiqueta: "Bull", valor: 50, esDoble: true, esTriple: false });
  // Orden descendente: al buscar en este orden, la primera combinación que
  // se encuentra tiende a parecerse a las tablas de cierre habituales
  // (dardos altos primero, p.ej. 170 -> T20, T20, Bull).
  return vals.sort((a, b) => b.valor - a.valor);
}
const DARDOS_POSIBLES = todosLosDardosPosibles();

function buscarCierreExacto(restante, nDardos, modalidadCierre) {
  if (nDardos === 1) {
    const d = DARDOS_POSIBLES.find((v) => v.valor === restante && cumpleModalidad(v, modalidadCierre));
    return d ? [d.etiqueta] : null;
  }
  for (const d of DARDOS_POSIBLES) {
    if (d.valor >= restante) continue; // deja al menos 1 punto para el resto de dardos
    const resto = buscarCierreExacto(restante - d.valor, nDardos - 1, modalidadCierre);
    if (resto) return [d.etiqueta, ...resto];
  }
  return null;
}

// Busca la combinación de cierre más corta posible (1, 2 o hasta
// `maxDardos` dardos) que deja el resto exactamente a 0 cumpliendo la
// modalidad de cierre en el último dardo. Devuelve un array de etiquetas
// ("T20", "D16"...) o null si no hay ninguna combinación posible con los
// dardos disponibles.
export function buscarCierre(restante, maxDardos, modalidadCierre) {
  if (restante <= 0 || maxDardos <= 0) return null;
  for (let n = 1; n <= maxDardos; n++) {
    const combo = buscarCierreExacto(restante, n, modalidadCierre);
    if (combo) return combo;
  }
  return null;
}

// --- Unidades de tiro (individual / parejas) ----------------------------

// Construye la lista de "unidades" que se turnan para tirar. Una unidad
// puede ser un jugador suelto (modo individual, o parejas con marcador
// individual) o una pareja completa con marcador compartido (modo parejas,
// marcador compartido): en ese caso `integrantes` tiene 2 nombres y se
// alternan como tirador cada vez que le toca a esa unidad.
export function construirUnidades({ modo, jugadores, equipos, marcadorCompartido }) {
  if (modo === "individual") {
    return jugadores.map((nombre, i) => ({
      id: `j${i}`,
      etiqueta: nombre,
      equipoEtiqueta: null,
      integrantes: [nombre],
      siguienteIntegranteIdx: 0,
    }));
  }

  if (marcadorCompartido) {
    return equipos.map((eq, i) => ({
      id: `e${i}`,
      etiqueta: eq.nombre,
      equipoEtiqueta: null,
      integrantes: eq.integrantes,
      siguienteIntegranteIdx: 0,
    }));
  }

  // Marcador individual dentro de la pareja: una unidad por persona, en
  // orden intercalado por posición dentro de cada equipo (como el orden de
  // saque habitual en dobles: primero el integrante 0 de cada equipo, luego
  // el integrante 1 de cada equipo).
  const unidades = [];
  const maxIntegrantes = Math.max(...equipos.map((e) => e.integrantes.length));
  for (let pos = 0; pos < maxIntegrantes; pos++) {
    equipos.forEach((eq, i) => {
      if (eq.integrantes[pos] !== undefined) {
        unidades.push({
          id: `e${i}p${pos}`,
          etiqueta: eq.integrantes[pos],
          equipoEtiqueta: eq.nombre,
          integrantes: [eq.integrantes[pos]],
          siguienteIntegranteIdx: 0,
        });
      }
    });
  }
  return unidades;
}

export function tiradorActual(unidad) {
  return unidad.integrantes[unidad.siguienteIntegranteIdx];
}

// --- Cricket: numeración y puntuación ------------------------------------

export const NUMEROS_CRICKET = [
  { clave: "20", etiqueta: "20", valor: 20 },
  { clave: "19", etiqueta: "19", valor: 19 },
  { clave: "18", etiqueta: "18", valor: 18 },
  { clave: "17", etiqueta: "17", valor: 17 },
  { clave: "16", etiqueta: "16", valor: 16 },
  { clave: "15", etiqueta: "15", valor: 15 },
  { clave: "B", etiqueta: "Bull", valor: 25 },
];

export function marcasVacias() {
  return Object.fromEntries(NUMEROS_CRICKET.map((n) => [n.clave, 0]));
}

// Traduce un resultado de dardo (de resultadoDardo) a cuántas marcas suma
// en el número correspondiente del cricket, o null si ese número no juega
// (1-14, o "Fuera"). El multiplicador ya vale directamente como nº de
// marcas: sencillo=1, doble=2 (bull 50 incluido), triple=3.
export function marcasDelDardo(resultado) {
  const clave = resultado.esBull ? "B" : String(resultado.numero);
  const esNumeroCricket = NUMEROS_CRICKET.some((n) => n.clave === clave);
  if (!esNumeroCricket || resultado.multiplicador === 0) return null;
  return { clave, marcas: resultado.multiplicador };
}

// Puntos de cada jugador en modo NORMAL: los impactos por encima de 3 en un
// número suman puntos a quien los da, mientras algún rival no lo tenga
// todavía cerrado (3+ marcas).
export function calcularPuntosCricket(jugadores) {
  return jugadores.map((jugador, i) =>
    NUMEROS_CRICKET.reduce((total, num) => {
      const propias = jugador.marcas[num.clave];
      const extra = Math.max(0, propias - 3);
      if (extra === 0) return total;
      const algunoSinCerrar = jugadores.some((otro, j) => j !== i && otro.marcas[num.clave] < 3);
      return algunoSinCerrar ? total + extra * num.valor : total;
    }, 0)
  );
}

// Puntos en modo CUT-THROAT: es al revés — los impactos por encima de 3 en
// un número que YA has cerrado se los sumas a cada RIVAL que todavía no lo
// tenga cerrado (perjudicándolo a él, no beneficiándote a ti). Gana quien
// cierra todo con la puntuación MÁS BAJA.
export function calcularPuntosCricketCutThroat(jugadores) {
  const puntos = jugadores.map(() => 0);
  NUMEROS_CRICKET.forEach((num) => {
    jugadores.forEach((jugador, i) => {
      const extra = Math.max(0, jugador.marcas[num.clave] - 3);
      if (extra === 0) return;
      jugadores.forEach((otro, j) => {
        if (j !== i && otro.marcas[num.clave] < 3) {
          puntos[j] += extra * num.valor;
        }
      });
    });
  });
  return puntos;
}

export function numeroCerrado(jugador, clave) {
  return jugador.marcas[clave] >= 3;
}

export function jugadorHaCerradoTodo(jugador) {
  return NUMEROS_CRICKET.every((n) => numeroCerrado(jugador, n.clave));
}
