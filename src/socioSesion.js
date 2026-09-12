// Vigila las peticiones que llevan el token de sesión del socio
// (localStorage "socioToken") y, si el servidor responde 401 (sesión
// caducada o invalidada), avisa a toda la app disparando un evento global
// en vez de dejar que cada sección se quede con una lista vacía sin
// explicación — que es lo que pasaba antes: cada componente hace su
// propio fetch con `.then(r => r.ok ? r.json() : [])`, así que un token
// caducado se traducía en "no hay nada" en todos lados, sin aviso.
// Socios.jsx escucha este evento para cerrar la sesión y mostrar un aviso
// claro en el formulario de entrada. Pedido por Iraitz, 2026-09-12.
//
// Se engancha parcheando window.fetch una sola vez, en vez de tocar la
// decena de sitios de la zona de socios que hacen sus propias llamadas —
// solo actúa cuando la petición llevaba exactamente el token de socio
// actual (para no confundirse con el token, distinto, de la herramienta
// de marcador, que tiene su propio flujo de PIN y no pasa por aquí).
export const EVENTO_SESION_CADUCADA = "socio-sesion-caducada";

let enganchado = false;

export function vigilarSesionSocio() {
  if (enganchado) return;
  enganchado = true;
  const fetchOriginal = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const respuesta = await fetchOriginal(...args);
    if (respuesta.status === 401) {
      const cabeceras = (args[1] && args[1].headers) || {};
      const autorizacion = cabeceras.Authorization || cabeceras.authorization;
      const tokenActual = localStorage.getItem("socioToken");
      if (tokenActual && autorizacion === `Bearer ${tokenActual}`) {
        window.dispatchEvent(new Event(EVENTO_SESION_CADUCADA));
      }
    }
    return respuesta;
  };
}
