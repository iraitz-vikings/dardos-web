import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminCompeticionesExternas({ token, salir }) {
  const [plataformas, setPlataformas] = useState([]);
  const [torneos, setTorneos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [nombrePlataforma, setNombrePlataforma] = useState("");

  const [nombreTorneo, setNombreTorneo] = useState("");
  const [nivel, setNivel] = useState("");
  const [temporada, setTemporada] = useState("");
  const [plataformaSel, setPlataformaSel] = useState("");

  const [abiertoId, setAbiertoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const cargarTodo = () => {
    fetch(`${API_URL}/api/competiciones-externas/plataformas`).then((r) => r.json()).then(setPlataformas).catch(() => {});
    fetch(`${API_URL}/api/competiciones-externas/torneos/admin`, { headers: { "x-admin-token": token } }).then((r) => r.json()).then(setTorneos).catch(() => {});
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } }).then((r) => r.json()).then(setJugadores).catch(() => {});
    fetch(`${API_URL}/api/maquinas`).then((r) => r.json()).then(setMaquinas).catch(() => {});
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
    await fetch(`${API_URL}/api/competiciones-externas/plataformas/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTodo();
  }

  async function crearTorneo(e) {
    e.preventDefault();
    if (!nombreTorneo.trim() || !plataformaSel) return;
    const res = await fetch(`${API_URL}/api/competiciones-externas/torneos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ nombre: nombreTorneo.trim(), nivel, temporada, plataformaId: plataformaSel }),
    });
    if (res.status === 401) { setMensaje({ tipo: "error", texto: "Contraseña incorrecta." }); salir(); return; }
    setNombreTorneo(""); setNivel(""); setTemporada(""); setPlataformaSel("");
    cargarTodo();
  }
  async function borrarTorneo(id) {
    if (!confirm("¿Borrar este torneo externo, sus equipos y partidos?")) return;
    await fetch(`${API_URL}/api/competiciones-externas/torneos/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTodo();
  }

  async function crearEquipo(torneoId, nombreEquipo) {
    await fetch(`${API_URL}/api/competiciones-externas/torneos/${torneoId}/equipos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ nombreEquipo }),
    });
    cargarTodo();
  }
  async function asignarCapitan(equipoId, capitanId) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${equipoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ capitanId: capitanId || null }),
    });
    cargarTodo();
  }
  async function borrarEquipo(id) {
    if (!confirm("¿Borrar este equipo y sus partidos?")) return;
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTodo();
  }
  async function anadirJugadorEquipo(equipoId, jugadorId) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${equipoId}/jugadores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ jugadorId }),
    });
    cargarTodo();
  }
  async function quitarJugadorEquipo(equipoId, jugadorId) {
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${equipoId}/jugadores/${jugadorId}`, {
      method: "DELETE", headers: { "x-admin-token": token },
    });
    cargarTodo();
  }

  async function crearPartido(equipoId, fecha, rival) {
    if (!fecha) return;
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${equipoId}/partidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ fecha, rival }),
    });
    cargarTodo();
  }
  async function actualizarPartido(id, datos) {
    await fetch(`${API_URL}/api/competiciones-externas/partidos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarTodo();
  }
  async function borrarPartido(id) {
    if (!confirm("¿Borrar este partido?")) return;
    await fetch(`${API_URL}/api/competiciones-externas/partidos/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTodo();
  }

  return (
    <section className="admin-form">
      <h2>Competiciones externas</h2>

      <h3>Plataformas</h3>
      <form onSubmit={crearPlataforma} className="admin-inline-form">
        <label>
          Nombre
          <input value={nombrePlataforma} onChange={(e) => setNombrePlataforma(e.target.value)} placeholder="Ej: Phoenix" />
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

      <h3 style={{ marginTop: "1.5rem" }}>Torneos externos</h3>
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
        <button type="submit">Crear torneo</button>
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
              <NuevoEquipo onCrear={(nombre) => crearEquipo(t.id, nombre)} />
              {t.equipos.map((eq) => (
                <EquipoBloque
                  key={eq.id}
                  equipo={eq}
                  jugadores={jugadores}
                  maquinas={maquinas}
                  onAsignarCapitan={(capitanId) => asignarCapitan(eq.id, capitanId)}
                  onBorrarEquipo={() => borrarEquipo(eq.id)}
                  onAnadirJugador={(jugadorId) => anadirJugadorEquipo(eq.id, jugadorId)}
                  onQuitarJugador={(jugadorId) => quitarJugadorEquipo(eq.id, jugadorId)}
                  onCrearPartido={(fecha, rival) => crearPartido(eq.id, fecha, rival)}
                  onActualizarPartido={actualizarPartido}
                  onBorrarPartido={borrarPartido}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function NuevoEquipo({ onCrear }) {
  const [nombre, setNombre] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (nombre.trim()) { onCrear(nombre.trim()); setNombre(""); } }}
      className="admin-inline-form"
      style={{ marginTop: ".8rem" }}
    >
      <label>
        Nombre del equipo del club
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Vikings A" />
      </label>
      <button type="submit" disabled={!nombre.trim()}>Crear equipo</button>
    </form>
  );
}

function EquipoBloque({ equipo, jugadores, maquinas, onAsignarCapitan, onBorrarEquipo, onAnadirJugador, onQuitarJugador, onCrearPartido, onActualizarPartido, onBorrarPartido }) {
  const [fechaPartido, setFechaPartido] = useState("");
  const [rivalPartido, setRivalPartido] = useState("");
  const idsEnEquipo = new Set(equipo.jugadores.map((j) => j.jugadorId));
  const disponibles = jugadores.filter((j) => !idsEnEquipo.has(j.id));

  return (
    <div className="admin-cuadrante-participantes" style={{ marginTop: "1rem" }}>
      <div className="admin-list-item">
        <strong>{equipo.nombreEquipo || "Vikings"}</strong>
        <button className="admin-link-btn" onClick={onBorrarEquipo}>Borrar equipo</button>
      </div>

      <label>
        Capitán
        <select value={equipo.capitanId || ""} onChange={(e) => onAsignarCapitan(e.target.value)}>
          <option value="">Sin asignar</option>
          {equipo.jugadores.map((j) => <option key={j.jugadorId} value={j.jugadorId}>{j.jugador.nombre}</option>)}
        </select>
      </label>

      <h5>Jugadores del equipo</h5>
      <ul>
        {equipo.jugadores.map((j) => (
          <li key={j.jugadorId} className="admin-list-item">
            <span>{j.jugador.nombre}{equipo.capitanId === j.jugadorId ? " (Capitán)" : ""}</span>
            <button className="admin-link-btn" onClick={() => onQuitarJugador(j.jugadorId)}>Quitar</button>
          </li>
        ))}
      </ul>
      {disponibles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginBottom: ".8rem" }}>
          {disponibles.map((j) => (
            <button key={j.id} type="button" className="admin-link-btn" onClick={() => onAnadirJugador(j.id)}>＋ {j.nombre}</button>
          ))}
        </div>
      )}

      <h5>Partidos</h5>
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
        {equipo.partidos.map((p) => (
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
      </ul>
    </div>
  );
}
