import { useEffect, useState } from "react";
import { API_URL } from "./config.js";


function formatFechaHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Resumen legible del navegador/sistema a partir del User-Agent, para no
// enseñar la cadena entera (larga e ilegible) en la tabla. Aproximado: solo
// para que el admin distinga "el iPhone de fulano" del "Chrome del portátil".
function resumenDispositivo(ua) {
  if (!ua) return "Dispositivo desconocido";
  let so = "";
  if (/iphone|ipad|ipod/i.test(ua)) so = "iPhone/iPad";
  else if (/android/i.test(ua)) so = "Android";
  else if (/windows/i.test(ua)) so = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) so = "Mac";
  else if (/linux/i.test(ua)) so = "Linux";

  let navegador = "";
  if (/edg\//i.test(ua)) navegador = "Edge";
  else if (/chrome|crios/i.test(ua)) navegador = "Chrome";
  else if (/firefox|fxios/i.test(ua)) navegador = "Firefox";
  else if (/safari/i.test(ua)) navegador = "Safari";

  return [navegador, so].filter(Boolean).join(" · ") || "Dispositivo";
}

// Motivo por el que el navegador dio la suscripción por muerta.
function motivoFallo(cod) {
  if (cod === 410) return "410 (el navegador retiró la suscripción)";
  if (cod === 404) return "404 (la suscripción ya no existe)";
  if (cod) return String(cod);
  return "—";
}

// Panel de admin para diagnosticar los avisos push que "se desactivan solos":
// lista todos los dispositivos suscritos del club con su estado (activo o
// caído), cuántos avisos han recibido, cuándo el último y, si el navegador lo
// dio por muerto, cuándo y con qué código. Solo lectura — sirve para saber si
// un socio dejó de recibir avisos y desde cuándo, sin mirar la base de datos.
export default function AdminDispositivosPush({ token, salir }) {
  const [dispositivos, setDispositivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [soloCaidos, setSoloCaidos] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/notificaciones/push/admin/dispositivos`, { headers: { "x-admin-token": token } })
      .then((r) => {
        if (r.status === 401) {
          salir();
          return [];
        }
        return r.ok ? r.json() : Promise.reject(new Error("No se pudieron cargar los dispositivos."));
      })
      .then(setDispositivos)
      .catch((e) => setError(e.message || "Error de conexión."))
      .finally(() => setCargando(false));
  };

  const eliminarCaidos = () => {
    if (!confirm("¿Eliminar todos los dispositivos caídos? Se borran solo los que ya no sirven; los activos no se tocan.")) return;
    setLimpiando(true);
    setError(null);
    fetch(`${API_URL}/api/notificaciones/push/admin/dispositivos/caidos`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    })
      .then((r) => {
        if (r.status === 401) {
          salir();
          return null;
        }
        return r.ok ? r.json() : Promise.reject(new Error("No se pudieron eliminar."));
      })
      .then((d) => {
        if (d) cargar();
      })
      .catch((e) => setError(e.message || "Error de conexión."))
      .finally(() => setLimpiando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activos = dispositivos.filter((d) => d.activa).length;
  const caidos = dispositivos.length - activos;
  const mostrados = soloCaidos ? dispositivos.filter((d) => !d.activa) : dispositivos;

  return (
    <section className="admin-form">
      <h2>Dispositivos de avisos (push)</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        Cada fila es un navegador/móvil donde un socio activó los avisos. Cuando el navegador retira la suscripción por su
        cuenta (los avisos que "se desactivan solos"), aquí aparece como <strong>caído</strong> con la fecha y el motivo.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", margin: ".5rem 0 1rem" }}>
        <span className="admin-hint">
          <strong>{activos}</strong> activos · <strong>{caidos}</strong> caídos · {dispositivos.length} en total
        </span>
        <label style={{ display: "flex", alignItems: "center", gap: ".4rem", margin: 0 }}>
          <input type="checkbox" checked={soloCaidos} onChange={(e) => setSoloCaidos(e.target.checked)} style={{ width: "auto" }} />
          Ver solo los caídos
        </label>
        <button type="button" className="admin-link-btn" onClick={cargar} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
        {caidos > 0 && (
          <button type="button" className="admin-link-btn" onClick={eliminarCaidos} disabled={limpiando} style={{ color: "#e5484d" }}>
            {limpiando ? "Eliminando…" : `Eliminar caídos (${caidos})`}
          </button>
        )}
      </div>

      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      {cargando && dispositivos.length === 0 && <p className="chronicle-status">Cargando…</p>}
      {!cargando && dispositivos.length === 0 && !error && (
        <p className="chronicle-status">Todavía no hay ningún dispositivo con avisos activados.</p>
      )}

      {mostrados.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {mostrados.map((d) => (
            <li
              key={d.id}
              className="admin-cuadrante"
              style={{ marginBottom: ".8rem", padding: ".8rem", borderLeft: `3px solid ${d.activa ? "var(--ember)" : "#e5484d"}` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                <strong>{d.jugadorNombre}</strong>
                <span
                  style={{
                    fontSize: ".8em",
                    fontWeight: "bold",
                    color: d.activa ? "var(--ember)" : "#e5484d",
                  }}
                >
                  {d.activa ? "● Activo" : "○ Caído"}
                </span>
              </div>
              <p className="admin-hint" style={{ margin: ".2rem 0" }}>{resumenDispositivo(d.userAgent)}</p>
              <div style={{ fontSize: ".8em", opacity: 0.85, display: "grid", gap: ".15rem" }}>
                <span>Avisos recibidos: {d.enviados} · Último: {formatFechaHora(d.ultimoEnvio)}</span>
                <span>Activado: {formatFechaHora(d.creadoEn)}</span>
                {!d.activa && (
                  <span style={{ color: "#e5484d" }}>
                    Se desactivó el {formatFechaHora(d.fallidaEn)} — {motivoFallo(d.fallidaCod)}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
