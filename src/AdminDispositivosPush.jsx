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

const ETIQUETAS_EVENTO = {
  envio: { texto: "Enviado", color: "var(--ember)" },
  error: { texto: "Error", color: "#e5484d" },
  caida: { texto: "Caído", color: "#e5484d" },
  sinDispositivo: { texto: "Sin dispositivo", color: "#f5a524" },
  alta: { texto: "Activado", color: "#46a758" },
  reactivada: { texto: "Reactivado solo", color: "#46a758" },
};
const EVENTOS_PROBLEMA = new Set(["error", "caida", "sinDispositivo"]);

const ETIQUETAS_AVISO = {
  bienvenida: "Bienvenida (sorteo)",
  unMinuto: "Queda 1 minuto",
  enCurso: "Partido en curso",
  programado: "Partido programado",
  eliminado: "Eliminado",
  campeon: "Campeón",
  recordatorio: "Recordatorio del día",
  anuncio: "Anuncio",
  partidoFijado: "Partido fijado",
};

function formatFechaHoraSegundos(iso) {
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Historial de avisos push (envíos, errores, caídas y reactivaciones), para
// diagnosticar un aviso que "no llegó" aunque el dispositivo ya vuelva a
// estar activo: la lista de dispositivos de arriba solo enseña el estado
// actual, y los avisos se reactivan solos. Se filtra por día y socio en el
// servidor; "solo problemas" se aplica aquí.
function HistorialPush({ token, salir }) {
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [dia, setDia] = useState("");
  const [jugadorId, setJugadorId] = useState("");
  const [soloProblemas, setSoloProblemas] = useState(false);
  // Socios que han aparecido en alguna carga, para el desplegable: así no se
  // pierden de la lista al filtrar por uno de ellos.
  const [socios, setSocios] = useState({});

  const cargar = () => {
    setCargando(true);
    setError(null);
    const params = new URLSearchParams({ limite: "1000" });
    if (jugadorId) params.set("jugadorId", jugadorId);
    if (dia) {
      params.set("desde", new Date(`${dia}T00:00:00`).toISOString());
      params.set("hasta", new Date(`${dia}T23:59:59.999`).toISOString());
    }
    fetch(`${API_URL}/api/notificaciones/push/admin/registro?${params}`, { headers: { "x-admin-token": token } })
      .then((r) => {
        if (r.status === 401) {
          salir();
          return [];
        }
        return r.ok ? r.json() : Promise.reject(new Error("No se pudo cargar el historial."));
      })
      .then((datos) => {
        setRegistros(datos);
        setSocios((prev) => {
          const nuevo = { ...prev };
          for (const r of datos) nuevo[r.jugadorId] = r.jugadorNombre;
          return nuevo;
        });
      })
      .catch((e) => setError(e.message || "Error de conexión."))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dia, jugadorId]);

  const mostrados = soloProblemas ? registros.filter((r) => EVENTOS_PROBLEMA.has(r.evento)) : registros;
  const problemas = registros.filter((r) => EVENTOS_PROBLEMA.has(r.evento)).length;
  const listaSocios = Object.entries(socios).sort((a, b) => a[1].localeCompare(b[1], "es"));

  return (
    <>
      <h2 style={{ marginTop: "2rem" }}>Historial de avisos (push)</h2>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        Cada aviso que se intenta mandar a cada dispositivo, con su resultado, y cuándo se activó o reactivó solo cada
        uno. <strong>Enviado</strong> significa que Google/Apple lo aceptaron: si aun así no llegó, se perdió en el móvil
        (ahorro de batería, permiso del sistema…). <strong>Sin dispositivo</strong> es que el socio no tenía ninguno activo
        en ese momento. Se guarda 60 días.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", margin: ".5rem 0 1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: ".4rem", margin: 0 }}>
          Día
          <input type="date" value={dia} onChange={(e) => setDia(e.target.value)} style={{ width: "auto" }} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: ".4rem", margin: 0 }}>
          Socio
          <select value={jugadorId} onChange={(e) => setJugadorId(e.target.value)} style={{ width: "auto" }}>
            <option value="">Todos</option>
            {listaSocios.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: ".4rem", margin: 0 }}>
          <input
            type="checkbox"
            checked={soloProblemas}
            onChange={(e) => setSoloProblemas(e.target.checked)}
            style={{ width: "auto" }}
          />
          Solo problemas ({problemas})
        </label>
        <button type="button" className="admin-link-btn" onClick={cargar} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      {!cargando && mostrados.length === 0 && !error && (
        <p className="chronicle-status">No hay nada registrado con estos filtros.</p>
      )}

      {mostrados.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {mostrados.map((r) => {
            const ev = ETIQUETAS_EVENTO[r.evento] || { texto: r.evento, color: "inherit" };
            return (
              <li
                key={r.id}
                className="admin-cuadrante"
                style={{ marginBottom: ".5rem", padding: ".5rem .8rem", borderLeft: `3px solid ${ev.color}` }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: ".5rem" }}>
                  <span>
                    <strong>{r.jugadorNombre}</strong>
                    {r.tipoAviso && <> · {ETIQUETAS_AVISO[r.tipoAviso] || r.tipoAviso}</>}
                  </span>
                  <span style={{ fontSize: ".8em", fontWeight: "bold", color: ev.color }}>
                    {ev.texto}
                    {r.codigo ? ` ${r.codigo}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: ".8em", opacity: 0.85, display: "grid", gap: ".15rem" }}>
                  <span>
                    {formatFechaHoraSegundos(r.creadoEn)}
                    {r.userAgent && <> · {resumenDispositivo(r.userAgent)}</>}
                  </span>
                  {r.titulo && <span>{r.titulo}</span>}
                  {r.detalle && <span style={{ wordBreak: "break-word" }}>{r.detalle}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
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

      <HistorialPush token={token} salir={salir} />
    </section>
  );
}
