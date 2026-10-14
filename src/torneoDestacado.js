import { API_URL } from "./config.js";

// Torneo destacado de la home (GET /api/torneo-destacado). Lo piden la home
// y el menú (para ocultar el enlace "Próximo torneo" si el admin lo ha
// desactivado), así que se pide una sola vez por carga de página y se
// comparte. Si falla, se resuelve a null (la home enseña el torneo por
// defecto de club.config.js, como antes).
let promesa = null;
export function cargarTorneoDestacado() {
  if (!promesa) {
    promesa = fetch(`${API_URL}/api/torneo-destacado`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return promesa;
}

// `activo` falta en registros guardados antes de existir el campo: cuenta
// como activo.
export const torneoDestacadoVisible = (torneo) => torneo?.activo !== false;
