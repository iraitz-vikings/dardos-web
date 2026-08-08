import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function aInputDate(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function AdminTorneosClub({ token, salir }) {
  const [torneos, setTorneos] = useState([]);
  const [abiertoId, setAbiertoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [visibilidad, setVisibilidad] = useState("privado");
  const [guardando, setGuardando] = useState(false);

  const cargarTorneos = () => {
    fetch(`${API_URL}/api/torneos-club/todos`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTorneos)
      .catch(() => {});
  };

  useEffect(() => {
    cargarTorneos();
  }, []);

  async function crearTorneo(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/torneos-club`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, visibilidad }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el torneo." });
        return;
      }
      setNombre("");
      setDescripcion("");
      setFechaInicio("");
      setFechaFin("");
      setVisibilidad("privado");
      setMensaje({ tipo: "ok", texto: "Torneo creado." });
      cargarTorneos();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarVisibilidad(torneo, nuevaVisibilidad) {
    await fetch(`${API_URL}/api/torneos-club/${torneo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...torneo, visibilidad: nuevaVisibilidad }),
    });
    cargarTorneos();
  }

  async function borrarTorneo(id) {
    if (!confirm("¿Borrar este torneo y todo su cuadro?")) return;
    await fetch(`${API_URL}/api/torneos-club/${id}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    cargarTorneos();
  }

  async function anadirPartido(torneoId, datos) {
    await fetch(`${API_URL}/api/torneos-club/${torneoId}/partidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarTorneos();
  }

  async function actualizarPartido(partidoId, datos) {
    await fetch(`${API_URL}/api/torneos-club/partidos/${partidoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarTorneos();
  }

  async function borrarPartido(partidoId) {
    if (!confirm("¿Borrar este enfrentamiento?")) return;
    await fetch(`${API_URL}/api/torneos-club/partidos/${partidoId}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    cargarTorneos();
  }

  return (
    <section className="admin-form">
      <h2>Torneos del club (cuadros)</h2>
      <p className="admin-hint">
        Torneos organizados por el club, con un cuadro de enfrentamientos por cada máquina. Marca "Público" para que
        aparezca en la web en "Torneos en directo"; "Privado" para que solo se vea en la sección de socios (cuando
        exista el login).
      </p>

      <form onSubmit={crearTorneo} className="admin-form" style={{ marginBottom: "1.5rem" }}>
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </label>
        <label>
          Descripción (opcional)
          <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </label>
        <label>
          Fecha de inicio
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
        </label>
        <label>
          Fecha de fin
          <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} required />
        </label>
        <label>
          Visibilidad
          <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)}>
            <option value="privado">Privado (solo socios)</option>
            <option value="publico">Público (visible en la web)</option>
          </select>
        </label>
        <button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear torneo"}</button>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      {torneos.length === 0 && <p className="chronicle-status">Todavía no hay torneos del club.</p>}

      <ul className="admin-torneos-club-list">
        {torneos.map((t) => (
          <li key={t.id} className="admin-torneo-club-item">
            <div className="admin-list-item">
              <div>
                <strong>{t.nombre}</strong>
                <time>
                  {formatFecha(t.fechaInicio)} – {formatFecha(t.fechaFin)} ·{" "}
                  {t.visibilidad === "publico" ? "Público" : "Privado"}
                </time>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => cambiarVisibilidad(t, t.visibilidad === "publico" ? "privado" : "publico")}
                >
                  Hacer {t.visibilidad === "publico" ? "privado" : "público"}
                </button>
                <button
                  type="button"
                  className="admin-link-btn"
                  onClick={() => setAbiertoId(abiertoId === t.id ? null : t.id)}
                >
                  {abiertoId === t.id ? "Cerrar cuadro" : "Ver cuadro"}
                </button>
                <button type="button" className="admin-link-btn" onClick={() => borrarTorneo(t.id)}>Borrar</button>
              </div>
            </div>

            {abiertoId === t.id && (
              <CuadroTorneo
                torneo={t}
                onAnadir={(datos) => anadirPartido(t.id, datos)}
                onActualizar={actualizarPartido}
                onBorrar={borrarPartido}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CuadroTorneo({ torneo, onAnadir, onActualizar, onBorrar }) {
  const [nivel, setNivel] = useState("");
  const [maquina, setMaquina] = useState("");
  const [ronda, setRonda] = useState("");
  const [jugador1, setJugador1] = useState("");
  const [jugador2, setJugador2] = useState("");

  const partidosPorNivel = {};
  for (const p of torneo.partidos) {
    if (!partidosPorNivel[p.nivel]) partidosPorNivel[p.nivel] = [];
    partidosPorNivel[p.nivel].push(p);
  }

  function submit(e) {
    e.preventDefault();
    if (!nivel.trim() || !maquina.trim() || !ronda.trim()) return;
    onAnadir({ nivel: nivel.trim(), maquina: maquina.trim(), ronda: ronda.trim(), jugador1, jugador2 });
    setJugador1("");
    setJugador2("");
  }

  return (
    <div className="admin-cuadro">
      <form onSubmit={submit} className="admin-cuadro-form">
        <input placeholder="Nivel/cuadrante (ej. Nivel A)" value={nivel} onChange={(e) => setNivel(e.target.value)} />
        <input placeholder="Máquina (ej. Máquina 1)" value={maquina} onChange={(e) => setMaquina(e.target.value)} />
        <input placeholder="Ronda (ej. Cuartos)" value={ronda} onChange={(e) => setRonda(e.target.value)} />
        <input placeholder="Jugador 1" value={jugador1} onChange={(e) => setJugador1(e.target.value)} />
        <input placeholder="Jugador 2" value={jugador2} onChange={(e) => setJugador2(e.target.value)} />
        <button type="submit">Añadir enfrentamiento</button>
      </form>

      {Object.keys(partidosPorNivel).length === 0 && (
        <p className="chronicle-status">Sin enfrentamientos todavía.</p>
      )}

      {Object.entries(partidosPorNivel).map(([nombreNivel, partidos]) => (
        <div key={nombreNivel} className="admin-cuadro-maquina">
          <h4>{nombreNivel}</h4>
          {partidos.map((p) => (
            <div key={p.id} className={`admin-cuadro-partido ${p.enCurso ? "admin-cuadro-en-curso" : ""}`}>
              <span className="admin-cuadro-ronda">{p.ronda}</span>
              <input
                defaultValue={p.maquina || ""}
                placeholder="Máquina"
                className="admin-cuadro-maquina-input"
                onBlur={(e) => e.target.value !== (p.maquina || "") && onActualizar(p.id, { ...p, maquina: e.target.value })}
              />
              <input
                defaultValue={p.jugador1 || ""}
                placeholder="Jugador 1"
                onBlur={(e) => e.target.value !== (p.jugador1 || "") && onActualizar(p.id, { ...p, jugador1: e.target.value })}
              />
              <span>vs</span>
              <input
                defaultValue={p.jugador2 || ""}
                placeholder="Jugador 2"
                onBlur={(e) => e.target.value !== (p.jugador2 || "") && onActualizar(p.id, { ...p, jugador2: e.target.value })}
              />
              <input
                defaultValue={p.resultado || ""}
                placeholder="Resultado"
                className="admin-cuadro-resultado"
                onBlur={(e) => e.target.value !== (p.resultado || "") && onActualizar(p.id, { ...p, resultado: e.target.value })}
              />
              <input
                defaultValue={p.ganador || ""}
                placeholder="Ganador"
                className="admin-cuadro-resultado"
                onBlur={(e) => e.target.value !== (p.ganador || "") && onActualizar(p.id, { ...p, ganador: e.target.value })}
              />
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => onActualizar(p.id, { ...p, enCurso: !p.enCurso })}
              >
                {p.enCurso ? "★ En curso" : "Marcar en curso"}
              </button>
              <button type="button" className="admin-link-btn" onClick={() => onBorrar(p.id)}>Borrar</button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
