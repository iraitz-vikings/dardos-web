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
  const [jugadores, setJugadores] = useState([]);
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

  const cargarJugadores = () => {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {});
  };

  useEffect(() => {
    cargarTorneos();
    cargarJugadores();
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

  async function sortearCuadrante(cuadranteId, participantes, cabezasDeSerie) {
    const res = await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadranteId}/sorteo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ participantes, cabezasDeSerie }),
    });
    cargarTorneos();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo hacer el sorteo.";
    }
    return null;
  }

  async function reiniciarCuadrante(cuadranteId) {
    if (!confirm("¿Vaciar todos los resultados de este cuadrante? Se mantiene el reparto de la ronda 1 (y los pases directos), pero se borran los ganadores y resultados de todo el cuadro.")) return;
    await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadranteId}/reiniciar`, {
      method: "POST",
      headers: { "x-admin-token": token },
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

  async function crearParticipante(cuadranteId, datos) {
    const res = await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadranteId}/participantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarTorneos();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo añadir el participante.";
    }
    return null;
  }

  async function borrarParticipante(participanteId) {
    await fetch(`${API_URL}/api/torneos-club/participantes/${participanteId}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarTorneos();
  }

  async function sortearParejas(cuadranteId, jugadorIds) {
    const res = await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadranteId}/sortear-parejas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ jugadorIds }),
    });
    cargarTorneos();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo sortear las parejas.";
    }
    return null;
  }

  async function crearJugadorRapido(nombreJugador) {
    const res = await fetch(`${API_URL}/api/jugadores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ nombre: nombreJugador }),
    });
    cargarJugadores();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data.error || "No se pudo crear el jugador." };
    }
    return { jugador: await res.json() };
  }

  return (
    <section className="admin-form">
      <h2>Torneos del club (cuadros)</h2>
      <p className="admin-hint">
        Torneos organizados por el club, con cuadrantes generados automáticamente (eliminación directa o doble).
        Marca "Público" para que aparezca en la web en "Torneos en directo"; "Privado" para que solo se vea en la
        sección de socios.
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

                  className="admin-link-btn"
                  href={`${window.location.origin}/torneo/${t.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver página / QR
                </a>
                <button type="button" className="admin-link-btn" onClick={() => borrarTorneo(t.id)}>Borrar</button>
              </div>
            </div>

            {abiertoId === t.id && (
              <TorneoDetalle
                torneo={t}
                jugadores={jugadores}
                onCrearCuadrante={(datos) => crearCuadrante(t.id, datos)}
                onBorrarCuadrante={borrarCuadrante}
                onActualizarPartido={actualizarPartido}
                onSortear={sortearCuadrante}
                onReiniciar={reiniciarCuadrante}
                onCrearParticipante={crearParticipante}
                onBorrarParticipante={borrarParticipante}
                onSortearParejas={sortearParejas}
                onCrearJugadorRapido={crearJugadorRapido}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function TorneoDetalle({
  torneo, jugadores, onCrearCuadrante, onBorrarCuadrante, onActualizarPartido, onSortear, onReiniciar,
  onCrearParticipante, onBorrarParticipante, onSortearParejas, onCrearJugadorRapido,
}) {
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
          jugadores={jugadores}
          numeroMaquinas={torneo.numeroMaquinas}
          onBorrar={() => onBorrarCuadrante(c.id)}
          onActualizarPartido={onActualizarPartido}
          onSortear={(participantes, cabezasDeSerie) => onSortear(c.id, participantes, cabezasDeSerie)}
          onReiniciar={() => onReiniciar(c.id)}
          onCrearParticipante={(datos) => onCrearParticipante(c.id, datos)}
          onBorrarParticipante={onBorrarParticipante}
          onSortearParejas={(jugadorIds) => onSortearParejas(c.id, jugadorIds)}
          onCrearJugadorRapido={onCrearJugadorRapido}
        />
      ))}
    </div>
  );
}

function ParticipantesPanel({ cuadrante, jugadores, onCrearParticipante, onBorrarParticipante, onSortearParejas, onCrearJugadorRapido }) {
  const [jugador1Id, setJugador1Id] = useState("");
  const [jugador2Id, setJugador2Id] = useState("");
  const [nombreRapido, setNombreRapido] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const participantes = cuadrante.participantes || [];

  async function anadir(e) {
    e.preventDefault();
    if (!jugador1Id) return;
    setEnviando(true);
    setMensaje(null);
    const error = await onCrearParticipante({ jugador1Id, jugador2Id: jugador2Id || undefined });
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setMensaje({ tipo: "ok", texto: "Participante añadido." });
      setJugador1Id("");
      setJugador2Id("");
    }
    setEnviando(false);
  }

  async function crearRapido() {
    if (!nombreRapido.trim()) return;
    const { jugador, error } = await onCrearJugadorRapido(nombreRapido.trim());
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setNombreRapido("");
      setJugador1Id(jugador.id);
      setMensaje({ tipo: "ok", texto: `Jugador "${jugador.nombre}" creado y seleccionado.` });
    }
  }

  function toggleSeleccionado(id) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function sortear() {
    setEnviando(true);
    setMensaje(null);
    const error = await onSortearParejas(seleccionados);
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setMensaje({ tipo: "ok", texto: "Parejas sorteadas." });
      setSeleccionados([]);
    }
    setEnviando(false);
  }

  return (
    <div className="admin-cuadrante-participantes" style={{ marginBottom: "1rem" }}>
      <h5>Participantes apuntados ({participantes.length})</h5>
      <p className="admin-hint">
        Opcional: si apuntas aquí a jugadores reales (individuales o en pareja), el sorteo de abajo los usará
        automáticamente si dejas la lista de nombres vacía — así queda registrado quién ha jugado cada uno, para
        el histórico. Si prefieres seguir escribiendo los nombres a mano como siempre, no hace falta tocar esto.
      </p>
      {participantes.length === 0 && <p className="chronicle-status">Nadie apuntado todavía con jugadores reales.</p>}
      <ul>
        {participantes.map((p) => (
          <li key={p.id} className="admin-list-item">
            <span>{p.etiqueta}</span>
            <button type="button" className="admin-link-btn" onClick={() => onBorrarParticipante(p.id)}>Quitar</button>
          </li>
        ))}
      </ul>

      <form onSubmit={anadir} className="admin-inline-form">
        <label>
          Jugador / pareja
          <select value={jugador1Id} onChange={(e) => setJugador1Id(e.target.value)}>
            <option value="">Elige un jugador…</option>
            {jugadores.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
          </select>
        </label>
        <label>
          Compañero (opcional, para pareja ya formada)
          <select value={jugador2Id} onChange={(e) => setJugador2Id(e.target.value)}>
            <option value="">— Individual —</option>
            {jugadores.filter((j) => j.id !== jugador1Id).map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
          </select>
        </label>
        <button type="submit" disabled={enviando || !jugador1Id}>Añadir</button>
      </form>

      <div className="admin-inline-form">
        <label>
          Jugador nuevo (invitado, sin cuenta)
          <input value={nombreRapido} onChange={(e) => setNombreRapido(e.target.value)} placeholder="Nombre" />
        </label>
        <button type="button" className="admin-link-btn" onClick={crearRapido}>+ Crear y seleccionar</button>
      </div>

      <details style={{ marginTop: ".8rem" }}>
        <summary style={{ cursor: "pointer" }}>Sortear parejas ciegas</summary>
        <p className="admin-hint">Marca un número par de jugadores; se emparejarán al azar.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: ".6rem" }}>
          {jugadores.map((j) => (
            <label key={j.id} style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
              <input type="checkbox" checked={seleccionados.includes(j.id)} onChange={() => toggleSeleccionado(j.id)} style={{ width: "auto" }} />
              {j.nombre}
            </label>
          ))}
        </div>
        <button type="button" disabled={enviando || seleccionados.length < 2 || seleccionados.length % 2 !== 0} onClick={sortear}>
          Sortear {seleccionados.length} jugadores en parejas
        </button>
      </details>

      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </div>
  );
}

