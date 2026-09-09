import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFechaHora(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Eventos sueltos en el calendario del club (máquina + fecha/hora + texto),
// para reservar una máquina en algo que no es un partido real (mantenimiento,
// quedada, exhibición...) — se mezclan con los partidos de torneo/liga/
// competición externa en el calendario que ve el socio (CalendarioSocio.jsx,
// vía GET /api/calendario). Pedido por Iraitz, 2026-09-09.
export default function AdminCalendario({ token, salir }) {
  const [eventos, setEventos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [maquinaId, setMaquinaId] = useState("");
  const [fecha, setFecha] = useState("");
  const [titulo, setTitulo] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const cargar = () => {
    fetch(`${API_URL}/api/eventos-calendario`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setEventos)
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
    fetch(`${API_URL}/api/maquinas`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMaquinas)
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!maquinaId || !fecha || !titulo.trim()) return;
    setCreando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/eventos-calendario`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ maquinaId, fecha: new Date(fecha).toISOString(), titulo: titulo.trim() }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el evento." });
        return;
      }
      setFecha("");
      setTitulo("");
      setMensaje({ tipo: "ok", texto: "Evento añadido al calendario." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este evento del calendario?")) return;
    setMensaje(null);
    const res = await fetch(`${API_URL}/api/eventos-calendario/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (res.status === 401) {
      setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
      salir();
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo borrar el evento." });
      return;
    }
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Eventos del calendario</h2>
      <p className="admin-hint">
        Reserva una máquina para algo que no es un partido de torneo o liga (mantenimiento, quedada, exhibición...).
        Aparecerá junto a los partidos en el calendario que ven los socios.
      </p>
      <form onSubmit={crear} className="admin-inline-form">
        <label>
          Máquina
          <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} required>
            <option value="">Elige una máquina…</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </label>
        <label>
          Día y hora
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label>
          Texto
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Mantenimiento diana" required />
        </label>
        <button type="submit" disabled={creando || !maquinaId || !fecha || !titulo.trim()}>
          {creando ? "Añadiendo…" : "Añadir"}
        </button>
      </form>
      {maquinas.length === 0 && (
        <p className="chronicle-status">Todavía no hay máquinas dadas de alta (pestaña "Máquinas").</p>
      )}
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {eventos.length === 0 && <p className="chronicle-status">Todavía no hay eventos puestos a mano.</p>}
      <ul>
        {eventos.map((ev) => (
          <li key={ev.id} className="admin-list-item">
            <div>
              <strong>{ev.titulo}</strong>
              <time style={{ display: "block" }}>{formatFechaHora(ev.fecha)} · {ev.maquina?.nombre || "Sin máquina"}</time>
            </div>
            <button className="admin-link-btn" onClick={() => borrar(ev.id)}>Borrar</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
