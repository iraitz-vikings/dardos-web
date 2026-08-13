import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TablonAnuncios({ usuario }) {
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fijado, setFijado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const puedePublicar = usuario.rol === "admin" || usuario.rol === "capitan";
  const token = () => localStorage.getItem("socioToken");

  const cargar = () => {
    fetch(`${API_URL}/api/anuncios`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAnuncios)
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  async function publicar(e) {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/anuncios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ titulo: titulo.trim(), contenido: contenido.trim(), fijado }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo publicar el anuncio." });
        return;
      }
      setTitulo("");
      setContenido("");
      setFijado(false);
      setMostrarFormulario(false);
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este anuncio?")) return;
    await fetch(`${API_URL}/api/anuncios/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    cargar();
  }

  return (
    <div>
      <h3>Tablón de anuncios</h3>

      {puedePublicar && !mostrarFormulario && (
        <button type="button" onClick={() => setMostrarFormulario(true)} style={{ marginBottom: "1rem" }}>
          ＋ Publicar anuncio
        </button>
      )}

      {puedePublicar && mostrarFormulario && (
        <form onSubmit={publicar} style={{ marginBottom: "1.5rem" }}>
          <label>
            Título
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </label>
          <label>
            Contenido
            <textarea rows={4} value={contenido} onChange={(e) => setContenido(e.target.value)} required />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
            <input type="checkbox" checked={fijado} onChange={(e) => setFijado(e.target.checked)} style={{ width: "auto" }} />
            Fijar arriba del todo
          </label>
          <div style={{ display: "flex", gap: ".6rem" }}>
            <button type="submit" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
            <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}

      {cargando && <p className="chronicle-status">Cargando anuncios…</p>}
      {!cargando && anuncios.length === 0 && <p className="chronicle-status">Todavía no hay anuncios.</p>}

      <ul>
        {anuncios.map((a) => (
          <li key={a.id} className="admin-list-item" style={{ alignItems: "flex-start", flexDirection: "column", gap: ".4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <strong>{a.fijado ? "📌 " : ""}{a.titulo}</strong>
              {(usuario.rol === "admin" || a.autor?.nombre === usuario.nombre) && (
                <button type="button" className="admin-link-btn" onClick={() => borrar(a.id)}>Borrar</button>
              )}
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.contenido}</p>
            <em style={{ fontSize: ".8em" }}>{a.autor?.nombre} · {formatFecha(a.fechaPublicacion)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
