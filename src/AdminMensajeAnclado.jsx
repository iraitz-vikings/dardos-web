import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminMensajeAnclado({ token, salir }) {
  const [texto, setTexto] = useState("");
  const [activo, setActivo] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/mensaje-anclado/admin`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (m) {
          setTexto(m.texto || "");
          setActivo(m.activo);
        }
      })
      .catch(() => {});
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/mensaje-anclado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ texto, activo }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: "No se pudo guardar el mensaje." });
        return;
      }
      setMensaje({ tipo: "ok", texto: "Mensaje guardado." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="admin-form">
      <h2>Mensaje anclado (encima del vídeo de la home)</h2>
      <label>
        Texto
        <textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: Este sábado torneo interno, ¡apúntate en el bar!" />
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} style={{ width: "auto" }} />
        Mostrarlo en la web
      </label>
      <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar"}</button>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </form>
  );
}
