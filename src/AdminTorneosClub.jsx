import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";
import { GRUPOS_POR_METODO } from "./sorteoParejas.js";
import { agruparPorSocio } from "./agruparJugadores.js";

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
  const [maquinas, setMaquinas] = useState([]);
  const [gestionandoId, setGestionandoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [filtro, setFiltro] = useState("activos");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [visibilidad, setVisibilidad] = useState("privado");
  const [numeroMaquinas, setNumeroMaquinas] = useState("");
  const [tipoEliminacion, setTipoEliminacion] = useState("directa");
  const [modalidad, setModalidad] = useState("individual");
  const [insigniaUrl, setInsigniaUrl] = useState("");
  const [afectaCalendario, setAfectaCalendario] = useState(true);
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
  
  const cargarMaquinas = () => {
    fetch(`${API_URL}/api/maquinas`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMaquinas)
      .catch(() => {});
  };

useEffect(() => {
  cargarTorneos();
  cargarJugadores();
  cargarMaquinas();
}, []);

  async function crearTorneo(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/torneos-club`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre, descripcion, fechaInicio, fechaFin, visibilidad, numeroMaquinas, tipoEliminacion, modalidad, insigniaUrl, afectaCalendario }),
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
      setAfectaCalendario(true);
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

async function programarCalendario(partidoId, datos) {
  await fetch(`${API_URL}/api/torneos-club/partidos/${partidoId}/calendario`, {
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

  async function sortearParejasGrupos(cuadranteId, entradas) {
    const res = await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadranteId}/sortear-parejas-grupos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ entradas }),
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
  const torneosFiltrados = torneos.filter((t) => (filtro === "terminados" ? t.finalizado : !t.finalizado));

  if (torneoEnGestion) {
    return (
      <TorneoGestion
        torneo={torneoEnGestion}
        jugadores={jugadores}
        maquinas={maquinas}
        onVolver={() => setGestionandoId(null)}
        onCrearCuadrante={(datos) => crearCuadrante(torneoEnGestion.id, datos)}
        onBorrarCuadrante={borrarCuadrante}
        onActualizarPartido={actualizarPartido}
        onProgramarCalendario={programarCalendario}
        onSortear={sortearCuadrante}
        onReiniciar={reiniciarCuadrante}
        onCrearParticipante={crearParticipante}
        onBorrarParticipante={borrarParticipante}
        onSortearParejas={sortearParejas}
        onSortearParejasGrupos={sortearParejasGrupos}
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
        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
          <input type="checkbox" checked={afectaCalendario} onChange={(e) => setAfectaCalendario(e.target.checked)} style={{ width: "auto" }} />
          Afecta al calendario general del club
        </label>
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
          <button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear torneo"}</button>
          <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
        </div>
        {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>
      )}

      {torneos.length === 0 && <p className="chronicle-status">Todavía no hay torneos del club.</p>}

      {torneos.length > 0 && (
        <nav className="admin-tabs" style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={`admin-tab ${filtro === "activos" ? "admin-tab-active" : ""}`}
            onClick={() => setFiltro("activos")}
          >
            En curso ({torneos.filter((t) => !t.finalizado).length})
          </button>
          <button
            type="button"
            className={`admin-tab ${filtro === "terminados" ? "admin-tab-active" : ""}`}
            onClick={() => setFiltro("terminados")}
          >
            Terminados ({torneos.filter((t) => t.finalizado).length})
          </button>
        </nav>
      )}

      {torneos.length > 0 && torneosFiltrados.length === 0 && (
        <p className="chronicle-status">
          {filtro === "terminados" ? "Todavía no hay torneos terminados." : "No hay torneos en curso — todos están marcados como terminados."}
        </p>
      )}

      <ul className="admin-torneos-club-list">
        {torneosFiltrados.map((t) => (
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
  torneo, jugadores, maquinas, onVolver, onCrearCuadrante, onBorrarCuadrante, onActualizarPartido, onProgramarCalendario,
  onSortear, onReiniciar, onCrearParticipante, onBorrarParticipante, onSortearParejas, onSortearParejasGrupos,
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
          <JugadoresDelClub jugadores={jugadores} />
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
                onSortearParejasGrupos={(entradas) => onSortearParejasGrupos(c.id, entradas)}
                onSortear={(participantes, cabezasDeSerie) => onSortear(c.id, participantes, cabezasDeSerie)}
              />
            </div>
          ))}
        </div>
      )}

      {subpestana === "cuadrantes" && (
        <TorneoCuadrantes
          torneo={torneo}
          maquinas={maquinas}
          onCrearCuadrante={onCrearCuadrante}
          onBorrarCuadrante={onBorrarCuadrante}
          onActualizarPartido={onActualizarPartido}
          onProgramarCalendario={onProgramarCalendario}
          onSortear={onSortear}
          onReiniciar={onReiniciar}
        />
      )}
    </section>
  );
}

function JugadoresDelClub({ jugadores }) {
  const [abierto, setAbierto] = useState(false);
  const { socios, invitados } = agruparPorSocio(jugadores);

  return (
    <div className="admin-cuadrante-participantes">
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar" : "Ver"} jugadores del club ({jugadores.length})
      </button>
      {abierto && (
        <div style={{ marginTop: ".6rem" }}>
          {jugadores.length === 0 && <p className="chronicle-status">Todavía no hay ningún jugador dado de alta.</p>}
          {socios.length > 0 && (
            <>
              <p className="admin-hint">Socios</p>
              <ul>
                {socios.map((j) => (
                  <li key={j.id} className="admin-list-item">
                    <span>{j.nombre}{j.apodo ? ` — "${j.apodo}"` : ""}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {invitados.length > 0 && (
            <>
              <p className="admin-hint">Invitados</p>
              <ul>
                {invitados.map((j) => (
                  <li key={j.id} className="admin-list-item">
                    <span>{j.nombre}{j.apodo ? ` — "${j.apodo}"` : ""}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TorneoCuadrantes({ torneo, maquinas, onCrearCuadrante, onBorrarCuadrante, onActualizarPartido, onProgramarCalendario, onSortear, onReiniciar }) {
  const [nombreCuadrante, setNombreCuadrante] = useState("");
  const [tamano, setTamano] = useState(8);
  const [metodoSorteoParejas, setMetodoSorteoParejas] = useState("AB");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);

  const esParejasCiegas = torneo.modalidad === "parejas_ciegas";

  async function submit(e) {
    e.preventDefault();
    if (!nombreCuadrante.trim()) return;
    setCreando(true);
    setError(null);
    const datos = { nombre: nombreCuadrante.trim(), tamano, tipoEliminacion: torneo.tipoEliminacion };
    if (esParejasCiegas) datos.metodoSorteoParejas = metodoSorteoParejas;
    const ok = await onCrearCuadrante(datos);
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
        {esParejasCiegas && (
          <select value={metodoSorteoParejas} onChange={(e) => setMetodoSorteoParejas(e.target.value)}>
            <option value="AB">Método AB (2 grupos)</option>
            <option value="ABC">Método ABC (3 grupos)</option>
            <option value="ABCD">Método ABCD (4 grupos)</option>
          </select>
        )}
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
          maquinas={maquinas}
          onBorrar={() => onBorrarCuadrante(c.id)}
          onActualizarPartido={onActualizarPartido}
          onProgramarCalendario={onProgramarCalendario}
          onSortear={(participantes, cabezasDeSerie) => onSortear(c.id, participantes, cabezasDeSerie)}
          onReiniciar={() => onReiniciar(c.id)}
        />
      ))}
    </div>
  );
}

function ParticipantesPanel({ cuadrante, modalidad, jugadores, onCrearParticipante, onBorrarParticipante, onSortearParejasGrupos, onSortear }) {
  const [nombreManual, setNombreManual] = useState("");
  const [poolManual, setPoolManual] = useState([]);
  const [parejaSel1, setParejaSel1] = useState("");
  const [parejaSel2, setParejaSel2] = useState("");
  const [semillasTexto, setSemillasTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [errorSorteo, setErrorSorteo] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const participantes = cuadrante.participantes || [];
  const esParejasCiegas = modalidad === "parejas_ciegas";
  const esParejasHechas = modalidad === "parejas_hechas";
  const esParejas = esParejasCiegas || esParejasHechas;
  const grupos = esParejasCiegas ? GRUPOS_POR_METODO[cuadrante.metodoSorteoParejas] || [] : [];

  const idsYaApuntados = new Set();
  for (const p of participantes) {
    if (p.jugador1Id) idsYaApuntados.add(p.jugador1Id);
    if (p.jugador2Id) idsYaApuntados.add(p.jugador2Id);
  }
  const clubEnPool = new Set(poolManual.filter((p) => p.jugadorId).map((p) => p.jugadorId));
  const disponiblesClub = jugadores.filter((j) => !idsYaApuntados.has(j.id) && !clubEnPool.has(j.id));
  const disponiblesAgrupados = agruparPorSocio(disponiblesClub);

  function anadirAlPool(jugadorId, nombre) {
    setPoolManual((prev) => [...prev, { key: crypto.randomUUID(), jugadorId, nombre, grupo: grupos[0] || null }]);
  }

  function anadirManualAlPool(e) {
    e.preventDefault();
    if (!nombreManual.trim()) return;
    anadirAlPool(null, nombreManual.trim());
    setNombreManual("");
  }

  function quitarDelPool(key) {
    setPoolManual((prev) => prev.filter((p) => p.key !== key));
    if (parejaSel1 === key) setParejaSel1("");
    if (parejaSel2 === key) setParejaSel2("");
  }

  function cambiarGrupo(key, grupo) {
    setPoolManual((prev) => prev.map((p) => (p.key === key ? { ...p, grupo } : p)));
  }

  // ---- individual ----
  async function anadirIndividualDirecto(jugadorId) {
    setEnviando(true);
    setMensaje(null);
    const error = await onCrearParticipante({ jugador1Id: jugadorId });
    if (error) setMensaje({ tipo: "error", texto: error });
    setEnviando(false);
  }
  async function anadirManualDirecto(e) {
    e.preventDefault();
    if (!nombreManual.trim()) return;
    setEnviando(true);
    setMensaje(null);
    const error = await onCrearParticipante({ nombre: nombreManual.trim() });
    if (error) setMensaje({ tipo: "error", texto: error });
    else setNombreManual("");
    setEnviando(false);
  }

  // ---- parejas ya formadas ----
  async function formarPareja() {
    const e1 = poolManual.find((p) => p.key === parejaSel1);
    const e2 = poolManual.find((p) => p.key === parejaSel2);
    if (!e1 || !e2 || e1.key === e2.key) return;
    setEnviando(true);
    setMensaje(null);
    const datos = {};
    if (e1.jugadorId) datos.jugador1Id = e1.jugadorId;
    else datos.nombre1 = e1.nombre;
    if (e2.jugadorId) datos.jugador2Id = e2.jugadorId;
    else datos.nombre2 = e2.nombre;
    const error = await onCrearParticipante(datos);
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setPoolManual((prev) => prev.filter((p) => p.key !== e1.key && p.key !== e2.key));
      setParejaSel1("");
      setParejaSel2("");
    }
    setEnviando(false);
  }

  // ---- parejas ciegas: sorteo por grupos de nivel ----
  function conteoPorGrupo() {
    const c = {};
    for (const g of grupos) c[g] = poolManual.filter((p) => p.grupo === g).length;
    return c;
  }
  function errorGrupos() {
    if (!cuadrante.metodoSorteoParejas) return "Este cuadrante no tiene definido un método de sorteo — bórralo y créalo de nuevo eligiendo un método.";
    const c = conteoPorGrupo();
    const metodo = cuadrante.metodoSorteoParejas;
    if (metodo === "AB" && c.A !== c.B) return `El grupo A (${c.A}) y el grupo B (${c.B}) deben tener el mismo número de jugadores.`;
    if (metodo === "ABC") {
      if (c.A !== c.C) return `El grupo A (${c.A}) y el grupo C (${c.C}) deben tener el mismo número de jugadores.`;
      if (c.B % 2 !== 0) return `El grupo B (${c.B}) necesita un número par de jugadores.`;
    }
    if (metodo === "ABCD") {
      if (c.A !== c.D) return `El grupo A (${c.A}) y el grupo D (${c.D}) deben tener el mismo número de jugadores.`;
      if (c.B !== c.C) return `El grupo B (${c.B}) y el grupo C (${c.C}) deben tener el mismo número de jugadores.`;
    }
    return null;
  }
  const errorGruposActual = esParejasCiegas && poolManual.length > 0 ? errorGrupos() : null;

  async function sortearPorGrupos() {
    setEnviando(true);
    setMensaje(null);
    const entradas = poolManual.map((p) => ({
      jugadorId: p.jugadorId || undefined,
      nombre: p.jugadorId ? undefined : p.nombre,
      grupo: p.grupo,
    }));
    const error = await onSortearParejasGrupos(entradas);
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setPoolManual([]);
      setMensaje({ tipo: "ok", texto: "Parejas sorteadas." });
    }
    setEnviando(false);
  }

  const semillas = semillasTexto.split("\n").map((n) => n.trim()).filter(Boolean);
  const etiquetas = participantes.map((p) => p.etiqueta);
  const semillasNoValidas = semillas.filter((s) => !etiquetas.includes(s));

  async function hacerSorteo() {
    setSorteando(true);
    setErrorSorteo(null);
    const error = await onSortear([], semillas);
    if (error) setErrorSorteo(error);
    else setSemillasTexto("");
    setSorteando(false);
  }

  return (
    <div className="admin-cuadrante-participantes" style={{ marginBottom: "1.5rem" }}>
      {esParejas && (
        <>
          <h5>Jugadores disponibles</h5>
          <p className="admin-hint-bloque">Añádelos aquí uno a uno, del plantel o a mano; luego fórmalos en parejas más abajo.</p>

          <form onSubmit={anadirManualAlPool} className="admin-inline-form">
            <label>
              Añadir invitado por nombre
              <input value={nombreManual} onChange={(e) => setNombreManual(e.target.value)} placeholder="Nombre y apellido" />
            </label>
            <button type="submit" disabled={!nombreManual.trim()}>＋ Añadir a disponibles</button>
          </form>

          {disponiblesClub.length > 0 && (
            <div style={{ margin: ".6rem 0" }}>
              <p className="admin-hint">Añadir del plantel del club:</p>
              {disponiblesAgrupados.socios.length > 0 && (
                <>
                  <p className="admin-hint" style={{ fontSize: ".8em", margin: ".3rem 0 0" }}>Socios</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                    {disponiblesAgrupados.socios.map((j) => (
                      <button key={j.id} type="button" className="admin-link-btn" onClick={() => anadirAlPool(j.id, j.nombre)}>
                        ＋ {j.nombre}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {disponiblesAgrupados.invitados.length > 0 && (
                <>
                  <p className="admin-hint" style={{ fontSize: ".8em", margin: ".3rem 0 0" }}>Invitados</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                    {disponiblesAgrupados.invitados.map((j) => (
                      <button key={j.id} type="button" className="admin-link-btn" onClick={() => anadirAlPool(j.id, j.nombre)}>
                        ＋ {j.nombre}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <ul>
            {poolManual.map((p) => (
              <li key={p.key} className="admin-list-item">
                <span>{p.nombre}{!p.jugadorId && " (invitado)"}</span>
                <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
                  {esParejasCiegas && grupos.length > 0 && (
                    <select value={p.grupo || ""} onChange={(e) => cambiarGrupo(p.key, e.target.value)}>
                      {grupos.map((g) => <option key={g} value={g}>Grupo {g}</option>)}
                    </select>
                  )}
                  <button type="button" className="admin-link-btn" onClick={() => quitarDelPool(p.key)}>Quitar</button>
                </div>
              </li>
            ))}
            {poolManual.length === 0 && <p className="chronicle-status">Nadie en la lista de disponibles todavía.</p>}
          </ul>
        </>
      )}

      {esParejasHechas && (
        <div style={{ marginTop: "1rem" }}>
          <h5>Formar pareja</h5>
          <div className="admin-inline-form">
            <label>
              Jugador 1
              <select value={parejaSel1} onChange={(e) => setParejaSel1(e.target.value)}>
                <option value="">Elige…</option>
                {poolManual.filter((p) => p.key !== parejaSel2).map((p) => (
                  <option key={p.key} value={p.key}>{p.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              Jugador 2
              <select value={parejaSel2} onChange={(e) => setParejaSel2(e.target.value)}>
                <option value="">Elige…</option>
                {poolManual.filter((p) => p.key !== parejaSel1).map((p) => (
                  <option key={p.key} value={p.key}>{p.nombre}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={enviando || !parejaSel1 || !parejaSel2} onClick={formarPareja}>
              Formar pareja
            </button>
          </div>
        </div>
      )}

      {esParejasCiegas && (
        <div style={{ marginTop: "1rem" }}>
          <h5>Sorteo por niveles ({cuadrante.metodoSorteoParejas || "sin método"})</h5>
          {grupos.length > 0 && (
            <p className="admin-hint">
              {grupos.map((g) => `${g}: ${conteoPorGrupo()[g] || 0}`).join(" · ")}
            </p>
          )}
          {errorGruposActual && <p className="admin-msg admin-msg-error">{errorGruposActual}</p>}
          <button
            type="button"
            disabled={enviando || poolManual.length < 2 || !!errorGruposActual}
            onClick={sortearPorGrupos}
          >
            Sortear {poolManual.length} jugadores en parejas niveladas
          </button>
        </div>
      )}

      {!esParejas && (
        <>
          <h5>Añadir participante</h5>
          <form onSubmit={anadirManualDirecto} className="admin-inline-form">
            <label>
              Invitado por nombre
              <input value={nombreManual} onChange={(e) => setNombreManual(e.target.value)} placeholder="Nombre y apellido" />
            </label>
            <button type="submit" disabled={enviando || !nombreManual.trim()}>Añadir</button>
          </form>
          {disponiblesAgrupados.socios.length > 0 && (
            <>
              <p className="admin-hint" style={{ fontSize: ".8em" }}>Socios</p>
              <ul>
                {disponiblesAgrupados.socios.map((j) => (
                  <li key={j.id} className="admin-list-item">
                    <span>{j.nombre}</span>
                    <button type="button" className="admin-link-btn" disabled={enviando} onClick={() => anadirIndividualDirecto(j.id)}>
                      ＋ Añadir
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {disponiblesAgrupados.invitados.length > 0 && (
            <>
              <p className="admin-hint" style={{ fontSize: ".8em" }}>Invitados</p>
              <ul>
                {disponiblesAgrupados.invitados.map((j) => (
                  <li key={j.id} className="admin-list-item">
                    <span>{j.nombre}</span>
                    <button type="button" className="admin-link-btn" disabled={enviando} onClick={() => anadirIndividualDirecto(j.id)}>
                      ＋ Añadir
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h5 style={{ marginTop: "1.2rem" }}>Participantes ({participantes.length})</h5>
      {participantes.length === 0 && <p className="chronicle-status">Nadie apuntado todavía.</p>}
      <ul>
        {participantes.map((p) => (
          <li key={p.id} className="admin-list-item">
            <span>{p.etiqueta}</span>
            <button type="button" className="admin-link-btn" onClick={() => onBorrarParticipante(p.id)}>Quitar</button>
          </li>
        ))}
      </ul>

      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      <div style={{ marginTop: "1.2rem" }}>
        <label>
          Cabezas de serie (opcional, un nombre por línea, del mejor al peor — deben estar en la lista de participantes)
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
        <button type="button" disabled={sorteando || participantes.length === 0} onClick={hacerSorteo}>
          {sorteando ? "Sorteando…" : `Sortear cuadro (${participantes.length} participante${participantes.length === 1 ? "" : "s"})`}
        </button>
        {errorSorteo && <p className="admin-msg admin-msg-error">{errorSorteo}</p>}
      </div>
    </div>
  );
}

function CuadranteDetalle({ cuadrante, numeroMaquinas, maquinas, onBorrar, onActualizarPartido, onProgramarCalendario, onSortear, onReiniciar }) {
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

  const participantesApuntados = cuadrante.participantes || [];

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
                    key={`${p.id}-${p.jugador1}-${p.jugador2}-${p.ganador}-${p.resultado}-${p.maquina}-${p.confirmadoCalendario}-${p.fechaCalendario}`}
                    p={p}
                    maquinasOpciones={maquinasOpciones}
                    maquinas={maquinas}
                    onActualizar={(datos) => onActualizarPartido(p.id, datos)}
                    onProgramar={(datos) => onProgramarCalendario(p.id, datos)}
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

function PartidoRow({ p, maquinasOpciones, maquinas, onActualizar, onProgramar, busqueda, bloqueado }) {
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
{p.jugador1 && p.jugador2 && <CalendarioPartido p={p} maquinas={maquinas} onProgramar={onProgramar} />}
</div>
);
}

function CalendarioPartido({ p, maquinas, onProgramar }) {
  const [fecha, setFecha] = useState(p.fechaCalendario ? new Date(p.fechaCalendario).toISOString().slice(0, 16) : "");
  const [maquinaId, setMaquinaId] = useState(p.maquinaCalendarioId || "");

  return (
    <div style={{ display: "flex", gap: ".4rem", alignItems: "center", marginTop: ".3rem", flexWrap: "wrap" }}>
      <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ fontSize: ".8em" }} />
      <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} style={{ fontSize: ".8em" }}>
        <option value="">Máquina del calendario…</option>
        {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>
      {p.confirmadoCalendario ? (
        <button type="button" className="admin-link-btn" onClick={() => onProgramar({ confirmado: false })}>
          ✓ En calendario — quitar
        </button>
      ) : (
        <button
          type="button"
          className="admin-link-btn"
          disabled={!fecha || !maquinaId}
          onClick={() => onProgramar({ fecha: new Date(fecha).toISOString(), maquinaId, confirmado: true })}
        >
          Confirmar en calendario
        </button>
      )}
    </div>
  );
}
