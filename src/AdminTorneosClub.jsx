import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const TAMANOS = [4, 8, 16, 32, 64, 128];

const MODALIDADES = [
  { id: "individual", etiqueta: "Individual" },
  { id: "parejas_hechas", etiqueta: "Parejas ya formadas" },
  { id: "parejas_ciegas", etiqueta: "Parejas ciegas (se sortean)" },
];

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

const RAMA_ETIQUETA = { ganadores: "Cuadro de ganadores", perdedores: "Cuadro de perdedores", final: "Gran final" };

function rondaAbierta(cuadrante, partido) {
  if (partido.ronda <= 1) return true;
  const anteriores = cuadrante.partidos.filter((p) => p.rama === partido.rama && p.ronda === partido.ronda - 1);
  if (anteriores.length === 0) return true;
  return anteriores.every((p) => !!p.ganador || p.resultado === "__BYE_DOBLE__");
}

export default function AdminTorneosClub({ token, salir }) {
  const [torneos, setTorneos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [gestionandoId, setGestionandoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [visibilidad, setVisibilidad] = useState("privado");
  const [numeroMaquinas, setNumeroMaquinas] = useState("");
  const [tipoEliminacion, setTipoEliminacion] = useState("directa");
  const [modalidad, setModalidad] = useState("individual");
  const [insigniaUrl, setInsigniaUrl] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

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
        body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, visibilidad, numeroMaquinas, tipoEliminacion, modalidad, insigniaUrl }),
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
      setModalidad("individual");
      setInsigniaUrl("");
      setMensaje({ tipo: "ok", texto: "Torneo creado." });
      setMostrarFormulario(false);
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
    if (gestionandoId === id) setGestionandoId(null);
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

  async function crearJugadorClub(nombreJugador) {
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

  const torneoEnGestion = torneos.find((t) => t.id === gestionandoId);

  if (torneoEnGestion) {
    return (
      <TorneoGestion
        torneo={torneoEnGestion}
        jugadores={jugadores}
        onVolver={() => setGestionandoId(null)}
        onCrearCuadrante={(datos) => crearCuadrante(torneoEnGestion.id, datos)}
        onBorrarCuadrante={borrarCuadrante}
        onActualizarPartido={actualizarPartido}
        onSortear={sortearCuadrante}
        onReiniciar={reiniciarCuadrante}
        onCrearParticipante={crearParticipante}
        onBorrarParticipante={borrarParticipante}
        onSortearParejas={sortearParejas}
        onCrearJugadorClub={crearJugadorClub}
      />
    );
  }

  return (
    <section className="admin-form">
      <h2>Torneos del club (cuadros)</h2>
      <p className="admin-hint">
        Torneos organizados por el club, con cuadrantes generados automáticamente (eliminación directa o doble).
        Marca "Público" para que aparezca en la web en "Torneos en directo"; "Privado" para que solo se vea en la
        sección de socios (su página con QR sigue siendo accesible por enlace directo en ambos casos).
      </p>
      {!mostrarFormulario && (
        <button type="button" onClick={() => setMostrarFormulario(true)} style={{ marginBottom: "1.5rem" }}>
          ＋ Añadir torneo
        </button>
      )}
      
      {mostrarFormulario && (
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
          Modalidad
          <select value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
            {MODALIDADES.map((m) => (
              <option key={m.id} value={m.id}>{m.etiqueta}</option>
            ))}
          </select>
          <span className="admin-hint">
            Define cómo se apuntan participantes a los cuadrantes de este torneo: uno a uno, en parejas que tú
            eliges, o en parejas sorteadas al azar.
          </span>
        </label>
        <label>
          Visibilidad
          <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)}>
            <option value="privado">Privado (solo socios)</option>
            <option value="publico">Público (visible en la web)</option>
          </select>
        </label>
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear torneo"}</button>
          <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
        </div>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>
      )}

      {torneos.length === 0 && <p className="chronicle-status">Todavía no hay torneos del club.</p>}

      <ul className="admin-torneos-club-list">
        {torneos.map((t) => (
          <li key={t.id} className="admin-list-item">
            <div>
              <strong>{t.nombre}</strong>
              <time>
                {formatFecha(t.fechaInicio)} – {formatFecha(t.fechaFin)} ·{" "}
                {t.visibilidad === "publico" ? "Público" : "Privado"} ·{" "}
                {t.tipoEliminacion === "doble" ? "Doble eliminación" : "Eliminación directa"} ·{" "}
                {MODALIDADES.find((m) => m.id === t.modalidad)?.etiqueta || "Individual"}
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
              <button type="button" className="admin-link-btn" onClick={() => cambiarFinalizado(t, !t.finalizado)}>
                {t.finalizado ? "Reabrir torneo" : "Marcar finalizado"}
              </button>
              <button type="button" className="admin-link-btn" onClick={() => setGestionandoId(t.id)}>Gestionar</button>
              <a className="admin-link-btn" href={`${window.location.origin}/torneo/${t.id}`} target="_blank" rel="noopener noreferrer">
                Ver página / QR
              </a>
              <button type="button" className="admin-link-btn" onClick={() => borrarTorneo(t.id)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TorneoGestion({
  torneo, jugadores, onVolver, onCrearCuadrante, onBorrarCuadrante, onActualizarPartido,
  onSortear, onReiniciar, onCrearParticipante, onBorrarParticipante, onSortearParejas, onCrearJugadorClub,
}) {
  const [subpestana, setSubpestana] = useState("participantes");

  return (
    <section className="admin-form">
      <div className="admin-list-item" style={{ marginBottom: "1rem" }}>
        <div>
          <button type="button" className="admin-link-btn" onClick={onVolver}>← Volver a la lista</button>
          <h2 style={{ margin: ".4rem 0 0" }}>{torneo.nombre}</h2>
          <span className="admin-hint">
            {MODALIDADES.find((m) => m.id === torneo.modalidad)?.etiqueta || "Individual"} ·{" "}
            {torneo.tipoEliminacion === "doble" ? "Doble eliminación" : "Eliminación directa"}
          </span>
        </div>
      </div>

      <nav className="admin-tabs" style={{ marginBottom: "1.2rem" }}>
        <button
          type="button"
          className={`admin-tab ${subpestana === "participantes" ? "admin-tab-active" : ""}`}
          onClick={() => setSubpestana("participantes")}
        >
          Participantes
        </button>
        <button
          type="button"
          className={`admin-tab ${subpestana === "cuadrantes" ? "admin-tab-active" : ""}`}
          onClick={() => setSubpestana("cuadrantes")}
        >
          Cuadrantes
        </button>
      </nav>

      {subpestana === "participantes" && (
        <div>
          <JugadoresDelClub jugadores={jugadores} onCrear={onCrearJugadorClub} />

          <p className="admin-hint" style={{ marginTop: "1.2rem" }}>
            Apunta aquí a jugadores del club (arriba) a los cuadrantes de este torneo. Si vienen invitados que no
            son del club y no necesitas guardar su historial, no hace falta apuntarlos aquí: escribe su nombre
            directamente en la lista de la pestaña "Cuadrantes" al hacer el sorteo.
          </p>
          {(torneo.cuadrantes || []).length === 0 && (
            <p className="chronicle-status">Todavía no hay cuadrantes creados — crea uno primero en la pestaña "Cuadrantes".</p>
          )}
          {(torneo.cuadrantes || []).map((c) => (
            <div key={c.id} className="admin-cuadrante">
              <h4>{c.nombre} — {c.tamano} participantes</h4>
              <ParticipantesPanel
                cuadrante={c}
                modalidad={torneo.modalidad}
                jugadores={jugadores}
                onCrearParticipante={(datos) => onCrearParticipante(c.id, datos)}
                onBorrarParticipante={onBorrarParticipante}
                onSortearParejas={(jugadorIds) => onSortearParejas(c.id, jugadorIds)}
                onSortear={(participantes, cabezasDeSerie) => onSortear(c.id, participantes, cabezasDeSerie)}
              />
            </div>
          ))}
        </div>
      )}

      {subpestana === "cuadrantes" && (
        <TorneoCuadrantes
          torneo={torneo}
          onCrearCuadrante={onCrearCuadrante}
          onBorrarCuadrante={onBorrarCuadrante}
          onActualizarPartido={onActualizarPartido}
          onSortear={onSortear}
          onReiniciar={onReiniciar}
        />
      )}
    </section>
  );
}

function JugadoresDelClub({ jugadores, onCrear }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setMensaje(null);
    const { jugador, error } = await onCrear(nombre.trim());
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setMensaje({ tipo: "ok", texto: `"${jugador.nombre}" añadido al plantel del club.` });
      setNombre("");
    }
    setCreando(false);
  }

  return (
    <div className="admin-cuadrante-participantes">
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar" : "Ver / gestionar"} jugadores del club ({jugadores.length})
      </button>
      {abierto && (
        <div style={{ marginTop: ".6rem" }}>
          <p className="admin-hint">
            Este es el plantel permanente del club — solo quien esté aquí tendrá historial personal más adelante.
          </p>
          <ul>
            {jugadores.map((j) => (
              <li key={j.id} className="admin-list-item">
                <span>{j.nombre}{j.apodo ? ` — "${j.apodo}"` : ""}</span>
              </li>
            ))}
            {jugadores.length === 0 && <p className="chronicle-status">Todavía no hay nadie en el plantel del club.</p>}
          </ul>
          <form onSubmit={crear} className="admin-inline-form">
            <label>
              Nombre del nuevo jugador del club
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" />
            </label>
            <button type="submit" disabled={creando || !nombre.trim()}>{creando ? "Añadiendo…" : "Añadir al plantel"}</button>
          </form>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </div>
      )}
    </div>
  );
}

function TorneoCuadrantes({ torneo, onCrearCuadrante, onBorrarCuadrante, onActualizarPartido, onSortear, onReiniciar }) {
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
          onSortear={(participantes, cabezasDeSerie) => onSortear(c.id, participantes, cabezasDeSerie)}
          onReiniciar={() => onReiniciar(c.id)}
        />
      ))}
    </div>
  );
}

