import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

// El significado de "Id externo" depende de la plataforma: en Radikal Darts
// es el nombre de la COMPETICIÓN (una única tabla compartida por todo el
// torneo/liga). En Phoenix Darts, en cambio, la búsqueda pública parte del
// EQUIPO, y un mismo torneo/liga puede tener VARIOS equipos del club
// inscritos a la vez (cada uno en su propio grupo) — así que ahí el nombre
// de cada equipo ya no se pone aquí, se pone en su propia inscripción,
// desde la pestaña "Equipos". Este campo se deja solo como último recurso
// (se usa si una inscripción de Phoenix no tiene su propio nombre puesto).
function hintIdExterno(nombrePlataforma) {
  const p = (nombrePlataforma || "").toLowerCase();
  if (p.includes("phoenix")) {
    return 'Para Phoenix Darts ya no hace falta rellenar esto: el nombre de cada equipo se indica por separado en su inscripción, en la pestaña "Equipos" (necesario porque varios equipos del club pueden competir a la vez en este mismo torneo/liga). Este campo solo se usaría como último recurso.';
  }
  if (p.includes("radikal")) {
    return "Nombre EXACTO de la competición tal como aparece en la web de Radikal Darts.";
  }
  return 'Nombre EXACTO tal como aparece en la web de la plataforma. Hace falta para poder actualizar la clasificación automáticamente (por ahora solo Radikal Darts y Phoenix Darts).';
}

function placeholderIdExterno(nombrePlataforma) {
  const p = (nombrePlataforma || "").toLowerCase();
  if (p.includes("phoenix")) return "Ej: VDC Gentlemen";
  if (p.includes("radikal")) return "Ej: 13 Vegas 2026";
  return "";
}

