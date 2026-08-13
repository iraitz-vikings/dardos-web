import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const ROLES = ["jugador", "capitan", "admin"];

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminSocios({ token, salir }) {
  const [pendientes, setPendientes] = useState([]);
  const [socios, setSocios] = useState([]);
  const [rolElegido, setRolElegido] = useState({});
  const [mensaje, setMensaje] = useState(null);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolManual, setRolManual] = useState("jugador");
  const [creando, setCreando] = useState(false);

  function manejarAuthError(res) {
    if (res.status === 401) {
      setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
      salir();
      return true;
    }
    return false;
  }

  const cargarPendientes = () => {
    fetch(`${API_URL}/api/auth/pendientes`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPendientes)
      .catch(() => {});
  };

  const cargarSocios = () => {
    fetch(`${API_URL}/api/auth/socios`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSocios)
      .catch(() => {});
  };

  useEffect(() => {
    cargarPendientes();
    cargarSocios();
  }, []);

  async function aprobar(id) {
    const rol = rolElegido[id] || "jugador";
    const res = await fetch(`${API_URL}/api/auth/${id}/aprobar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ rol }),
    });
    if (manejarAuthError(res)) return;
    setMensaje({ tipo: "ok", texto: "Socio aprobado." });
    cargarPendientes();
    cargarSocios();
  }

  async function rechazar(id) {
    if (!confirm("¿Rechazar y borrar esta solicitud?")) return;
    const res = await fetch(`${API_URL}/api/auth/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (manejarAuthError(res)) return;
    cargarPendientes();
  }

  async function cambiarRol(id, rol) {
    const res = await fetch(`${API_URL}/api/auth/${id}/rol`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ rol }),
    });
    if (manejarAuthError(res)) return;
    cargarSocios();
  }

  async function eliminarSocio(id) {
    if (!confirm("¿Eliminar la cuenta de este socio?")) return;
    const res = await fetch(`${API_URL}/api/auth/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (manejarAuthError(res)) return;
    cargarSocios();
  }

  async function crearManual(e) {
    e.preventDefault();
    setCreando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/crear-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre, email, password, rol: rolManual }),
      });
      if (manejarAuthError(res)) return;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear la cuenta." });
        return;
      }
      setNombre("");
      setEmail("");
      setPassword("");
      setRolManual("jugador");
      setMensaje({ tipo: "ok", texto: "Cuenta creada y aprobada." });
      cargarSocios();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  return (
    <section className="admin-form">
      <h2>Solicitudes pendientes</h2>
      {pendientes.length === 0 && <p className="chronicle-status">No hay solicitudes pendientes.</p>}
      <ul>
        {pendientes.map((p) => (
          <li key={p.id} className="admin-list-item">
            <div>
              <strong>{p.nombre}</strong> — {p.email}
              <time style={{ display: "block" }}>{formatFecha(p.creadoEn)}</time>
            </div>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              <select
                value={rolElegido[p.id] || "jugador"}
                onChange={(e) => setRolElegido((prev) => ({ ...prev, [p.id]: e.target.value }))}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="admin-link-btn" onClick={() => aprobar(p.id)}>Aprobar</button>
              <button className="admin-link-btn" onClick={() => rechazar(p.id)}>Rechazar</button>
            </div>
          </li>
        ))}
      </ul>

      <h2>Alta manual</h2>
      <form onSubmit={crearManual}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña provisional
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        <label>
          Rol
          <select value={rolManual} onChange={(e) => setRolManual(e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <button type="submit" disabled={creando}>{creando ? "Creando…" : "Crear socio"}</button>
      </form>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      <h2>Socios ({socios.length})</h2>
      {socios.length === 0 && <p className="chronicle-status">Todavía no hay socios aprobados.</p>}
      <ul>
        {socios.map((s) => (
          <li key={s.id} className="admin-list-item">
            <div>
              <strong>{s.nombre}</strong> — {s.email}
            </div>
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              <select value={s.rol} onChange={(e) => cambiarRol(s.id, e.target.value)}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button className="admin-link-btn" onClick={() => resetearPassword(s.id, s.nombre)}>Resetear contraseña</button>
              <button className="admin-link-btn" onClick={() => eliminarSocio(s.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
