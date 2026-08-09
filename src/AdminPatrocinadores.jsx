import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminPatrocinadores({ token, salir }) {
  const [patrocinadores, setPatrocinadores] = useState([]);
  const [nombre, setNombre] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [url, setUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    fetch(`${API_URL}/api/patrocinadores`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPatrocinadores)
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!logoUrl) {
      setMensaje({ tipo: "error", texto: "Falta el logo del patrocinador." });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/patrocinadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre, logoUrl, url }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el patrocinador." });
        return;
      }
      setNombre("");
      setLogoUrl("");
      setUrl("");
      setMensaje({ tipo: "ok", texto: "Patrocinador añadido." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Quitar este patrocinador?")) return;
    await fetch(`${API_URL}/api/patrocinadores/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Patrocinadores</h2>
      <p className="admin-hint">Aparecen en la home del club, con su logo enlazando a su web si se indica.</p>

      <form onSubmit={crear} className="admin-form" style={{ marginBottom: "1.5rem" }}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Logo
          <SelectorImagen
            token={token}
            valor={logoUrl}
            onCambiar={setLogoUrl}
            onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
            etiqueta="Logo"
          />
        </label>
        <label>
          Enlace a su web (opcional)
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </label>
        <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Añadir patrocinador"}</button>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      {patrocinadores.length === 0 && <p className="chronicle-status">Todavía no hay patrocinadores.</p>}

      <ul className="admin-patrocinadores-lista">
        {patrocinadores.map((p) => (
          <li key={p.id} className="admin-list-item">
            <div style={{ display: "flex", alignItems: "center", gap: ".8rem" }}>
              <img src={p.logoUrl} alt={p.nombre} style={{ width: 44, height: 44, objectFit: "contain", background: "#fff", padding: 2 }} />
              <strong>{p.nombre}</strong>
            </div>
            <button className="admin-link-btn" onClick={() => borrar(p.id)}>Quitar</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
