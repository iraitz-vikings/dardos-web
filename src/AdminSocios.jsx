import { useEffect, useRef, useState } from "react";
import { API_URL } from "./config.js";

const ROLES = ["jugador", "capitan", "admin"];

// Para sugerir la ficha de amigo de alguien que se da de alta: sin
// mayúsculas ni tildes ("Íñigo" = "iñigo" = "inigo").
function normalizar(texto) {
  return (texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

// Fichas de amigo cuyo nombre coincide con el de la cuenta (igual, o la
// cuenta es solo el nombre de pila: "Nuria" → "Nuria Vázquez").
function coincidencias(nombre, fichas) {
  const n = normalizar(nombre);
  if (!n) return [];
  return fichas.filter((f) => {
    const fn = normalizar(f.nombre);
    return fn === n || fn.startsWith(`${n} `);
  });
}

// Desplegable de ficha de jugador: "crear nueva" o una ficha de amigo (sin
// cuenta) ya existente, con las que coinciden por nombre arriba del todo.
function SelectorFicha({ nombre, fichas, value, onChange, textoVacio = "Crear ficha nueva" }) {
  const sugeridas = coincidencias(nombre, fichas);
  const resto = fichas.filter((f) => !sugeridas.includes(f));
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} title="Ficha de jugador">
      <option value="">{textoVacio}</option>
      {sugeridas.length > 0 && (
        <optgroup label="Coinciden por nombre">
          {sugeridas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </optgroup>
      )}
      <optgroup label="Amigos sin cuenta">
        {resto.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
      </optgroup>
    </select>
  );
}

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminSocios({ token, salir }) {
  const [pendientes, setPendientes] = useState([]);
  const [socios, setSocios] = useState([]);
  const [rolElegido, setRolElegido] = useState({});
  // Fichas de jugador sin cuenta (amigos), para asignárselas a un miembro al
  // aprobarlo/darlo de alta o después. fichaElegida: { [usuarioId]: jugadorId }.
  const [fichasLibres, setFichasLibres] = useState([]);
  const [fichaElegida, setFichaElegida] = useState({});
  const [fichaManual, setFichaManual] = useState("");
  const [mensaje, setMensaje] = useState(null);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rolManual, setRolManual] = useState("jugador");
  const [creando, setCreando] = useState(false);
  const mensajeRef = useRef(null);

  // El aviso (p.ej. la contraseña provisional al resetear) se pinta arriba
  // del todo, lejos de botones como "Resetear contraseña" que están al
  // final de una lista larga de miembros — sin este scroll, quedaba fuera
  // de la vista y parecía que no pasaba nada.
  useEffect(() => {
    if (mensaje) mensajeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [mensaje]);

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

  const cargarFichasLibres = () => {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => setFichasLibres(lista.filter((j) => !j.usuarioId)))
      .catch(() => {});
  };

  useEffect(() => {
    cargarPendientes();
    cargarSocios();
    cargarFichasLibres();
  }, []);

  // Sin elección explícita, se propone la ficha de amigo que coincide por
  // nombre si solo hay una (si hay varias, p. ej. tres "Iñigo", que elija el
  // admin).
  function fichaDe(usuario) {
    if (usuario.id in fichaElegida) return fichaElegida[usuario.id];
    const sugeridas = coincidencias(usuario.nombre, fichasLibres);
    return sugeridas.length === 1 ? sugeridas[0].id : "";
  }

  async function vincularFicha(socio) {
    const jugadorId = fichaDe(socio);
    if (!jugadorId) return;
    setMensaje(null);
    const res = await fetch(`${API_URL}/api/auth/${socio.id}/vincular-jugador`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ jugadorId }),
    });
    if (manejarAuthError(res)) return;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMensaje({ tipo: "error", texto: data.error || "No se pudo vincular la ficha." });
      return;
    }
    setMensaje({ tipo: "ok", texto: `${socio.nombre} vinculado a la ficha "${data.nombre}".` });
    cargarSocios();
    cargarFichasLibres();
  }

  async function aprobar(id) {
    const rol = rolElegido[id] || "jugador";
    const res = await fetch(`${API_URL}/api/auth/${id}/aprobar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ rol, jugadorId: fichaDe(pendientes.find((p) => p.id === id)) || undefined }),
    });
    if (manejarAuthError(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo aprobar." });
      return;
    }
    setMensaje({ tipo: "ok", texto: "Miembro aprobado." });
    cargarPendientes();
    cargarSocios();
    cargarFichasLibres();
  }

  async function rechazar(id) {
    if (!confirm("¿Rechazar y borrar esta solicitud?")) return;
    const res = await fetch(`${API_URL}/api/auth/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (manejarAuthError(res)) return;
    cargarPendientes();
  }

  async function resetearPassword(id, nombre) {
    if (!confirm(`¿Generar una contraseña provisional para ${nombre}? Tendrá que cambiarla en su próximo acceso.`)) return;
    const res = await fetch(`${API_URL}/api/auth/${id}/resetear-password`, {
      method: "POST",
      headers: { "x-admin-token": token },
    });
    if (manejarAuthError(res)) return;
    const data = await res.json();
    setMensaje({
      tipo: "ok",
      texto: `Contraseña provisional para ${data.email}: "${data.passwordProvisional}" — pásasela por un canal privado. Se le pedirá cambiarla al entrar.`,
    });
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
    if (!confirm("¿Eliminar la cuenta de este miembro? Su ficha de jugador se conserva (pasa a ser amigo sin cuenta), con todo su historial.")) return;
    setMensaje(null);
    const res = await fetch(`${API_URL}/api/auth/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (manejarAuthError(res)) return;
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo eliminar la cuenta." });
      return;
    }
    cargarSocios();
  }

  // Igual que fichaDe, pero para el formulario de alta manual (null = el
  // admin no ha tocado el desplegable todavía).
  const sugeridasManual = coincidencias(nombre, fichasLibres);
  const fichaManualEfectiva =
    fichaManual !== "" ? (fichaManual === "nueva" ? "" : fichaManual) : sugeridasManual.length === 1 ? sugeridasManual[0].id : "";

  async function crearManual(e) {
    e.preventDefault();
    setCreando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/crear-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre, email, password, rol: rolManual, jugadorId: fichaManualEfectiva || undefined }),
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
      setFichaManual("");
      setMensaje({ tipo: "ok", texto: "Cuenta creada y aprobada." });
      cargarSocios();
      cargarFichasLibres();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  return (
    <section className="admin-form">
      {mensaje && <p ref={mensajeRef} className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

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
              <SelectorFicha
                nombre={p.nombre}
                fichas={fichasLibres}
                value={fichaDe(p)}
                onChange={(v) => setFichaElegida((prev) => ({ ...prev, [p.id]: v }))}
              />
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
        <label>
          Ficha de jugador
          <SelectorFicha
            nombre={nombre}
            fichas={fichasLibres}
            value={fichaManualEfectiva}
            onChange={(v) => setFichaManual(v || "nueva")}
          />
        </label>
        <button type="submit" disabled={creando}>{creando ? "Creando…" : "Crear miembro"}</button>
      </form>

      <h2>Miembros ({socios.length})</h2>
      {socios.length === 0 && <p className="chronicle-status">Todavía no hay miembros aprobados.</p>}
      <ul>
        {socios.map((s) => (
          <li key={s.id} className="admin-list-item" style={{ alignItems: "flex-start" }}>
            <div>
              <strong>{s.nombre}</strong> — {s.email}
              {s.jugador ? (
                s.jugador.nombre !== s.nombre && (
                  <em style={{ display: "block", fontSize: ".8em", opacity: .85 }}>Ficha: {s.jugador.nombre}</em>
                )
              ) : (
                <span style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap", marginTop: ".3rem" }}>
                  <em style={{ fontSize: ".8em" }}>Sin ficha de jugador (no sale en Jugadores).</em>
                  <SelectorFicha
                    nombre={s.nombre}
                    fichas={fichasLibres}
                    value={fichaDe(s)}
                    onChange={(v) => setFichaElegida((prev) => ({ ...prev, [s.id]: v }))}
                    textoVacio="Elige su ficha de amigo…"
                  />
                  <button className="admin-link-btn" disabled={!fichaDe(s)} onClick={() => vincularFicha(s)}>Vincular</button>
                </span>
              )}
              {s.idsFabricantes?.length > 0 && (
                <em style={{ display: "block", fontSize: ".8em", opacity: .85 }}>
                  {s.idsFabricantes
                    .map((i) => {
                      let texto = `${i.nombreFabricante}: ${i.idExterno}`;
                      const partes = [];
                      if (i.notaBusqueda) {
                        const etiqueta = i.nombreFabricante.toLowerCase().includes("connection") ? "localidad" : "torneo";
                        partes.push(`${etiqueta}: ${i.notaBusqueda}`);
                      }
                      if (i.mpr != null) partes.push(`MPR ${i.mpr}`);
                      if (i.ppd != null) partes.push(`PPD ${i.ppd}`);
                      if (i.mprVirtual != null) partes.push(`Virtual MPR ${i.mprVirtual}`);
                      if (i.ppdVirtual != null) partes.push(`Virtual PPD ${i.ppdVirtual}`);
                      if (i.mprPresencial != null) partes.push(`Presencial MPR ${i.mprPresencial}`);
                      if (i.ppdPresencial != null) partes.push(`Presencial PPD ${i.ppdPresencial}`);
                      // statsError se añade siempre que exista, aparte de las
                      // demás partes (torneo, medias) en vez de como
                      // alternativa exclusiva — si no, guardar un torneo (que
                      // ya rellena "partes") ocultaba el error real de scraping.
                      if (i.statsError) partes.push(`error: ${i.statsError}`);
                      if (partes.length > 0) {
                        texto += ` (${partes.join(" / ")})`;
                      }
                      return texto;
                    })
                    .join(" · ")}
                </em>
              )}
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