function ParticipantesPanel({ cuadrante, modalidad, jugadores, onCrearParticipante, onBorrarParticipante, onSortearParejas, onSortear }) {
  const [jugador1Id, setJugador1Id] = useState("");
  const [jugador2Id, setJugador2Id] = useState("");
  const [seleccionados, setSeleccionados] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const [nombresTexto, setNombresTexto] = useState("");
  const [semillasTexto, setSemillasTexto] = useState("");
  const [sorteando, setSorteando] = useState(false);
  const [errorSorteo, setErrorSorteo] = useState(null);

  const participantes = cuadrante.participantes || [];
  const esParejasCiegas = modalidad === "parejas_ciegas";
  const esParejasHechas = modalidad === "parejas_hechas";

  async function anadir(e) {
    e.preventDefault();
    if (!jugador1Id) return;
    if (esParejasHechas && !jugador2Id) {
      setMensaje({ tipo: "error", texto: "Este torneo es de parejas ya formadas: elige también el compañero." });
      return;
    }
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

  function toggleSeleccionado(id) {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function sortearParejasCiegas() {
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

  const nombres = nombresTexto.split("\n").map((n) => n.trim()).filter(Boolean);
  const semillas = semillasTexto.split("\n").map((n) => n.trim()).filter(Boolean);
  const semillasNoValidas = semillas.filter((s) => !nombres.includes(s));

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
    <div className="admin-cuadrante-participantes" style={{ marginBottom: "1.5rem" }}>
      <h5>Participantes apuntados ({participantes.length})</h5>
      {participantes.length === 0 && <p className="chronicle-status">Nadie apuntado todavía.</p>}
      <ul>
        {participantes.map((p) => (
          <li key={p.id} className="admin-list-item">
            <span>{p.etiqueta}</span>
            <button type="button" className="admin-link-btn" onClick={() => onBorrarParticipante(p.id)}>Quitar</button>
          </li>
        ))}
      </ul>

      {jugadores.length === 0 && (
        <p className="admin-hint">Añade jugadores al plantel del club arriba antes de poder apuntarlos aquí.</p>
      )}

      {jugadores.length > 0 && !esParejasCiegas && (
        <form onSubmit={anadir} className="admin-inline-form">
          <label>
            {esParejasHechas ? "Jugador 1 de la pareja" : "Jugador"}
            <select value={jugador1Id} onChange={(e) => setJugador1Id(e.target.value)}>
              <option value="">Elige un jugador…</option>
              {jugadores.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </label>
          {esParejasHechas ? (
            <label>
              Jugador 2 de la pareja
              <select value={jugador2Id} onChange={(e) => setJugador2Id(e.target.value)}>
                <option value="">Elige el compañero…</option>
                {jugadores.filter((j) => j.id !== jugador1Id).map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </label>
          ) : (
            <label>
              Compañero (opcional)
              <select value={jugador2Id} onChange={(e) => setJugador2Id(e.target.value)}>
                <option value="">— Individual —</option>
                {jugadores.filter((j) => j.id !== jugador1Id).map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </label>
          )}
          <button type="submit" disabled={enviando || !jugador1Id}>Añadir</button>
        </form>
      )}

      {jugadores.length > 0 && esParejasCiegas && (
        <div>
          <p className="admin-hint">Marca un número par de jugadores del club; se emparejarán al azar.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".6rem", marginBottom: ".6rem" }}>
            {jugadores.map((j) => (
              <label key={j.id} style={{ display: "flex", alignItems: "center", gap: ".3rem" }}>
                <input type="checkbox" checked={seleccionados.includes(j.id)} onChange={() => toggleSeleccionado(j.id)} style={{ width: "auto" }} />
                {j.nombre}
              </label>
            ))}
          </div>
          <button type="button" disabled={enviando || seleccionados.length < 2 || seleccionados.length % 2 !== 0} onClick={sortearParejasCiegas}>
            Sortear {seleccionados.length} jugadores en parejas
          </button>
        </div>
      )}

      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      <form onSubmit={hacerSorteo} className="admin-sorteo-form" style={{ marginTop: "1.2rem" }}>
        <label>
          Invitados sueltos, escritos a mano — no son del club (un nombre por línea, hasta {cuadrante.tamano}; déjalo vacío para usar solo los apuntados arriba)
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
        <button type="submit" disabled={sorteando || (nombres.length === 0 && participantes.length === 0)}>
          {sorteando
            ? "Sorteando…"
            : nombres.length > 0
              ? `Sortear cuadro (${nombres.length} invitado${nombres.length === 1 ? "" : "s"} + ${participantes.length} del club)`
              : `Sortear cuadro (${participantes.length} participante${participantes.length === 1 ? "" : "s"} apuntados)`}
        </button>
        {errorSorteo && <p className="admin-msg admin-msg-error">{errorSorteo}</p>}
      </form>
    </div>
  );
}

function CuadranteDetalle({ cuadrante, numeroMaquinas, onBorrar, onActualizarPartido, onSortear, onReiniciar }) {
  const [abierto, setAbierto] = useState(false);
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

    <div className="admin-hint">
      <strong>Participantes confirmados ({participantesApuntados.length}):</strong>{" "}
      {participantesApuntados.length > 0
        ? participantesApuntados.map((p) => p.etiqueta).join(", ")
        : "ninguno todavía — apúntalos en la pestaña \"Participantes\"."}
    </div>

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
                    key={`${p.id}-${p.jugador1}-${p.jugador2}-${p.ganador}-${p.resultado}-${p.maquina}`}
                    p={p}
                    maquinasOpciones={maquinasOpciones}
                    onActualizar={(datos) => onActualizarPartido(p.id, datos)}
                    busqueda={busqueda}
                    bloqueado={!rondaAbierta(cuadrante, p) && !p.enCurso}
                  />
                ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PartidoRow({ p, maquinasOpciones, onActualizar, busqueda, bloqueado }) {
  const coincide = (nombre) => !!nombre && !!busqueda && nombre.toLowerCase().includes(busqueda.toLowerCase());
  const encontrado = coincide(p.jugador1) || coincide(p.jugador2);
  return (
    <div className={`admin-cuadro-partido ${p.enCurso ? "admin-cuadro-en-curso" : ""} ${encontrado ? "admin-cuadro-encontrado" : ""} ${bloqueado ? "admin-cuadro-bloqueado" : ""}`}>
      {bloqueado && <span className="admin-hint" style={{ display: "block" }}>🔒 Bloqueado hasta terminar la ronda anterior — "Marcar en curso" lo activa manualmente.</span>}
      <input
        defaultValue={p.jugador1 || ""}
        placeholder="Jugador 1"
        disabled={bloqueado}
        onBlur={(e) => e.target.value !== (p.jugador1 || "") && onActualizar({ jugador1: e.target.value })}
      />
      <button
        type="button"
        className={`admin-link-btn ${p.ganador && p.ganador === p.jugador1 ? "admin-ganador-activo" : ""}`}
        disabled={bloqueado || !p.jugador1 || !p.jugador2}
        onClick={() => onActualizar({ ganador: p.jugador1 })}
      >
        Ganó
      </button>
      <span>vs</span>
      <input
        defaultValue={p.jugador2 || ""}
        placeholder="Jugador 2"
        disabled={bloqueado}
        onBlur={(e) => e.target.value !== (p.jugador2 || "") && onActualizar({ jugador2: e.target.value })}
      />
      <button
        type="button"
        className={`admin-link-btn ${p.ganador && p.ganador === p.jugador2 ? "admin-ganador-activo" : ""}`}
        disabled={bloqueado || !p.jugador1 || !p.jugador2}
        onClick={() => onActualizar({ ganador: p.jugador2 })}
      >
        Ganó
      </button>
      <input
        defaultValue={p.resultado || ""}
        placeholder="Resultado"
        className="admin-cuadro-resultado"
        disabled={bloqueado}
        onBlur={(e) => e.target.value !== (p.resultado || "") && onActualizar({ resultado: e.target.value })}
      />
      {maquinasOpciones.length > 0 ? (
        <select defaultValue={p.maquina || ""} disabled={bloqueado} onChange={(e) => onActualizar({ maquina: e.target.value })}>
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
          disabled={bloqueado}
          onBlur={(e) => e.target.value !== (p.maquina || "") && onActualizar({ maquina: e.target.value })}
        />
      )}
      <button type="button" className="admin-link-btn" onClick={() => onActualizar({ enCurso: !p.enCurso })}>
        {p.enCurso ? "★ En curso" : "Marcar en curso"}
      </button>
    </div>
  );
}
