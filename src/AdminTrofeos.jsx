import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminTrofeos({ token, salir }) {
  const [trofeos, setTrofeos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [ganador, setGanador] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    fetch(`${API_URL}/api/trofeos/admin`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTrofeos)
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/trofeos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ titulo, anio, ganador, descripcion, imagenUrl }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el trofeo." });
        return;
      }
      setTitulo(""); setGanador(""); setDescripcion(""); setImagenUrl("");
      setAnio(new Date().getFullYear());
      setMensaje({ tipo: "ok", texto: "Trofeo añadido." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este trofeo?")) return;
    await fetch(`${API_URL}/api/trofeos/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Sala de trofeos</h2>
      <p className="admin-hint">Lista curada a mano, visible para los socios en su portal privado.</p>

      <form onSubmit={crear} className="admin-form" style={{ marginBottom: "1.5rem" }}>
        <label>
          Título
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Torneo de Verano" required />
        </label>
        <label>
          Año
          <input type="number" value={anio} onChange={(e) => setAnio(Number(e.target.value))} required />
        </label>
        <label>
          Ganador
          <input value={ganador} onChange={(e) => setGanador(e.target.value)} placeholder="Nombre del jugador o pareja" required />
        </label>
        <label>
          Descripción (opcional)
          <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        <label>
          Foto (opcional)
          <SelectorImagen
            token={token}
            valor={imagenUrl}
            onCambiar={setImagenUrl}
            onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
            etiqueta="Foto"
          />
        </label>
        <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Añadir trofeo"}</button>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      {trofeos.length === 0 && <p className="chronicle-status">Todavía no hay trofeos.</p>}
      <ul>
        {trofeos.map((t) => (
          <li key={t.id} className="admin-list-item">
            <span>🏆 {t.titulo} — {t.anio} — {t.ganador}</span>
            <button className="admin-link-btn" onClick={() => borrar(t.id)}>Borrar</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
