import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminFabricantes({ token, salir }) {
  const [fabricantes, setFabricantes] = useState([]);
  const [nombre, setNombre] = useState("");
  const [urlPerfilPlantilla, setUrlPerfilPlantilla] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    fetch(`${API_URL}/api/fabricantes`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFabricantes)
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
      const res = await fetch(`${API_URL}/api/fabricantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre: nombre.trim(), urlPerfilPlantilla: urlPerfilPlantilla.trim() || undefined }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el fabricante." });
        return;
      }
      setNombre("");
      setUrlPerfilPlantilla("");
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este fabricante? También se borrarán los IDs que los jugadores tengan guardados para él.")) return;
    await fetch(`${API_URL}/api/fabricantes/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Fabricantes</h2>
      <p className="admin-hint">
        Dianas electrónicas u otros fabricantes en cuya web cada jugador tiene su propio ID (para
        consultar sus medias/estadísticas). Los que des de alta aquí aparecerán en "Mi perfil" para
        que cada socio introduzca su ID.
      </p>
      <form onSubmit={crear} className="admin-inline-form">
        <label>
          Nombre del fabricante
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: DARTSLIVE" />
        </label>
        <label>
          URL de perfil (opcional, usa {"{id}"} donde iría el ID del jugador)
          <input
            value={urlPerfilPlantilla}
            onChange={(e) => setUrlPerfilPlantilla(e.target.value)}
            placeholder="Ej: https://www.dartslive.com/es/rank/?id={id}"
          />
        </label>
        <button type="submit" disabled={creando || !nombre.trim()}>{creando ? "Creando…" : "Añadir"}</button>
      </form>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {fabricantes.length === 0 && <p className="chronicle-status">Todavía no hay fabricantes dados de alta.</p>}
      <ul>
        {fabricantes.map((f) => (
          <li key={f.id} className="admin-list-item">
            <div>
              <strong>{f.nombre}</strong>
              {f.urlPerfilPlantilla && <em style={{ display: "block", fontSize: ".8em" }}>{f.urlPerfilPlantilla}</em>}
            </div>
            <button className="admin-link-btn" onClick={() => borrar(f.id)}>Borrar</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
