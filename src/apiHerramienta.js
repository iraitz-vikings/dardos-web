// Pequeño helper de fetch compartido por JuegoHerramienta.jsx y
// CamarasPartida.jsx (extraído de JuegoHerramienta.jsx al añadir las
// cámaras, plan "camaras-partidas" guardado en el proyecto, para que
// CamarasPartida.jsx no tenga que duplicarlo ni depender en círculo de
// JuegoHerramienta.jsx). Mismo comportamiento de siempre: añade el token de
// partida (PIN) si se pasa, y lanza un Error con el mensaje del backend si
// la respuesta no es ok.

export { API_URL } from "./config.js";
import { API_URL } from "./config.js";

export async function apiFetch(path, { token, ...opciones } = {}) {
  const resp = await fetch(`${API_URL}${path}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {}),
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const error = new Error(data.error || "Error de red");
    error.status = resp.status;
    throw error;
  }
  return data;
}
