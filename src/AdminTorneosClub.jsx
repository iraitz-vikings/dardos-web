import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const TAMANOS = [4, 8, 16, 32, 64, 128];

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const RAMA_ETIQUETA = { ganadores: "Cuadro de ganadores", perdedores: "Cuadro de perdedores", final: "Gran final" };

export default function AdminTorneosClub({ token, salir }) {
  const [torneos, setTorneos] = useState([]);
  const [abiertoId, setAbiertoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [visibilidad, setVisibilidad] = useState("privado");
  const [numeroMaquinas, setNumeroMaquinas] = useState("");
  const [tipoEliminacion, setTipoEliminacion] = useState("directa");
  const [insigniaUrl, setInsigniaUrl] = useState("");
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
        body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, visibilidad, numeroMaquinas, tipoEliminacion, insigniaUrl }),
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
      setNumeroMaquinas("");
      setTipoEliminacion("directa");
      setInsigniaUrl("");
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

  async function cambiarFinalizado(torneo, nuevoFinalizado) {
    await fetch(`${API_URL}/api/torneos-club/${torneo.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...torneo, finalizado: nuevoFinalizado }),
    });
    cargarTorneos();
  }

  async function borrarTorneo(id) {
    if (!confirm("¿Borrar este torneo, sus cuadrantes y todos sus enfrentamientos?")) return;
    await fetch(`${API_URL}/api/torneos-club/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTorneos();
  }

  async function crearCuadrante(torneoId, datos) {
    const res = await fetch(`${API_URL}/api/torneos-club/${torneoId}/cuadrantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarTorneos();
    return res.ok;
  }

  async function borrarCuadrante(cuadranteId) {
    if (!confirm("¿Borrar este cuadrante y todos sus enfrentamientos?")) return;
    await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadranteId}`, { method: "DELETE", headers: { "x-admin-token": token } });
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

  return (
    <section className="admin-form">
      <h2>Torneos del club (cuadros)</h2>
      <p className="admin-hint">
        Torneos organizados por el club, con cuadrantes generados automáticamente (eliminación directa o doble).
        Marca "Público" para que aparezca en la web en "Torneos en directo"; "Privado" para que solo se vea en la
        sección de socios (cuando exista el login).
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
          Cartel del torneo (opcional)
          <SelectorImagen
            token={token}
            valor={insigniaUrl}
            onCambiar={setInsigniaUrl}
            onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
            etiqueta="Cartel"
          />
        </label>
        <label>
          Número de máquinas
          <input type="number" min="1" value={numeroMaquinas} onChange={(e) => setNumeroMaquinas(e.target.value)} placeholder="ej. 9" />
        </label>
        <label>
          Tipo de eliminación
          <select value={tipoEliminacion} onChange={(e) => setTipoEliminacion(e.target.value)}>
            <option value="directa">Eliminación directa</option>
            <option value="doble">Doble eliminación</option>
          </select>
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
                  {t.visibilidad === "publico" ? "Público" : "Privado"} ·{" "}
                  {t.tipoEliminacion === "doble" ? "Doble eliminación" : "Eliminación directa"}
                  {t.numeroMaquinas ? ` · ${t.numeroMaquinas} máquinas` : ""}
                  {t.finalizado ? " · Finalizado" : ""}
                </time>
              </div>
              <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
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
                  onClick={() => cambiarFinalizado(t, !t.finalizado)}
                >
                  {t.finalizado ? "Reabrir torneo" : "Marcar finalizado"}
                </button>
                <button type="button" className="admin-link-btn" onClick={() => setAbiertoId(abiertoId === t.id ? null : t.id)}>
                  {abiertoId === t.id ? "Cerrar" : "Ver cuadrantes"}
                </button>
                <button type="button" className="admin-link-btn" onClick={() => borrarTorneo(t.id)}>Borrar</button>
              </div>
            </div>

            {abiertoId === t.id && (
              <TorneoDetalle
                torneo={t}
                onCrearCuadrante={(datos) => crearCuadrante(t.id, datos)}
                onBorrarCuadrante={borrarCuadrante}
                onActualizarPartido={actualizarPartido}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TorneoDetalle({ torneo, onCrearCuadrante, onBorrarCuadrante, onActualizarPartido }) {
  const [nombreCuadrante, setNombreCuadrante] = useState("");
  const [tamano, setTamano] = useState(8);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!nombreCuadrante.trim()) return;
    setCreando(true);
    setError(null);
    const ok = await onCrearCuadrante({ nombre: nombreCuadrante.trim(), tamano, tipoEliminacion: torneo.tipoEliminacion });
    if (!ok) setError("No se pudo generar el cuadrante.");
    else setNombreCuadrante("");
    setCreando(false);
  }

  return (
    <div className="admin-cuadro">
      <form onSubmit={submit} className="admin-cuadro-form">
        <input
          placeholder="Nombre del cuadrante (ej. Nivel A)"
          value={nombreCuadrante}
          onChange={(e) => setNombreCuadrante(e.target.value)}
        />
        <select value={tamano} onChange={(e) => setTamano(Number(e.target.value))}>
          {TAMANOS.map((n) => (
            <option key={n} value={n}>{n} participantes</option>
          ))}
        </select>
        <button type="submit" disabled={creando}>
          {creando ? "Generando…" : `Generar cuadrante (${torneo.tipoEliminacion === "doble" ? "doble elim." : "elim. directa"})`}
        </button>
      </form>
      {error && <p className="admin-msg admin-msg-error">{error}</p>}

      {(torneo.cuadrantes || []).length === 0 && <p className="chronicle-status">Sin cuadrantes todavía.</p>}

      {(torneo.cuadrantes || []).map((c) => (
        <CuadranteDetalle
          key={c.id}
          cuadrante={c}
          numeroMaquinas={torneo.numeroMaquinas}
          onBorrar={() => onBorrarCuadrante(c.id)}
          onActualizarPartido={onActualizarPartido}
        />
      ))}
    </div>
  );
}

function CuadranteDetalle({ cuadrante, numeroMaquinas, onBorrar, onActualizarPartido }) {
  const [abierto, setAbierto] = useState(false);

  const porRama = {};
  for (const p of cuadrante.partidos) {
    if (!porRama[p.rama]) porRama[p.rama] = {};
    if (!porRama[p.rama][p.ronda]) porRama[p.rama][p.ronda] = [];
    porRama[p.rama][p.ronda].push(p);
  }
  const ramas = ["ganadores", "perdedores", "final"].filter((r) => porRama[r]);

  const maquinasOpciones = numeroMaquinas
    ? Array.from({ length: numeroMaquinas }, (_, i) => `Máquina ${i + 1}`)
    : [];

  return (
    <div className="admin-cuadrante">
      <div className="admin-cuadrante-header">
        <h4>{cuadrante.nombre} — {cuadrante.tamano} participantes ({cuadrante.tipoEliminacion === "doble" ? "doble elim." : "elim. directa"})</h4>
        <div style={{ display: "flex", gap: ".5rem" }}>
          <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
            {abierto ? "Ocultar" : "Ver enfrentamientos"}
          </button>
          <button type="button" className="admin-link-btn" onClick={onBorrar}>Borrar cuadrante</button>
        </div>
      </div>

      {abierto && ramas.map((rama) => (
        <div key={rama} className="admin-cuadrante-rama">
          <h5>{RAMA_ETIQUETA[rama]}</h5>
          {Object.keys(porRama[rama]).sort((a, b) => a - b).map((ronda) => (
            <div key={ronda} className="admin-cuadro-maquina">
              <h4>Ronda {ronda}</h4>
              {porRama[rama][ronda]
                .sort((a, b) => a.posicion - b.posicion)
                .map((p) => (
                  <PartidoRow
                    key={p.id}
                    p={p}
                    maquinasOpciones={maquinasOpciones}
                    onActualizar={(datos) => onActualizarPartido(p.id, datos)}
                  />
                ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PartidoRow({ p, maquinasOpciones, onActualizar }) {
  return (
    <div className={`admin-cuadro-partido ${p.enCurso ? "admin-cuadro-en-curso" : ""}`}>
      <input
        defaultValue={p.jugador1 || ""}
        placeholder="Jugador 1"
        onBlur={(e) => e.target.value !== (p.jugador1 || "") && onActualizar({ jugador1: e.target.value })}
      />
      <button
        type="button"
        className={`admin-link-btn ${p.ganador && p.ganador === p.jugador1 ? "admin-ganador-activo" : ""}`}
        disabled={!p.jugador1 || !p.jugador2}
        onClick={() => onActualizar({ ganador: p.jugador1 })}
      >
        Ganó
      </button>
      <span>vs</span>
      <input
        defaultValue={p.jugador2 || ""}
        placeholder="Jugador 2"
        onBlur={(e) => e.target.value !== (p.jugador2 || "") && onActualizar({ jugador2: e.target.value })}
      />
      <button
        type="button"
        className={`admin-link-btn ${p.ganador && p.ganador === p.jugador2 ? "admin-ganador-activo" : ""}`}
        disabled={!p.jugador1 || !p.jugador2}
        onClick={() => onActualizar({ ganador: p.jugador2 })}
      >
        Ganó
      </button>
      <input
        defaultValue={p.resultado || ""}
        placeholder="Resultado"
        className="admin-cuadro-resultado"
        onBlur={(e) => e.target.value !== (p.resultado || "") && onActualizar({ resultado: e.target.value })}
      />
      {maquinasOpciones.length > 0 ? (
        <select defaultValue={p.maquina || ""} onChange={(e) => onActualizar({ maquina: e.target.value })}>
          <option value="">Máquina…</option>
          {maquinasOpciones.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      ) : (
        <input
          defaultValue={p.maquina || ""}
          placeholder="Máquina"
          className="admin-cuadro-maquina-input"
          onBlur={(e) => e.target.value !== (p.maquina || "") && onActualizar({ maquina: e.target.value })}
        />
      )}
      <button type="button" className="admin-link-btn" onClick={() => onActualizar({ enCurso: !p.enCurso })}>
        {p.enCurso ? "★ En curso" : "Marcar en curso"}
      </button>
    </div>
  );
}
