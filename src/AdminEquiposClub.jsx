import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminEquiposClub({ token, salir }) {
  const [equipos, setEquipos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
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

  useEffect(() => {
    cargarEquipos();
    cargarJugadores();
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
    if (!confirm("¿Borrar este equipo?")) return;
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
          return (
            <li key={eq.id} className="admin-cuadrante" style={{ marginBottom: "1rem" }}>
              <div className="admin-list-item">
                <strong>{eq.nombre}</strong>
                <div style={{ display: "flex", gap: ".5rem" }}>
                  <button className="admin-link-btn" onClick={() => setAbiertoId(abiertoId === eq.id ? null : eq.id)}>
                    {abiertoId === eq.id ? "Cerrar" : "Gestionar plantilla"}
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
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
