import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function SocioPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [apodo, setApodo] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const token = () => localStorage.getItem("socioToken");

  useEffect(() => {
    fetch(`${API_URL}/api/perfil`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        setPerfil(p);
        setApodo(p.apodo || "");
        setBio(p.bio || "");
        setAvatarUrl(p.avatarUrl || "");
      })
      .catch(() => {});
  }, []);

  async function subirAvatar(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setMensaje(null);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo subir la foto." });
        return;
      }
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al subir la foto." });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ apodo, bio, avatarUrl }),
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: "No se pudo guardar el perfil." });
        return;
      }
      setMensaje({ tipo: "ok", texto: "Perfil actualizado." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) return <p className="chronicle-status">Cargando tu perfil…</p>;

  return (
    <form onSubmit={guardar}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="Tu foto de perfil"
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }}
        />
      )}
      <label>
        Nombre
        <input value={perfil.nombre} disabled />
      </label>
      <label>
        Email
        <input value={perfil.email} disabled />
      </label>
      <label>
        Rol
        <input value={perfil.rol} disabled />
      </label>
      <label>
        Apodo (como quieres que te vean en torneos y ligas)
        <input value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="Ej: El Certero" />
      </label>
      <label>
        Foto de perfil
        <input type="file" accept="image/*" onChange={subirAvatar} disabled={subiendo} />
        {subiendo && <span className="admin-uploading">Subiendo…</span>}
      </label>
      <label>
        Sobre ti (opcional)
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Una frase, tu récord favorito, lo que quieras..." />
      </label>
      <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar perfil"}</button>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </form>
  );
}
