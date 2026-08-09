import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminJugadores({ token, salir }) {
  const [jugadores, setJugadores] = useState([]);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/jugadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el jugador." });
        return;
      }
      setNombre("");
      setMensaje({ tipo: "ok", texto: "Jugador creado." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este jugador? Si tiene un socio vinculado, solo se borra la ficha de jugador, no la cuenta.")) return;
    await fetch(`${API_URL}/api/jugadores/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Jugadores del club</h2>
      <p className="admin-hint">
        Directorio de todos los jugadores, tengan cuenta de socio o no (invitados). Se usan para apuntar
        participantes a los cuadrantes de torneos, individuales o en pareja.
      </p>

      <form onSubmit={crear} className="admin-inline-form">
        <label>
          Nombre del jugador nuevo (invitado, sin cuenta)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Jon Errenteria" />
        </label>
        <button type="submit" disabled={creando || !nombre.trim()}>{creando ? "Creando…" : "Crear jugador"}</button>
      </form>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {jugadores.length === 0 && <p className="chronicle-status">Todavía no hay jugadores dados de alta.</p>}
      <ul>
        {jugadores.map((j) => (
          <li key={j.id} className="admin-list-item">
            <div>
              <strong>{j.nombre}</strong>
              {j.apodo && <span> — "{j.apodo}"</span>}
              {j.usuario?.email && <em style={{ display: "block", fontSize: ".8em" }}>{j.usuario.email}</em>}
              {!j.usuario && <em style={{ display: "block", fontSize: ".8em" }}>Invitado (sin cuenta)</em>}
            </div>
            <button className="admin-link-btn" onClick={() => borrar(j.id)}>Borrar</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