function CuadranteDetalle({
  cuadrante, jugadores, numeroMaquinas, onBorrar, onActualizarPartido, onSortear, onReiniciar,
  onCrearParticipante, onBorrarParticipante, onSortearParejas, onCrearJugadorRapido,
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombresTexto, setNombresTexto] = useState("");
  const [semillasTexto, setSemillasTexto] = useState("");
  const [sorteando, setSorteando] = useState(false);
  const [errorSorteo, setErrorSorteo] = useState(null);
  const [busqueda, setBusqueda] = useState("");

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

  const nombres = nombresTexto.split("\n").map((n) => n.trim()).filter(Boolean);
  const semillas = semillasTexto.split("\n").map((n) => n.trim()).filter(Boolean);
  const semillasNoValidas = semillas.filter((s) => !nombres.includes(s));
  const participantesApuntados = cuadrante.participantes || [];

  async function hacerSorteo(e) {
    e.preventDefault();
    setSorteando(true);
    setErrorSorteo(null);
    const error = await onSortear(nombres, semillas);
    if (error) setErrorSorteo(error);
    else {
      setNombresTexto("");
      setSemillasTexto("");
    }
    setSorteando(false);
  }

  return (
    <div className="admin-cuadrante">
      <div className="admin-cuadrante-header">
        <h4>{cuadrante.nombre} — {cuadrante.tamano} participantes ({cuadrante.tipoEliminacion === "doble" ? "doble elim." : "elim. directa"})</h4>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
            {abierto ? "Ocultar" : "Ver enfrentamientos"}
          </button>
          <button type="button" className="admin-link-btn" onClick={onReiniciar}>Vaciar resultados</button>
          <button type="button" className="admin-link-btn" onClick={onBorrar}>Borrar cuadrante</button>
        </div>
      </div>

      <ParticipantesPanel
        cuadrante={cuadrante}
        jugadores={jugadores}
        onCrearParticipante={onCrearParticipante}
        onBorrarParticipante={onBorrarParticipante}
        onSortearParejas={onSortearParejas}
        onCrearJugadorRapido={onCrearJugadorRapido}
      />

      <form onSubmit={hacerSorteo} className="admin-sorteo-form">
        <label>
          Lista de participantes escritos a mano (opcional si ya has apuntado participantes arriba; un nombre por línea, hasta {cuadrante.tamano})
          <textarea
            rows={4}
            value={nombresTexto}
            onChange={(e) => setNombresTexto(e.target.value)}
            placeholder={`Jugador 1\nJugador 2\n…`}
          />
        </label>
        <label>
          Cabezas de serie (opcional, un nombre por línea, del mejor al peor — deben estar en la lista de arriba)
          <textarea
            rows={2}
            value={semillasTexto}
            onChange={(e) => setSemillasTexto(e.target.value)}
            placeholder={`Mejor jugador\nSegundo mejor\n…`}
          />
          {semillasNoValidas.length > 0 && (
            <span className="admin-hint">
              No están en la lista de participantes: {semillasNoValidas.join(", ")}
            </span>
          )}
        </label>
        <button type="submit" disabled={sorteando || (nombres.length === 0 && participantesApuntados.length === 0)}>
          {sorteando
            ? "Sorteando…"
            : nombres.length > 0
              ? `Sortear cuadro (${nombres.length} participante${nombres.length === 1 ? "" : "s"} escritos)`
              : `Sortear cuadro (${participantesApuntados.length} participante${participantesApuntados.length === 1 ? "" : "s"} apuntados)`}
        </button>
        {errorSorteo && <p className="admin-msg admin-msg-error">{errorSorteo}</p>}
      </form>

      {abierto && (
        <input
          type="text"
          className="admin-busqueda"
          placeholder="Buscar participante en este cuadrante…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      )}

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
                    busqueda={busqueda}
                  />
                ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PartidoRow({ p, maquinasOpciones, onActualizar, busqueda }) {
  const coincide = (nombre) => !!nombre && !!busqueda && nombre.toLowerCase().includes(busqueda.toLowerCase());
  const encontrado = coincide(p.jugador1) || coincide(p.jugador2);
  return (
    <div className={`admin-cuadro-partido ${p.enCurso ? "admin-cuadro-en-curso" : ""} ${encontrado ? "admin-cuadro-encontrado" : ""}`}>
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