export default function AdminCompeticionesExternas({ token, salir }) {
  const [plataformas, setPlataformas] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [nombrePlataforma, setNombrePlataforma] = useState("");

  const [nombreTorneo, setNombreTorneo] = useState("");
  const [nivel, setNivel] = useState("");
  const [temporada, setTemporada] = useState("");
  const [plataformaSel, setPlataformaSel] = useState("");
  const [idExternoTorneo, setIdExternoTorneo] = useState("");

  const [abiertoId, setAbiertoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [clasificando, setClasificando] = useState(null);
  const [mensajeClasificacion, setMensajeClasificacion] = useState({});
  const [actualizandoTodas, setActualizandoTodas] = useState(false);
  const [resumenActualizacionTodas, setResumenActualizacionTodas] = useState(null);

  const nombrePlataformaPorId = (id) => plataformas.find((p) => p.id === id)?.nombre || "";

  const cargarTodo = () => {
    fetch(`${API_URL}/api/competiciones-externas/plataformas`).then((r) => r.json()).then(setPlataformas).catch(() => {});
    fetch(`${API_URL}/api/competiciones-externas/torneos/admin`, { headers: { "x-admin-token": token } }).then((r) => r.json()).then(setTorneos).catch(() => {});
  };

  useEffect(() => {
    cargarTodo();
  }, []);

  async function crearPlataforma(e) {
    e.preventDefault();
    if (!nombrePlataforma.trim()) return;
    await fetch(`${API_URL}/api/competiciones-externas/plataformas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ nombre: nombrePlataforma.trim() }),
    });
    setNombrePlataforma("");
    cargarTodo();
  }
  async function borrarPlataforma(id) {
    if (!confirm("¿Borrar esta plataforma? (debe no tener torneos)")) return;
    setMensaje(null);
    const res = await fetch(`${API_URL}/api/competiciones-externas/plataformas/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo borrar la plataforma." });
      return;
    }
    cargarTodo();
  }

  async function crearTorneo(e) {
    e.preventDefault();
    if (!nombreTorneo.trim() || !plataformaSel) return;
    const res = await fetch(`${API_URL}/api/competiciones-externas/torneos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        nombre: nombreTorneo.trim(),
        nivel,
        temporada,
        plataformaId: plataformaSel,
        idExterno: idExternoTorneo.trim(),
      }),
    });
    if (res.status === 401) { setMensaje({ tipo: "error", texto: "Contraseña incorrecta." }); salir(); return; }
    setNombreTorneo(""); setNivel(""); setTemporada(""); setPlataformaSel(""); setIdExternoTorneo("");
    cargarTodo();
  }
  async function borrarTorneo(id) {
    if (!confirm("¿Borrar este torneo/liga y las inscripciones de equipos en él?")) return;
    await fetch(`${API_URL}/api/competiciones-externas/torneos/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTodo();
  }
  async function guardarIdExterno(id, idExterno) {
    await fetch(`${API_URL}/api/competiciones-externas/torneos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ idExterno }),
    });
    cargarTodo();
  }
  async function actualizarClasificacion(id) {
    setClasificando(id);
    setMensajeClasificacion((m) => ({ ...m, [id]: null }));
    try {
      const res = await fetch(`${API_URL}/api/competiciones-externas/torneos/${id}/actualizar-clasificacion`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensajeClasificacion((m) => ({ ...m, [id]: { tipo: "error", texto: data.error || "No se pudo actualizar." } }));
        return;
      }
      const texto =
        data.avisosClasificacion?.length > 0
          ? `Clasificación actualizada, pero con avisos — ${data.avisosClasificacion.join(" · ")}`
          : "Clasificación actualizada.";
      setMensajeClasificacion((m) => ({ ...m, [id]: { tipo: "ok", texto } }));
      cargarTodo();
    } catch {
      setMensajeClasificacion((m) => ({ ...m, [id]: { tipo: "error", texto: "Error de conexión." } }));
    } finally {
      setClasificando(null);
    }
  }

  async function actualizarTodasLasClasificaciones() {
    setActualizandoTodas(true);
    setResumenActualizacionTodas(null);
    try {
      const res = await fetch(`${API_URL}/api/competiciones-externas/actualizar-todas-clasificaciones`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo actualizar las clasificaciones." });
        return;
      }
      setResumenActualizacionTodas(data);
      cargarTodo();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setActualizandoTodas(false);
    }
  }

  return (
    <section className="admin-form">
      <h2>Competiciones externas</h2>
      <p className="admin-hint">
        Aquí solo se dan de alta las competiciones (plataforma, nombre de la liga/torneo). Los equipos que
        participan en ellas se gestionan desde la pestaña "Equipos" — cada equipo del club se inscribe en la
        competición que le corresponda.
      </p>

      <section style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1.2rem" }}>
        <h3 style={{ marginTop: 0 }}>Clasificación de todos los torneos/ligas</h3>
        <p className="admin-hint" style={{ marginTop: 0 }}>
          Actualiza de golpe la clasificación de todos los torneos/ligas dados de alta (Radikal Darts y Phoenix
          Darts; Connection Darts se omite hasta que tenga soporte). Se ejecuta también sola cada noche, media
          hora después de las medias.
        </p>
        <button type="button" onClick={actualizarTodasLasClasificaciones} disabled={actualizandoTodas}>
          {actualizandoTodas ? "Actualizando…" : "Actualizar todas las clasificaciones ahora"}
        </button>
        {resumenActualizacionTodas && (
          <ul style={{ marginTop: ".8rem" }}>
            {resumenActualizacionTodas.detalle.map((d, i) => (
              <li key={i}>
                <strong>{d.torneo}:</strong>{" "}
                {d.estado === "omitido" && `omitido (${d.motivo})`}
                {d.estado === "error" && `error: ${d.error}`}
                {d.estado === "ok" && (d.avisos ? `actualizado, con avisos — ${d.avisos.join(" · ")}` : "actualizado")}
              </li>
            ))}
          </ul>
        )}
      </section>

      <h3>Plataformas</h3>
      <form onSubmit={crearPlataforma} className="admin-inline-form">
        <label>
          Nombre
          <input value={nombrePlataforma} onChange={(e) => setNombrePlataforma(e.target.value)} placeholder="Ej: Radikal" />
        </label>
        <button type="submit" disabled={!nombrePlataforma.trim()}>Añadir plataforma</button>
      </form>
      <ul>
        {plataformas.map((p) => (
          <li key={p.id} className="admin-list-item">
            <span>{p.nombre}</span>
            <button className="admin-link-btn" onClick={() => borrarPlataforma(p.id)}>Borrar</button>
          </li>
        ))}
      </ul>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      <h3 style={{ marginTop: "1.5rem" }}>Torneos / Ligas externas</h3>
      <form onSubmit={crearTorneo} className="admin-form">
        <label>
          Nombre
          <input value={nombreTorneo} onChange={(e) => setNombreTorneo(e.target.value)} required />
        </label>
        <label>
          Nivel (opcional)
          <input value={nivel} onChange={(e) => setNivel(e.target.value)} placeholder="Ej: 2ª división" />
        </label>
        <label>
          Temporada (opcional)
          <input value={temporada} onChange={(e) => setTemporada(e.target.value)} placeholder="Ej: 2025-26" />
        </label>
        <label>
          Plataforma
          <select value={plataformaSel} onChange={(e) => setPlataformaSel(e.target.value)} required>
            <option value="">Elige…</option>
            {plataformas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <label>
          Id externo (opcional)
          <input
            value={idExternoTorneo}
            onChange={(e) => setIdExternoTorneo(e.target.value)}
            placeholder={placeholderIdExterno(nombrePlataformaPorId(plataformaSel))}
          />
          <span className="admin-hint">{hintIdExterno(nombrePlataformaPorId(plataformaSel))}</span>
        </label>
        <button type="submit">Crear torneo/liga</button>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      {torneos.map((t) => (
        <div key={t.id} className="admin-cuadrante" style={{ marginTop: "1rem" }}>
          <div className="admin-cuadrante-header">
            <h4>{t.nombre} — {t.plataforma?.nombre}{t.nivel ? ` · ${t.nivel}` : ""}{t.temporada ? ` · ${t.temporada}` : ""}</h4>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="admin-link-btn" onClick={() => setAbiertoId(abiertoId === t.id ? null : t.id)}>
                {abiertoId === t.id ? "Cerrar" : "Gestionar"}
              </button>
              <button className="admin-link-btn" onClick={() => borrarTorneo(t.id)}>Borrar</button>
            </div>
          </div>

          {abiertoId === t.id && (
            <div>
              <label style={{ display: "block", marginTop: ".8rem" }}>
                Id externo
                <input
                  defaultValue={t.idExterno || ""}
                  placeholder={placeholderIdExterno(t.plataforma?.nombre)}
                  onBlur={(e) => guardarIdExterno(t.id, e.target.value.trim())}
                />
                <span className="admin-hint">{hintIdExterno(t.plataforma?.nombre)}</span>
              </label>

              <div style={{ marginTop: ".6rem", display: "flex", gap: ".5rem", alignItems: "center" }}>
                <button type="button" disabled={clasificando === t.id} onClick={() => actualizarClasificacion(t.id)}>
                  {clasificando === t.id ? "Actualizando…" : "Actualizar clasificación"}
                </button>
                {t.clasificacion?.length > 0 && (
                  <span className="admin-hint">
                    Última actualización: {new Date(t.clasificacion[0].actualizadoEn).toLocaleString("es-ES")}
                  </span>
                )}
              </div>
              {mensajeClasificacion[t.id] && (
                <p className={`admin-msg admin-msg-${mensajeClasificacion[t.id].tipo}`}>{mensajeClasificacion[t.id].texto}</p>
              )}

              {/* Tabla compartida por todo el torneo/liga (Radikal). En
                  plataformas por equipo (Phoenix) esto queda vacío — cada
                  equipo tiene su propia tabla, ver debajo. */}
              <TablaClasificacion filas={t.clasificacion} />

              {t.equipos?.map((eq) => (
                eq.clasificacion?.length > 0 && (
                  <div key={eq.id} style={{ marginTop: ".8rem" }}>
                    <p className="admin-hint" style={{ marginBottom: 0 }}>
                      <strong>{eq.equipoClub?.nombre || eq.nombreEquipo || "Vikings"}</strong>
                      {eq.idExternoEquipo ? ` (${eq.idExternoEquipo} en ${t.plataforma?.nombre})` : ""}
                    </p>
                    <TablaClasificacion filas={eq.clasificacion} />
                  </div>
                )
              ))}

              <p className="admin-hint" style={{ marginTop: ".8rem" }}>
                {t.equipos?.length > 0
                  ? `Equipos del club inscritos: ${t.equipos.map((eq) => eq.equipoClub?.nombre || eq.nombreEquipo || "Vikings").join(", ")}. Gestiónalos desde la pestaña "Equipos".`
                  : 'Todavía no hay ningún equipo del club inscrito en esta competición. Ve a la pestaña "Equipos" para inscribir uno.'}
              </p>
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

// Tabla de clasificación general (todos los equipos de la competición, no
// solo los del club), de solo lectura — se rellena vía "Actualizar
// clasificación". Se usa en el panel de admin (aquí y en la pestaña
// Equipos) y en la vista de socios (Competiciones.jsx).
export function TablaClasificacion({ filas }) {
  if (!filas || filas.length === 0) return null;
  return (
    <div style={{ overflowX: "auto", marginTop: ".8rem" }}>
      <table className="admin-tabla-clasificacion">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Equipo</th>
            <th>Puntos</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PP</th>
            <th>PE</th>
            <th>JG</th>
            <th>JP</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <td>{f.posicion}</td>
              <td>{f.nombreEquipo}</td>
              <td>{f.puntos ?? "—"}</td>
              <td>{f.partidosJugados ?? "—"}</td>
              <td>{f.partidosGanados ?? "—"}</td>
              <td>{f.partidosPerdidos ?? "—"}</td>
              <td>{f.partidosEmpatados ?? "—"}</td>
              <td>{f.juegosGanados ?? "—"}</td>
              <td>{f.juegosPerdidos ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
