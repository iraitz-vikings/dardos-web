import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminMaquinas({ token, salir }) {
  const [maquinas, setMaquinas] = useState([]);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    fetch(`${API_URL}/api/maquinas`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMaquinas)
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
      const res = await fetch(`${API_URL}/api/maquinas`, {
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
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear la máquina." });
        return;
      }
      setNombre("");
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar esta máquina?")) return;
    setMensaje(null);
    const res = await fetch(`${API_URL}/api/maquinas/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo borrar la máquina." });
      return;
    }
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Máquinas del club</h2>
      <form onSubmit={crear} className="admin-inline-form">
        <label>
          Nombre de la máquina
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Máquina 1" />
        </label>
        <button type="submit" disabled={creando || !nombre.trim()}>Añadir</button>
      </form>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {maquinas.length === 0 && <p className="chronicle-status">Todavía no hay máquinas dadas de alta.</p>}
      <ul>
        {maquinas.map((m) => (
          <li key={m.id} className="admin-list-item">
            <span>{m.nombre}</span>
            <button className="admin-link-btn" onClick={() => borrar(m.id)}>Borrar</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
