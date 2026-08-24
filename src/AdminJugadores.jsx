import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminJugadores({ token, salir }) {
  const [jugadores, setJugadores] = useState([]);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [enlaces, setEnlaces] = useState({}); // { [jugadorId]: { urlCheckIn, urlTelegram, telegramVinculado } }
  const [copiando, setCopiando] = useState(null);

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

  // Genera (o recupera) el enlace de avisos personal de un invitado y lo
  // copia al portapapeles, para poder pasárselo por WhatsApp, en persona,
  // etc. Solo hace falta que lo abra y pulse "Iniciar" en Telegram una vez.
  async function copiarEnlaceAvisos(id) {
    setCopiando(id);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/notificaciones/invitados/${id}/enlace`, {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: "No se pudo generar el enlace de avisos." });
        return;
      }
      const data = await res.json();
      setEnlaces((prev) => ({ ...prev, [id]: data }));
      const url = data.urlCheckIn || data.urlTelegram;
      if (!url) {
        setMensaje({ tipo: "error", texto: "Faltan avisos por configurar en el servidor (FRONTEND_URL o el bot de Telegram)." });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMensaje({ tipo: "ok", texto: "Enlace de avisos copiado al portapapeles." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCopiando(null);
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
              {!j.usuario && (
                <em style={{ display: "block", fontSize: ".8em" }}>
                  Invitado (sin cuenta)
                  {enlaces[j.id] && (enlaces[j.id].telegramVinculado ? " · Avisos por Telegram activados" : " · Todavía no ha activado avisos")}
                </em>
              )}
            </div>
            <div style={{ display: "flex", gap: ".4rem" }}>
              {!j.usuario && (
                <button className="admin-link-btn" disabled={copiando === j.id} onClick={() => copiarEnlaceAvisos(j.id)}>
                  {copiando === j.id ? "Copiando…" : "Copiar enlace de avisos"}
                </button>
              )}
              <button className="admin-link-btn" onClick={() => borrar(j.id)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
