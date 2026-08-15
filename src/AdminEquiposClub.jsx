import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";
import { TablaClasificacion } from "./AdminCompeticionesExternas.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminEquiposClub({ token, salir }) {
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [escudoUrl, setEscudoUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [abiertoId, setAbiertoId] = useState(null);

  const cargarEquipos = () => {
    fetch(`${API_URL}/api/equipos-club/admin`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setEquipos)
      .catch(() => {});
  };
  const cargarJugadores = () => {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {});
  };
  const cargarTorneos = () => {
    fetch(`${API_URL}/api/competiciones-externas/torneos/admin`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTorneos)
      .catch(() => {});
  };
  const cargarMaquinas = () => {
    fetch(`${API_URL}/api/maquinas`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMaquinas)
      .catch(() => {});
  };

  useEffect(() => {
    cargarEquipos();
    cargarJugadores();
    cargarTorneos();
    cargarMaquinas();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/equipos-club`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre, descripcion, escudoUrl }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el equipo." });
        return;
      }
      setNombre(""); setDescripcion(""); setEscudoUrl("");
      setMensaje({ tipo: "ok", texto: "Equipo creado." });
      cargarEquipos();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  async function borrarEquipo(id) {
    if (!confirm("¿Borrar este equipo, su plantilla y sus inscripciones en competiciones?")) return;
    await fetch(`${API_URL}/api/equipos-club/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (abiertoId === id) setAbiertoId(null);
    cargarEquipos();
  }

  async function anadirMiembro(equipoId, jugadorId) {
    await fetch(`${API_URL}/api/equipos-club/${equipoId}/miembros`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ jugadorId }),
    });
    cargarEquipos();
  }
  async function quitarMiembro(equipoId, jugadorId) {
    await fetch(`${API_URL}/api/equipos-club/${equipoId}/miembros/${jugadorId}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    cargarEquipos();
  }
  async function marcarCapitan(equipoId, capitanId) {
    await fetch(`${API_URL}/api/equipos-club/${equipoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ capitanId }),
    });
    cargarEquipos();
  }

  // ---------- Inscripciones en competiciones externas ----------
  async function inscribir(equipoId, torneoId) {
    if (!torneoId) return;
    const res = await fetch(`${API_URL}/api/equipos-club/${equipoId}/inscripciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ torneoId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo inscribir en la competición." });
      return;
    }
    cargarEquipos();
  }
  async function quitarInscripcion(equipoId, inscripcionId) {
    if (!confirm("¿Quitar este equipo de la competición? Se borran también sus partidos.")) return;
    await fetch(`${API_URL}/api/equipos-club/${equipoId}/inscripciones/${inscripcionId}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    cargarEquipos();
  }
  async function asignarCapitanInscripcion(inscripcionId, capitanId) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${inscripcionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ capitanId: capitanId || null }),
    });
    cargarEquipos();
  }
  async function guardarIdExternoEquipo(inscripcionId, idExternoEquipo) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${inscripcionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ idExternoEquipo }),
    });
    cargarEquipos();
  }
  async function anadirJugadorInscripcion(inscripcionId, jugadorId) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${inscripcionId}/jugadores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ jugadorId }),
    });
    cargarEquipos();
  }
  async function quitarJugadorInscripcion(inscripcionId, jugadorId) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${inscripcionId}/jugadores/${jugadorId}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    cargarEquipos();
  }
  async function crearPartido(inscripcionId, fecha, rival) {
    if (!fecha) return;
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${inscripcionId}/partidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ fecha, rival }),
    });
    cargarEquipos();
  }
  async function actualizarPartido(id, datos) {
    await fetch(`${API_URL}/api/competiciones-externas/partidos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarEquipos();
  }
  async function borrarPartido(id) {
    if (!confirm("¿Borrar este partido?")) return;
    await fetch(`${API_URL}/api/competiciones-externas/partidos/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarEquipos();
  }

  return (
    <section className="admin-form">
      <h2>Equipos del club</h2>

      <form onSubmit={crear} className="admin-form" style={{ marginBottom: "1.5rem" }}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Descripción (opcional)
          <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        <label>
          Escudo (opcional)
          <SelectorImagen
            token={token}
            valor={escudoUrl}
            onCambiar={setEscudoUrl}
            onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
            etiqueta="Escudo"
          />
        </label>
        <button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear equipo"}</button>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      {equipos.length === 0 && <p className="chronicle-status">Todavía no hay equipos.</p>}

      <ul>
        {equipos.map((eq) => {
          const idsEnEquipo = new Set(eq.miembros.map((m) => m.jugadorId));
          const disponibles = jugadores.filter((j) => !idsEnEquipo.has(j.id));
          const torneosInscritosIds = new Set(eq.inscripciones.map((i) => i.torneoId));
          const torneosDisponibles = torneos.filter((t) => !torneosInscritosIds.has(t.id));
          return (
            <li key={eq.id} className="admin-cuadrante" style={{ marginBottom: "1rem" }}>
              <div className="admin-list-item">
                <strong>{eq.nombre}</strong>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <button className="admin-link-btn" onClick={() => setAbiertoId(abiertoId === eq.id ? null : eq.id)}>
                    {abiertoId === eq.id ? "Cerrar" : "Gestionar"}
                  </button>
                  <button className="admin-link-btn" onClick={() => borrarEquipo(eq.id)}>Borrar</button>
                </div>
              </div>

              {abiertoId === eq.id && (
                <div style={{ marginTop: ".8rem" }}>
                  <h5>Plantilla ({eq.miembros.length})</h5>
                  <ul>
                    {eq.miembros.map((m) => (
                      <li key={m.id} className="admin-list-item">
                        <span>{m.jugador.nombre}{eq.capitanId === m.jugadorId ? " — Capitán" : ""}</span>
                        <div style={{ display: "flex", gap: ".5rem" }}>
                          {eq.capitanId !== m.jugadorId && (
                            <button className="admin-link-btn" onClick={() => marcarCapitan(eq.id, m.jugadorId)}>Hacer capitán</button>
                          )}
                          <button className="admin-link-btn" onClick={() => quitarMiembro(eq.id, m.jugadorId)}>Quitar</button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {disponibles.length > 0 && (
                    <div style={{ marginTop: ".6rem" }}>
                      <p className="admin-hint">Añadir del plantel del club:</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                        {disponibles.map((j) => (
                          <button key={j.id} type="button" className="admin-link-btn" onClick={() => anadirMiembro(eq.id, j.id)}>
                            ＋ {j.nombre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <h5 style={{ marginTop: "1.2rem" }}>Competiciones en las que compite</h5>
                  {eq.inscripciones.length === 0 && (
                    <p className="chronicle-status">Todavía no está inscrito en ninguna competición externa.</p>
                  )}
                  {eq.inscripciones.map((inscripcion) => (
                    <InscripcionBloque
                      key={inscripcion.id}
                      inscripcion={inscripcion}
                      miembrosClub={eq.miembros}
                      maquinas={maquinas}
                      onQuitarInscripcion={() => quitarInscripcion(eq.id, inscripcion.id)}
                      onAsignarCapitan={(capitanId) => asignarCapitanInscripcion(inscripcion.id, capitanId)}
                      onGuardarIdExterno={(idExternoEquipo) => guardarIdExternoEquipo(inscripcion.id, idExternoEquipo)}
                      onAnadirJugador={(jugadorId) => anadirJugadorInscripcion(inscripcion.id, jugadorId)}
                      onQuitarJugador={(jugadorId) => quitarJugadorInscripcion(inscripcion.id, jugadorId)}
                      onCrearPartido={(fecha, rival) => crearPartido(inscripcion.id, fecha, rival)}
                      onActualizarPartido={actualizarPartido}
                      onBorrarPartido={borrarPartido}
                    />
                  ))}

                  {torneosDisponibles.length > 0 && (
                    <InscribirEnCompeticion
                      opciones={torneosDisponibles}
                      onInscribir={(torneoId) => inscribir(eq.id, torneoId)}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function InscribirEnCompeticion({ opciones, onInscribir }) {
  const [torneoId, setTorneoId] = useState("");
  return (
    <div className="admin-inline-form" style={{ marginTop: ".8rem" }}>
      <label>
        Inscribir en una competición
        <select value={torneoId} onChange={(e) => setTorneoId(e.target.value)}>
          <option value="">Elige un torneo/liga…</option>
          {opciones.map((t) => (
            <option key={t.id} value={t.id}>{t.plataforma?.nombre} — {t.nombre}</option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={!torneoId}
        onClick={() => { onInscribir(torneoId); setTorneoId(""); }}
      >
        Inscribir
      </button>
    </div>
  );
}

function InscripcionBloque({ inscripcion, miembrosClub, maquinas, onQuitarInscripcion, onAsignarCapitan, onGuardarIdExterno, onAnadirJugador, onQuitarJugador, onCrearPartido, onActualizarPartido, onBorrarPartido }) {
  const [fechaPartido, setFechaPartido] = useState("");
  const [rivalPartido, setRivalPartido] = useState("");
  const idsEnInscripcion = new Set(inscripcion.jugadores.map((j) => j.jugadorId));
  const disponiblesParaEsta = miembrosClub.filter((m) => !idsEnInscripcion.has(m.jugadorId));
  const esPhoenix = (inscripcion.torneo.plataforma?.nombre || "").toLowerCase().includes("phoenix");
  // Si esta inscripción tiene su propia clasificación (plataformas por
  // equipo, como Phoenix), se muestra esa; si no, la del torneo entero
  // (Radikal, tabla compartida por todos los equipos).
  const filasClasificacion = inscripcion.clasificacion?.length > 0 ? inscripcion.clasificacion : inscripcion.torneo.clasificacion;

  return (
    <div className="admin-cuadrante-participantes" style={{ marginTop: "1rem" }}>
      <div className="admin-list-item">
        <strong>{inscripcion.torneo.plataforma?.nombre} — {inscripcion.torneo.nombre}</strong>
        <button className="admin-link-btn" onClick={onQuitarInscripcion}>Quitar de esta competición</button>
      </div>

      <label>
        Capitán en esta competición
        <select value={inscripcion.capitanId || ""} onChange={(e) => onAsignarCapitan(e.target.value)}>
          <option value="">Sin asignar</option>
          {inscripcion.jugadores.map((j) => <option key={j.jugadorId} value={j.jugadorId}>{j.jugador.nombre}</option>)}
        </select>
      </label>

      {esPhoenix && (
        <label style={{ display: "block", marginTop: ".6rem" }}>
          Nombre de este equipo en Phoenix Darts
          <input
            defaultValue={inscripcion.idExternoEquipo || ""}
            placeholder="Ej: VDC Gentlemen"
            onBlur={(e) => onGuardarIdExterno(e.target.value.trim())}
          />
          <span className="admin-hint">
            Nombre EXACTO tal como está registrado en Phoenix Darts (puede ser distinto al nombre de este equipo aquí en
            la web del club). Hace falta para poder actualizar su clasificación, sobre todo si otros equipos del club
            compiten a la vez en este mismo torneo/liga.
          </span>
        </label>
      )}

      <h5 style={{ marginTop: ".8rem" }}>Plantilla en esta competición ({inscripcion.jugadores.length})</h5>
      <p className="admin-hint">Se copió la plantilla del club al inscribirse; ajústala aquí si en esta competición concreta juega gente distinta.</p>
      <ul>
        {inscripcion.jugadores.map((j) => (
          <li key={j.jugadorId} className="admin-list-item">
            <span>{j.jugador.nombre}{inscripcion.capitanId === j.jugadorId ? " — Capitán" : ""}</span>
            <button className="admin-link-btn" onClick={() => onQuitarJugador(j.jugadorId)}>Quitar</button>
          </li>
        ))}
      </ul>
      {disponiblesParaEsta.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBottom: ".8rem" }}>
          {disponiblesParaEsta.map((m) => (
            <button key={m.jugadorId} type="button" className="admin-link-btn" onClick={() => onAnadirJugador(m.jugadorId)}>
              ＋ {m.jugador.nombre}
            </button>
          ))}
        </div>
      )}

      <TablaClasificacion filas={filasClasificacion} />

      <h5 style={{ marginTop: ".8rem" }}>Partidos</h5>
      <div className="admin-inline-form">
        <label>
          Fecha y hora
          <input type="datetime-local" value={fechaPartido} onChange={(e) => setFechaPartido(e.target.value)} />
        </label>
        <label>
          Rival (opcional)
          <input value={rivalPartido} onChange={(e) => setRivalPartido(e.target.value)} />
        </label>
        <button
          type="button"
          disabled={!fechaPartido}
          onClick={() => { onCrearPartido(new Date(fechaPartido).toISOString(), rivalPartido); setFechaPartido(""); setRivalPartido(""); }}
        >
          Añadir partido
        </button>
      </div>

      <ul>
        {inscripcion.partidos.map((p) => (
          <li key={p.id} className="admin-list-item" style={{ flexWrap: "wrap" }}>
            <div>
              <strong>{new Date(p.fecha).toLocaleString("es-ES")}</strong> — vs {p.rival || "?"}
              {p.fijado ? " · confirmado" : " · sin confirmar"}
              {p.maquina ? ` · ${p.maquina.nombre}` : ""}
              {p.resultado ? ` · ${p.resultado}` : ""}
            </div>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              <select defaultValue={p.maquinaId || ""} onChange={(e) => onActualizarPartido(p.id, { maquinaId: e.target.value || null })}>
                <option value="">Sin máquina</option>
                {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
              <input
                defaultValue={p.resultado || ""}
                placeholder="Resultado"
                onBlur={(e) => onActualizarPartido(p.id, { resultado: e.target.value })}
                style={{ width: "90px" }}
              />
              <button className="admin-link-btn" onClick={() => onActualizarPartido(p.id, { fijado: !p.fijado })}>
                {p.fijado ? "Desconfirmar" : "Confirmar"}
              </button>
              <button className="admin-link-btn" onClick={() => onBorrarPartido(p.id)}>Borrar</button>
            </div>
          </li>
        ))}
        {inscripcion.partidos.length === 0 && <li className="chronicle-status">Sin partidos todavía.</li>}
      </ul>
    </div>
  );
}
