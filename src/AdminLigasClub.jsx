import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";
import { GRUPOS_POR_METODO } from "./sorteoParejas.js";
import { agruparPorSocio } from "./agruparJugadores.js";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

const MODALIDADES = [
  { id: "individual", etiqueta: "Individual" },
  { id: "parejas_hechas", etiqueta: "Parejas ya formadas" },
  { id: "parejas_ciegas", etiqueta: "Parejas ciegas (se sortean)" },
];

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminLigasClub({ token, salir }) {
  const [ligas, setLigas] = useState([]);
  const [papelera, setPapelera] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [gestionandoId, setGestionandoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtro, setFiltro] = useState("activos");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [visibilidad, setVisibilidad] = useState("privado");
  const [modalidad, setModalidad] = useState("individual");
  const [vueltas, setVueltas] = useState(1);
  const [numeroParticipantes, setNumeroParticipantes] = useState(8);
  const [numeroGrupos, setNumeroGrupos] = useState("");
  const [metodoSorteoParejas, setMetodoSorteoParejas] = useState("AB");
  const [insigniaUrl, setInsigniaUrl] = useState("");
  const [afectaCalendario, setAfectaCalendario] = useState(true);
  const [notificaciones, setNotificaciones] = useState(true);
  const [imagenEliminadoUrl, setImagenEliminadoUrl] = useState("");
  const [imagenCampeonUrl, setImagenCampeonUrl] = useState("");
  const [imagenBienvenidaUrl, setImagenBienvenidaUrl] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarLigas = () => {
    fetch(`${API_URL}/api/ligas-club/todos`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLigas)
      .catch(() => {});
  };
  const cargarPapelera = () => {
    fetch(`${API_URL}/api/ligas-club/papelera`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPapelera)
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
    cargarLigas();
    cargarPapelera();
    cargarJugadores();
    cargarMaquinas();
  }, []);

  async function crearLiga(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/ligas-club`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({
          nombre, descripcion, fechaInicio, fechaFin, visibilidad, modalidad, vueltas, numeroParticipantes,
          numeroGrupos: numeroGrupos === "" ? undefined : Number(numeroGrupos),
          metodoSorteoParejas: modalidad === "parejas_ciegas" ? metodoSorteoParejas : undefined,
          insigniaUrl, afectaCalendario, notificaciones, imagenEliminadoUrl, imagenCampeonUrl, imagenBienvenidaUrl,
        }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear la liga." });
        return;
      }
      setNombre(""); setDescripcion(""); setFechaInicio(""); setFechaFin("");
      setVisibilidad("privado"); setModalidad("individual"); setVueltas(1);
      setNumeroParticipantes(8); setNumeroGrupos(""); setMetodoSorteoParejas("AB"); setInsigniaUrl("");
      setAfectaCalendario(true);
      setImagenEliminadoUrl(""); setImagenCampeonUrl(""); setImagenBienvenidaUrl("");
      setMensaje({ tipo: "ok", texto: "Liga creada." });
      setMostrarFormulario(false);
      cargarLigas();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarVisibilidad(liga, nueva) {
    await fetch(`${API_URL}/api/ligas-club/${liga.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...liga, visibilidad: nueva }),
    });
    cargarLigas();
  }
  async function cambiarFinalizado(liga, nuevo) {
    await fetch(`${API_URL}/api/ligas-club/${liga.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...liga, finalizado: nuevo }),
    });
    cargarLigas();
  }
  async function cambiarNotificaciones(liga, nuevo) {
    await fetch(`${API_URL}/api/ligas-club/${liga.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ ...liga, notificaciones: nuevo }),
    });
    cargarLigas();
  }
  async function borrarLiga(id) {
    if (!confirm("¿Enviar esta liga a la papelera? Se podrá restaurar durante 7 días; pasado ese plazo se borrará ya del todo, con sus participantes y calendario.")) return;
    await fetch(`${API_URL}/api/ligas-club/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (gestionandoId === id) setGestionandoId(null);
    cargarLigas();
    cargarPapelera();
  }

  async function restaurarLiga(id) {
    await fetch(`${API_URL}/api/ligas-club/${id}/restaurar`, { method: "POST", headers: { "x-admin-token": token } });
    cargarLigas();
    cargarPapelera();
  }

  async function borrarLigaDefinitiva(id) {
    if (!confirm("¿Borrar esta liga definitivamente? Esto no se puede deshacer.")) return;
    await fetch(`${API_URL}/api/ligas-club/${id}/definitivo`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarPapelera();
  }

  async function crearParticipante(ligaId, datos) {
    const res = await fetch(`${API_URL}/api/ligas-club/${ligaId}/participantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarLigas();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo añadir el participante.";
    }
    return null;
  }
  async function borrarParticipante(id) {
    await fetch(`${API_URL}/api/ligas-club/participantes/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargarLigas();
  }
  async function sortearParejasGrupos(ligaId, entradas) {
    const res = await fetch(`${API_URL}/api/ligas-club/${ligaId}/sortear-parejas-grupos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ entradas }),
    });
    cargarLigas();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo sortear las parejas.";
    }
    return null;
  }
  async function repartirGrupos(ligaId, datos) {
    const res = await fetch(`${API_URL}/api/ligas-club/${ligaId}/repartir-grupos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarLigas();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo repartir en grupos.";
    }
    return null;
  }
  async function generarCalendario(ligaId) {
    const res = await fetch(`${API_URL}/api/ligas-club/${ligaId}/generar-calendario`, {
      method: "POST",
      headers: { "x-admin-token": token },
    });
    cargarLigas();
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || "No se pudo generar el calendario.";
    }
    return null;
  }
  async function actualizarPartido(partidoId, datos) {
    await fetch(`${API_URL}/api/ligas-club/partidos/${partidoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarLigas();
  }
  
  async function programarCalendario(partidoId, datos) {
    await fetch(`${API_URL}/api/ligas-club/partidos/${partidoId}/calendario`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    cargarLigas();
  }

  const ligaEnGestion = ligas.find((l) => l.id === gestionandoId);
  const ligasFiltradas = ligas.filter((l) => (filtro === "terminadas" ? l.finalizado : !l.finalizado));

  if (ligaEnGestion) {
    return (
      <LigaGestion
        liga={ligaEnGestion}
        jugadores={jugadores}
        maquinas={maquinas}
        onVolver={() => setGestionandoId(null)}
        onCrearParticipante={(datos) => crearParticipante(ligaEnGestion.id, datos)}
        onBorrarParticipante={borrarParticipante}
        onSortearParejasGrupos={(entradas) => sortearParejasGrupos(ligaEnGestion.id, entradas)}
        onRepartirGrupos={(datos) => repartirGrupos(ligaEnGestion.id, datos)}
        onGenerarCalendario={() => generarCalendario(ligaEnGestion.id)}
        onActualizarPartido={actualizarPartido}
        onProgramarCalendario={programarCalendario}
        token={token}
        onRecargar={cargarLigas}
      />
    );
  }

  return (
    <section className="admin-form">
      <h2>Ligas del club</h2>
      <p className="admin-hint">
        Ligas todos-contra-todos, con calendario generado automáticamente. Marca "Público" para que aparezca en la
        web; "Privado" para que solo se vea desde el admin.
      </p>

      {!mostrarFormulario && (
        <button type="button" onClick={() => setMostrarFormulario(true)} style={{ marginBottom: "1.5rem" }}>
          ＋ Añadir liga
        </button>
      )}

      {mostrarFormulario && (
        <form onSubmit={crearLiga} className="admin-form" style={{ marginBottom: "1.5rem" }}>
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
            Cartel (opcional)
            <SelectorImagen
              token={token}
              valor={insigniaUrl}
              onCambiar={setInsigniaUrl}
              onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
              etiqueta="Cartel"
            />
          </label>
          <label>
            Número de participantes
            <input type="number" min="2" value={numeroParticipantes} onChange={(e) => setNumeroParticipantes(Number(e.target.value))} required />
          </label>
          <label>
            Grupos
            <select value={numeroGrupos} onChange={(e) => setNumeroGrupos(e.target.value)}>
              <option value="">Sin grupos (todos contra todos)</option>
              <option value="2">2 grupos</option>
              <option value="4">4 grupos</option>
              <option value="6">6 grupos</option>
              <option value="8">8 grupos</option>
            </select>
          </label>
          {numeroGrupos !== "" && (
            <p className="admin-hint">
              Cada grupo jugará su propia liguilla todos-contra-todos; después podrás crear un cuadrante final
              cruzando los grupos (1º de un grupo contra 2º del grupo cruzado, etc.). Reparte a los participantes en
              grupos desde la pestaña "Participantes" una vez estén todos apuntados.
            </p>
          )}
          <label>
            Enfrentamientos
            <select value={vueltas} onChange={(e) => setVueltas(Number(e.target.value))}>
              <option value={1}>Un enfrentamiento por rival (ida)</option>
              <option value={2}>Dos enfrentamientos por rival (ida y vuelta)</option>
            </select>
          </label>
          <label>
            Modalidad
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
              {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.etiqueta}</option>)}
            </select>
          </label>
          {modalidad === "parejas_ciegas" && (
            <label>
              Método de sorteo de parejas
              <select value={metodoSorteoParejas} onChange={(e) => setMetodoSorteoParejas(e.target.value)}>
                <option value="AB">Método AB (2 grupos)</option>
                <option value="ABC">Método ABC (3 grupos)</option>
                <option value="ABCD">Método ABCD (4 grupos)</option>
              </select>
            </label>
          )}
          <label>
            Visibilidad
            <select value={visibilidad} onChange={(e) => setVisibilidad(e.target.value)}>
              <option value="privado">Privado</option>
              <option value="publico">Público</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
            <input type="checkbox" checked={afectaCalendario} onChange={(e) => setAfectaCalendario(e.target.checked)} style={{ width: "auto" }} />
            Afecta al calendario general del club
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
            <input type="checkbox" checked={notificaciones} onChange={(e) => setNotificaciones(e.target.checked)} style={{ width: "auto" }} />
            Avisar a los socios de sus partidos de esta liga
          </label>
          <label>
            Imagen de aviso de bienvenida al sortear (opcional)
            <SelectorImagen
              token={token}
              valor={imagenBienvenidaUrl}
              onCambiar={setImagenBienvenidaUrl}
              onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
              etiqueta="Imagen de bienvenida"
            />
            <span className="admin-hint">
              Se manda a cada jugador nada más quedar colocado en el cuadrante final de esta liga (al hacer el
              sorteo), junto con un enlace a la página pública de la liga.
            </span>
          </label>
          <label>
            Imagen de aviso al eliminar a un jugador (opcional)
            <SelectorImagen
              token={token}
              valor={imagenEliminadoUrl}
              onCambiar={setImagenEliminadoUrl}
              onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
              etiqueta="Imagen de eliminado"
            />
            <span className="admin-hint">
              Se manda con el aviso al jugador que quede eliminado del cuadrante final de esta liga. Si no se elige
              ninguna, el aviso se manda igual, solo que sin imagen.
            </span>
          </label>
          <label>
            Imagen de aviso al campeón (opcional)
            <SelectorImagen
              token={token}
              valor={imagenCampeonUrl}
              onCambiar={setImagenCampeonUrl}
              onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
              etiqueta="Imagen de campeón"
            />
            <span className="admin-hint">
              Se manda con el aviso al ganador del cuadrante final de esta liga.
            </span>
          </label>
          <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
            <button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear liga"}</button>
            <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}

      {ligas.length === 0 && <p className="chronicle-status">Todavía no hay ligas del club.</p>}

      {(ligas.length > 0 || papelera.length > 0) && (
        <nav className="admin-tabs" style={{ marginBottom: "1rem" }}>
          <button
            type="button"
            className={`admin-tab ${filtro === "activos" ? "admin-tab-active" : ""}`}
            onClick={() => setFiltro("activos")}
          >
            En curso ({ligas.filter((l) => !l.finalizado).length})
          </button>
          <button
            type="button"
            className={`admin-tab ${filtro === "terminadas" ? "admin-tab-active" : ""}`}
            onClick={() => setFiltro("terminadas")}
          >
            Terminadas ({ligas.filter((l) => l.finalizado).length})
          </button>
          <button
            type="button"
            className={`admin-tab ${filtro === "papelera" ? "admin-tab-active" : ""}`}
            onClick={() => setFiltro("papelera")}
          >
            Papelera ({papelera.length})
          </button>
        </nav>
      )}

      {filtro === "papelera" ? (
        <>
          {papelera.length === 0 && <p className="chronicle-status">La papelera está vacía.</p>}
          <ul className="admin-torneos-club-list">
            {papelera.map((l) => (
              <li key={l.id} className="admin-list-item">
                <div>
                  <strong>{l.nombre}</strong>
                  <time>
                    {formatFecha(l.fechaInicio)} – {formatFecha(l.fechaFin)} ·{" "}
                    {l.diasRestantes === 0 ? "se purga hoy" : `se purga en ${l.diasRestantes} día${l.diasRestantes === 1 ? "" : "s"}`}
                  </time>
                </div>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  <button type="button" className="admin-link-btn" onClick={() => restaurarLiga(l.id)}>Restaurar</button>
                  <button type="button" className="admin-link-btn" onClick={() => borrarLigaDefinitiva(l.id)}>Borrar definitivamente</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {ligas.length > 0 && ligasFiltradas.length === 0 && (
            <p className="chronicle-status">
              {filtro === "terminadas" ? "Todavía no hay ligas terminadas." : "No hay ligas en curso — todas están marcadas como terminadas."}
            </p>
          )}

          <ul className="admin-torneos-club-list">
            {ligasFiltradas.map((l) => (
              <li key={l.id} className="admin-list-item">
                <div>
                  <strong>{l.nombre}</strong>
                  <time>
                    {formatFecha(l.fechaInicio)} – {formatFecha(l.fechaFin)} ·{" "}
                    {l.visibilidad === "publico" ? "Público" : "Privado"} ·{" "}
                    {MODALIDADES.find((m) => m.id === l.modalidad)?.etiqueta || "Individual"} ·{" "}
                    {l.vueltas === 2 ? "Ida y vuelta" : "Ida"} · {l.numeroParticipantes} participantes
                    {l.numeroGrupos ? ` · ${l.numeroGrupos} grupos` : ""}
                    {l.finalizado ? " · Finalizada" : ""}
                    {l.notificaciones === false ? " · Sin avisos" : ""}
                  </time>
                </div>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  <button type="button" className="admin-link-btn" onClick={() => cambiarVisibilidad(l, l.visibilidad === "publico" ? "privado" : "publico")}>
                    Hacer {l.visibilidad === "publico" ? "privado" : "público"}
                  </button>
                  <button type="button" className="admin-link-btn" onClick={() => cambiarFinalizado(l, !l.finalizado)}>
                    {l.finalizado ? "Reabrir" : "Marcar finalizada"}
                  </button>
                  <button type="button" className="admin-link-btn" onClick={() => cambiarNotificaciones(l, !l.notificaciones)}>
                    {l.notificaciones === false ? "Activar avisos" : "Desactivar avisos"}
                  </button>
                  <button type="button" className="admin-link-btn" onClick={() => setGestionandoId(l.id)}>Gestionar</button>
                  <button type="button" className="admin-link-btn" onClick={() => borrarLiga(l.id)}>Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function LigaGestion({ liga, jugadores, maquinas, onVolver, onCrearParticipante, onBorrarParticipante, onSortearParejasGrupos, onRepartirGrupos, onGenerarCalendario, onActualizarPartido, onProgramarCalendario, token, onRecargar }) {
  const [subpestana, setSubpestana] = useState("participantes");

  return (
    <section className="admin-form">
      <div className="admin-list-item" style={{ marginBottom: "1rem" }}>
        <div>
          <button type="button" className="admin-link-btn" onClick={onVolver}>← Volver a la lista</button>
          <h2 style={{ margin: ".4rem 0 0" }}>{liga.nombre}</h2>
          <span className="admin-hint">
            {MODALIDADES.find((m) => m.id === liga.modalidad)?.etiqueta || "Individual"} ·{" "}
            {liga.vueltas === 2 ? "Ida y vuelta" : "Ida"} · {liga.numeroParticipantes} participantes
            {liga.numeroGrupos ? ` · ${liga.numeroGrupos} grupos` : ""}
          </span>
        </div>
      </div>

      <nav className="admin-tabs" style={{ marginBottom: "1.2rem" }}>
        <button type="button" className={`admin-tab ${subpestana === "participantes" ? "admin-tab-active" : ""}`} onClick={() => setSubpestana("participantes")}>
          Participantes
        </button>
        <button type="button" className={`admin-tab ${subpestana === "calendario" ? "admin-tab-active" : ""}`} onClick={() => setSubpestana("calendario")}>
          Calendario
        </button>
        <button type="button" className={`admin-tab ${subpestana === "clasificacion" ? "admin-tab-active" : ""}`} onClick={() => setSubpestana("clasificacion")}>
          Clasificación
        </button>
        <button type="button" className={`admin-tab ${subpestana === "final" ? "admin-tab-active" : ""}`} onClick={() => setSubpestana("final")}>
          Cuadrante final
        </button>
      </nav>

      {subpestana === "participantes" && (
        <div>
          <JugadoresDelClubLiga jugadores={jugadores} />
          <ParticipantesPanelLiga
            liga={liga}
            jugadores={jugadores}
            onCrearParticipante={onCrearParticipante}
            onBorrarParticipante={onBorrarParticipante}
            onSortearParejasGrupos={onSortearParejasGrupos}
            onRepartirGrupos={onRepartirGrupos}
            onGenerarCalendario={onGenerarCalendario}
          />
        </div>
      )}

      {subpestana === "calendario" && <CalendarioLiga liga={liga} maquinas={maquinas} onActualizarPartido={onActualizarPartido} onProgramarCalendario={onProgramarCalendario} />}
      {subpestana === "clasificacion" && <ClasificacionLiga liga={liga} />}
      {subpestana === "final" && <CuadranteFinalLiga liga={liga} token={token} maquinas={maquinas} onRecargar={onRecargar} />}
    </section>
  );
}

function JugadoresDelClubLiga({ jugadores }) {
  const [abierto, setAbierto] = useState(false);
  const { socios, invitados } = agruparPorSocio(jugadores);
  return (
    <div className="admin-cuadrante-participantes">
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar" : "Ver"} jugadores del club ({jugadores.length})
      </button>
      {abierto && (
        <div style={{ marginTop: ".6rem" }}>
          {jugadores.length === 0 && <p className="chronicle-status">Todavía no hay nadie en el plantel del club.</p>}
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

function ParticipantesPanelLiga({ liga, jugadores, onCrearParticipante, onBorrarParticipante, onSortearParejasGrupos, onRepartirGrupos, onGenerarCalendario }) {
  const [nombreManual, setNombreManual] = useState("");
  const [poolManual, setPoolManual] = useState([]);
  const [parejaSel1, setParejaSel1] = useState("");
  const [parejaSel2, setParejaSel2] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorCalendario, setErrorCalendario] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  const participantes = liga.participantes || [];
  const esParejasCiegas = liga.modalidad === "parejas_ciegas";
  const esParejasHechas = liga.modalidad === "parejas_hechas";
  const esParejas = esParejasCiegas || esParejasHechas;
  const grupos = esParejasCiegas ? GRUPOS_POR_METODO[liga.metodoSorteoParejas] || [] : [];

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

  async function anadirIndividualDirecto(jugadorId) {
    setEnviando(true); setMensaje(null);
    const error = await onCrearParticipante({ jugador1Id: jugadorId });
    if (error) setMensaje({ tipo: "error", texto: error });
    setEnviando(false);
  }
  async function anadirManualDirecto(e) {
    e.preventDefault();
    if (!nombreManual.trim()) return;
    setEnviando(true); setMensaje(null);
    const error = await onCrearParticipante({ nombre: nombreManual.trim() });
    if (error) setMensaje({ tipo: "error", texto: error });
    else setNombreManual("");
    setEnviando(false);
  }

  async function formarPareja() {
    const e1 = poolManual.find((p) => p.key === parejaSel1);
    const e2 = poolManual.find((p) => p.key === parejaSel2);
    if (!e1 || !e2 || e1.key === e2.key) return;
    setEnviando(true); setMensaje(null);
    const datos = {};
    if (e1.jugadorId) datos.jugador1Id = e1.jugadorId; else datos.nombre1 = e1.nombre;
    if (e2.jugadorId) datos.jugador2Id = e2.jugadorId; else datos.nombre2 = e2.nombre;
    const error = await onCrearParticipante(datos);
    if (error) setMensaje({ tipo: "error", texto: error });
    else {
      setPoolManual((prev) => prev.filter((p) => p.key !== e1.key && p.key !== e2.key));
      setParejaSel1(""); setParejaSel2("");
    }
    setEnviando(false);
  }

  function conteoPorGrupo() {
    const c = {};
    for (const g of grupos) c[g] = poolManual.filter((p) => p.grupo === g).length;
    return c;
  }
  function errorGrupos() {
    if (!liga.metodoSorteoParejas) return "Esta liga no tiene definido un método de sorteo.";
    const c = conteoPorGrupo();
    const metodo = liga.metodoSorteoParejas;
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
    setEnviando(true); setMensaje(null);
    const entradas = poolManual.map((p) => ({
      jugadorId: p.jugadorId || undefined,
      nombre: p.jugadorId ? undefined : p.nombre,
      grupo: p.grupo,
    }));
    const error = await onSortearParejasGrupos(entradas);
    if (error) setMensaje({ tipo: "error", texto: error });
    else { setPoolManual([]); setMensaje({ tipo: "ok", texto: "Parejas sorteadas." }); }
    setEnviando(false);
  }

  async function generar() {
    setGenerando(true);
    setErrorCalendario(null);
    const error = await onGenerarCalendario();
    if (error) setErrorCalendario(error);
    setGenerando(false);
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
                      <button key={j.id} type="button" className="admin-link-btn" onClick={() => anadirAlPool(j.id, j.nombre)}>＋ {j.nombre}</button>
                    ))}
                  </div>
                </>
              )}
              {disponiblesAgrupados.invitados.length > 0 && (
                <>
                  <p className="admin-hint" style={{ fontSize: ".8em", margin: ".3rem 0 0" }}>Invitados</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                    {disponiblesAgrupados.invitados.map((j) => (
                      <button key={j.id} type="button" className="admin-link-btn" onClick={() => anadirAlPool(j.id, j.nombre)}>＋ {j.nombre}</button>
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
                {poolManual.filter((p) => p.key !== parejaSel2).map((p) => <option key={p.key} value={p.key}>{p.nombre}</option>)}
              </select>
            </label>
            <label>
              Jugador 2
              <select value={parejaSel2} onChange={(e) => setParejaSel2(e.target.value)}>
                <option value="">Elige…</option>
                {poolManual.filter((p) => p.key !== parejaSel1).map((p) => <option key={p.key} value={p.key}>{p.nombre}</option>)}
              </select>
            </label>
            <button type="button" disabled={enviando || !parejaSel1 || !parejaSel2} onClick={formarPareja}>Formar pareja</button>
          </div>
        </div>
      )}

      {esParejasCiegas && (
        <div style={{ marginTop: "1rem" }}>
          <h5>Sorteo por niveles ({liga.metodoSorteoParejas || "sin método"})</h5>
          {grupos.length > 0 && <p className="admin-hint">{grupos.map((g) => `${g}: ${conteoPorGrupo()[g] || 0}`).join(" · ")}</p>}
          {errorGruposActual && <p className="admin-msg admin-msg-error">{errorGruposActual}</p>}
          <button type="button" disabled={enviando || poolManual.length < 2 || !!errorGruposActual} onClick={sortearPorGrupos}>
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
                    <button type="button" className="admin-link-btn" disabled={enviando} onClick={() => anadirIndividualDirecto(j.id)}>＋ Añadir</button>
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
                    <button type="button" className="admin-link-btn" disabled={enviando} onClick={() => anadirIndividualDirecto(j.id)}>＋ Añadir</button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <h5 style={{ marginTop: "1.2rem" }}>Participantes ({participantes.length} / {liga.numeroParticipantes})</h5>
      {participantes.length === 0 && <p className="chronicle-status">Nadie apuntado todavía.</p>}
      <ul>
        {participantes.map((p) => (
          <li key={p.id} className="admin-list-item">
            <span>{p.etiqueta}{liga.numeroGrupos ? ` — ${p.grupo ? `Grupo ${p.grupo}` : "sin grupo"}` : ""}</span>
            <button type="button" className="admin-link-btn" onClick={() => onBorrarParticipante(p.id)}>Quitar</button>
          </li>
        ))}
      </ul>

      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {liga.numeroGrupos && participantes.length > 0 && (
        <RepartoGruposLiga liga={liga} participantes={participantes} onRepartirGrupos={onRepartirGrupos} />
      )}

      <div style={{ marginTop: "1.2rem" }}>
        <button type="button" disabled={generando || participantes.length !== liga.numeroParticipantes} onClick={generar}>
          {generando ? "Generando…" : `Generar calendario (${participantes.length} / ${liga.numeroParticipantes} apuntados)`}
        </button>
        {errorCalendario && <p className="admin-msg admin-msg-error">{errorCalendario}</p>}
      </div>
    </div>
  );
}

// Reparto de participantes ya apuntados en los `liga.numeroGrupos` grupos de
// la liga (A, B, C…) — no confundir con el sorteo de parejas por nivel de
// arriba, que reparte en grupos transitorios solo para formar las parejas
// antes de que existan como participante. Aquí los participantes YA
// existen; lo que se reparte es en qué liguilla (grupo) juega cada uno.
function RepartoGruposLiga({ liga, participantes, onRepartirGrupos }) {
  const letras = Array.from({ length: liga.numeroGrupos }, (_, i) => String.fromCharCode(65 + i));
  const [asignaciones, setAsignaciones] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function grupoDe(p) {
    return asignaciones[p.id] ?? p.grupo ?? "";
  }
  function cambiarGrupo(id, grupo) {
    setAsignaciones((prev) => ({ ...prev, [id]: grupo }));
  }

  const conteo = {};
  for (const g of letras) conteo[g] = participantes.filter((p) => grupoDe(p) === g).length;
  const sinAsignar = participantes.filter((p) => !grupoDe(p)).length;

  async function auto() {
    setEnviando(true); setMensaje(null);
    const error = await onRepartirGrupos({ modo: "auto" });
    if (error) setMensaje({ tipo: "error", texto: error });
    else { setAsignaciones({}); setMensaje({ tipo: "ok", texto: "Grupos repartidos automáticamente." }); }
    setEnviando(false);
  }
  async function guardarManual() {
    setEnviando(true); setMensaje(null);
    const asignacionesCompletas = participantes.map((p) => ({ participanteId: p.id, grupo: grupoDe(p) }));
    const error = await onRepartirGrupos({ modo: "manual", asignaciones: asignacionesCompletas });
    if (error) setMensaje({ tipo: "error", texto: error });
    else { setAsignaciones({}); setMensaje({ tipo: "ok", texto: "Grupos guardados." }); }
    setEnviando(false);
  }

  return (
    <div className="admin-cuadrante-participantes" style={{ marginTop: "1.2rem" }}>
      <h5>Reparto en grupos ({letras.join(", ")})</h5>
      <p className="admin-hint">{letras.map((g) => `${g}: ${conteo[g]}`).join(" · ")}{sinAsignar > 0 ? ` · sin asignar: ${sinAsignar}` : ""}</p>
      <button type="button" disabled={enviando} onClick={auto} style={{ marginBottom: ".8rem" }}>
        Repartir automáticamente (al azar, equilibrado)
      </button>
      <ul>
        {participantes.map((p) => (
          <li key={p.id} className="admin-list-item">
            <span>{p.etiqueta}</span>
            <select value={grupoDe(p)} onChange={(e) => cambiarGrupo(p.id, e.target.value)}>
              <option value="">Sin grupo</option>
              {letras.map((g) => <option key={g} value={g}>Grupo {g}</option>)}
            </select>
          </li>
        ))}
      </ul>
      <button type="button" disabled={enviando || sinAsignar > 0} onClick={guardarManual}>
        Guardar reparto manual
      </button>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </div>
  );
}

function CalendarioLiga({ liga, maquinas, onActualizarPartido, onProgramarCalendario }) {
  const partidos = liga.partidos || [];

  if (partidos.length === 0) {
    return <p className="chronicle-status">Todavía no hay calendario — apunta a todos los participantes y pulsa "Generar calendario" en la pestaña Participantes.</p>;
  }

  if (!liga.numeroGrupos) {
    return <CalendarioLigaGrupo partidos={partidos} maquinas={maquinas} onActualizarPartido={onActualizarPartido} onProgramarCalendario={onProgramarCalendario} />;
  }

  const letras = Array.from({ length: liga.numeroGrupos }, (_, i) => String.fromCharCode(65 + i));
  return (
    <div>
      {letras.map((g) => {
        const partidosGrupo = partidos.filter((p) => p.grupo === g);
        if (partidosGrupo.length === 0) return null;
        return (
          <div key={g} style={{ marginBottom: "1.5rem" }}>
            <h3>Grupo {g}</h3>
            <CalendarioLigaGrupo partidos={partidosGrupo} maquinas={maquinas} onActualizarPartido={onActualizarPartido} onProgramarCalendario={onProgramarCalendario} />
          </div>
        );
      })}
    </div>
  );
}

function CalendarioLigaGrupo({ partidos, maquinas, onActualizarPartido, onProgramarCalendario }) {
  const porJornada = {};
  for (const p of partidos) {
    if (!porJornada[p.jornada]) porJornada[p.jornada] = [];
    porJornada[p.jornada].push(p);
  }
  const jornadas = Object.keys(porJornada).map(Number).sort((a, b) => a - b);

  return (
    <div>
      {jornadas.map((j) => (
        <div key={j} className="admin-cuadro-maquina">
          <h4>Jornada {j}</h4>
          {porJornada[j].sort((a, b) => a.posicion - b.posicion).map((p) => (
            <PartidoLigaRow
              key={p.id}
              p={p}
              maquinas={maquinas}
              onActualizar={(datos) => onActualizarPartido(p.id, datos)}
              onProgramar={(datos) => onProgramarCalendario(p.id, datos)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function PartidoLigaRow({ p, maquinas, onActualizar, onProgramar }) {
  return (
    <div className={`admin-cuadro-partido ${p.enCurso ? "admin-cuadro-en-curso" : ""}`}>
      <span style={{ minWidth: "140px" }}>{p.participante1}</span>
      <button
        type="button"
        className={`admin-link-btn ${p.ganador === p.participante1 ? "admin-ganador-activo" : ""}`}
        onClick={() => onActualizar({ ganador: p.participante1 })}
      >
        Ganó
      </button>
      <span>vs</span>
      <span style={{ minWidth: "140px" }}>{p.participante2}</span>
      <button
        type="button"
        className={`admin-link-btn ${p.ganador === p.participante2 ? "admin-ganador-activo" : ""}`}
        onClick={() => onActualizar({ ganador: p.participante2 })}
      >
        Ganó
      </button>
      <input
        defaultValue={p.resultado || ""}
        placeholder="Resultado"
        className="admin-cuadro-resultado"
        onBlur={(e) => e.target.value !== (p.resultado || "") && onActualizar({ resultado: e.target.value })}
      />
      <input
        defaultValue={p.maquina || ""}
        placeholder="Máquina"
        className="admin-cuadro-maquina-input"
        onBlur={(e) => e.target.value !== (p.maquina || "") && onActualizar({ maquina: e.target.value })}
      />
      <button type="button" className="admin-link-btn" onClick={() => onActualizar({ enCurso: !p.enCurso })}>
        {p.enCurso ? "★ En curso" : "Marcar en curso"}
      </button>
      <CalendarioPartido p={p} maquinas={maquinas} onProgramar={onProgramar} />
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

// Trae la clasificación calculada por el backend (con la cascada de
// desempate de lib/clasificacionLiga.js) — ver GET
// /api/ligas-club/:id/clasificacion. Devuelve { grupos: {A:[...],...},
// sinGrupo: [...] | null } o null mientras carga.
function useClasificacion(liga) {
  const [clasificacion, setClasificacion] = useState(null);
  useEffect(() => {
    let vivo = true;
    fetch(`${API_URL}/api/ligas-club/${liga.id}/clasificacion`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (vivo) setClasificacion(data); })
      .catch(() => {});
    return () => { vivo = false; };
  }, [liga.id, liga.partidos?.length, liga.participantes?.length]);
  return clasificacion;
}

function TablaClasificacion({ filas }) {
  if (!filas || filas.length === 0) return <p className="chronicle-status">Todavía no hay participantes.</p>;
  return (
    <table className="admin-tabla-clasificacion">
      <thead>
        <tr>
          <th>#</th>
          <th>Participante</th>
          <th>PJ</th>
          <th>V</th>
          <th>E</th>
          <th>D</th>
          <th>Partidas +</th>
          <th>Partidas −</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((f, i) => (
          <tr key={f.nombre}>
            <td>{i + 1}</td>
            <td>{f.nombre}{f.empateSinResolver && <span title="Empate sin desempate objetivo posible — orden alfabético solo para que sea reproducible."> ⚠︎</span>}</td>
            <td>{f.jugados}</td>
            <td>{f.victorias}</td>
            <td>{f.empates}</td>
            <td>{f.derrotas}</td>
            <td>{f.partidasGanadas}</td>
            <td>{f.partidasPerdidas}</td>
            <td><strong>{f.puntos}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClasificacionLiga({ liga }) {
  const clasificacion = useClasificacion(liga);
  if (!clasificacion) return <p className="chronicle-status">Cargando…</p>;

  if (!liga.numeroGrupos) {
    return <TablaClasificacion filas={clasificacion.sinGrupo} />;
  }

  const letras = Array.from({ length: liga.numeroGrupos }, (_, i) => String.fromCharCode(65 + i));
  return (
    <div>
      {letras.map((g) => (
        <div key={g} style={{ marginBottom: "1.5rem" }}>
          <h3>Grupo {g}</h3>
          <TablaClasificacion filas={clasificacion.grupos[g]} />
        </div>
      ))}
      <p className="admin-hint">⚠︎ = empate que ningún criterio objetivo pudo resolver (puntos, enfrentamiento directo y partidas ganadas totales iguales); el orden mostrado es solo alfabético, para que al menos sea siempre el mismo.</p>
    </div>
  );
}
function siguienteTamanoValido(n) {
  const tamanos = [4, 8, 16, 32, 64, 128];
  return tamanos.find((t) => t >= n) || 128;
}

function CuadranteFinalLiga({ liga, token, maquinas, onRecargar }) {
  const cuadrante = (liga.cuadrantes || [])[0];
  const clasificacion = useClasificacion(liga);
  const conGrupos = !!liga.numeroGrupos;

  const [numClasificados, setNumClasificados] = useState(4);
  const [numClasificadosPorGrupo, setNumClasificadosPorGrupo] = useState(2);
  const [emparejamiento, setEmparejamiento] = useState("posiciones");
  const [tipoEliminacion, setTipoEliminacion] = useState("directa");
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(true);

  // Ungrouped: cuántos clasifican en total, sacados de una única
  // clasificación (comportamiento de siempre).
  async function crearCuadranteFinalSinGrupos() {
    const topN = (clasificacion.sinGrupo || []).slice(0, numClasificados).map((f) => f.nombre);
    if (topN.length < 2) {
      setError("Hacen falta al menos 2 participantes con clasificación.");
      return;
    }
    const tamano = siguienteTamanoValido(topN.length);

    const resCuadrante = await fetch(`${API_URL}/api/ligas-club/${liga.id}/cuadrante-final`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ nombre: "Cuadrante final", tamano, tipoEliminacion }),
    });
    if (!resCuadrante.ok) {
      const data = await resCuadrante.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el cuadrante.");
      return;
    }
    const nuevoCuadrante = await resCuadrante.json();

    const resSorteo = await fetch(`${API_URL}/api/torneos-club/cuadrantes/${nuevoCuadrante.id}/sorteo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({
        participantes: topN,
        cabezasDeSerie: emparejamiento === "posiciones" ? topN : [],
      }),
    });
    if (!resSorteo.ok) {
      const data = await resSorteo.json().catch(() => ({}));
      setError(data.error || "El cuadrante se creó pero no se pudo sortear.");
    }
  }

  // Con grupos: cuántos clasifican DE CADA grupo — el backend cruza los
  // grupos "de fuera hacia dentro" (A-D, B-C…) y reparte los bye si el
  // total no llena una potencia de dos. Ver lib/cruceGruposFinal.js.
  async function crearCuadranteFinalConGrupos() {
    const res = await fetch(`${API_URL}/api/ligas-club/${liga.id}/cuadrante-final-grupos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify({ nombre: "Cuadrante final", tipoEliminacion, numClasificadosPorGrupo }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el cuadrante.");
    }
  }

  async function crearCuadranteFinal(e) {
    e.preventDefault();
    setCreando(true);
    setError(null);
    try {
      if (conGrupos) await crearCuadranteFinalConGrupos();
      else await crearCuadranteFinalSinGrupos();
      onRecargar();
    } finally {
      setCreando(false);
    }
  }

  async function reiniciarCuadrante() {
    if (!confirm("¿Vaciar todos los resultados del cuadrante final?")) return;
    await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadrante.id}/reiniciar`, {
      method: "POST",
      headers: { "x-admin-token": token },
    });
    onRecargar();
  }
  async function borrarCuadrante() {
    if (!confirm("¿Borrar el cuadrante final? Podrás volver a crearlo desde la clasificación.")) return;
    await fetch(`${API_URL}/api/torneos-club/cuadrantes/${cuadrante.id}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    onRecargar();
  }
  async function actualizarPartidoFinal(partidoId, datos) {
    await fetch(`${API_URL}/api/torneos-club/partidos/${partidoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    onRecargar();
  }
  async function programarCalendarioFinal(partidoId, datos) {
    await fetch(`${API_URL}/api/torneos-club/partidos/${partidoId}/calendario`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-admin-token": token },
      body: JSON.stringify(datos),
    });
    onRecargar();
  }

  if (!clasificacion) {
    return <p className="chronicle-status">Cargando…</p>;
  }

  if (!cuadrante) {
    const totalSinGrupo = (clasificacion.sinGrupo || []).length;
    const grupoConMenos = conGrupos
      ? Math.min(...Array.from({ length: liga.numeroGrupos }, (_, i) => String.fromCharCode(65 + i)).map((g) => (clasificacion.grupos[g] || []).length))
      : null;
    return (
      <div className="admin-cuadrante-participantes">
        <p className="admin-hint">
          {conGrupos
            ? "Se genera cruzando los grupos (1º de un grupo contra el último clasificado del grupo cruzado, etc.). Elige cuántos clasifican de cada grupo."
            : "Se genera a partir de la clasificación actual. Elige cuántos clasifican y cómo se emparejan."}
        </p>
        <form onSubmit={crearCuadranteFinal} className="admin-form">
          {conGrupos ? (
            <label>
              Cuántos clasifican de cada grupo
              <input
                type="number"
                min="1"
                max={grupoConMenos || 1}
                value={numClasificadosPorGrupo}
                onChange={(e) => setNumClasificadosPorGrupo(Number(e.target.value))}
              />
            </label>
          ) : (
            <>
              <label>
                Cuántos participantes clasifican
                <input
                  type="number"
                  min="2"
                  max={totalSinGrupo}
                  value={numClasificados}
                  onChange={(e) => setNumClasificados(Number(e.target.value))}
                />
              </label>
              <label>
                Emparejamiento
                <select value={emparejamiento} onChange={(e) => setEmparejamiento(e.target.value)}>
                  <option value="posiciones">Respetar posiciones (1º vs último, 2º vs penúltimo…)</option>
                  <option value="sorteo">Sortear al azar</option>
                </select>
              </label>
            </>
          )}
          <label>
            Tipo de eliminación
            <select value={tipoEliminacion} onChange={(e) => setTipoEliminacion(e.target.value)}>
              <option value="directa">Eliminación directa</option>
              <option value="doble">Doble eliminación</option>
            </select>
          </label>
          <button type="submit" disabled={creando || (conGrupos ? grupoConMenos < 1 : totalSinGrupo < 2)}>
            {creando ? "Creando…" : "Crear cuadrante final"}
          </button>
          {error && <p className="admin-msg admin-msg-error">{error}</p>}
        </form>
      </div>
    );
  }

  const porRama = {};
  for (const p of cuadrante.partidos) {
    if (!porRama[p.rama]) porRama[p.rama] = {};
    if (!porRama[p.rama][p.ronda]) porRama[p.rama][p.ronda] = [];
    porRama[p.rama][p.ronda].push(p);
  }
  const RAMA_ETIQUETA = { ganadores: "Cuadro de ganadores", perdedores: "Cuadro de perdedores", final: "Gran final" };
  const ramas = ["ganadores", "perdedores", "final"].filter((r) => porRama[r]);

  return (
    <div className="admin-cuadrante">
      <div className="admin-cuadrante-header">
        <h4>{cuadrante.nombre} — {cuadrante.tamano} participantes ({cuadrante.tipoEliminacion === "doble" ? "doble elim." : "elim. directa"})</h4>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>{abierto ? "Ocultar" : "Ver enfrentamientos"}</button>
          <button type="button" className="admin-link-btn" onClick={reiniciarCuadrante}>Vaciar resultados</button>
          <button type="button" className="admin-link-btn" onClick={borrarCuadrante}>Borrar cuadrante</button>
        </div>
      </div>

      {abierto && (
        <input
          type="text"
          className="admin-busqueda"
          placeholder="Buscar participante…"
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
              {porRama[rama][ronda].sort((a, b) => a.posicion - b.posicion).map((p) => (
                <PartidoFinalRow
                  key={p.id}
                  p={p}
                  maquinas={maquinas}
                  onActualizar={(datos) => actualizarPartidoFinal(p.id, datos)}
                  onProgramar={(datos) => programarCalendarioFinal(p.id, datos)}
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

function PartidoFinalRow({ p, maquinas, onActualizar, onProgramar, busqueda }) {
  const coincide = (nombre) => !!nombre && !!busqueda && nombre.toLowerCase().includes(busqueda.toLowerCase());
  const encontrado = coincide(p.jugador1) || coincide(p.jugador2);
  return (
    <div className={`admin-cuadro-partido ${p.enCurso ? "admin-cuadro-en-curso" : ""} ${encontrado ? "admin-cuadro-encontrado" : ""}`}>
      <span style={{ minWidth: "140px" }}>{p.jugador1 || "—"}</span>
      <button
        type="button"
        className={`admin-link-btn ${p.ganador && p.ganador === p.jugador1 ? "admin-ganador-activo" : ""}`}
        disabled={!p.jugador1 || !p.jugador2}
        onClick={() => onActualizar({ ganador: p.jugador1 })}
      >
        Ganó
      </button>
      <span>vs</span>
      <span style={{ minWidth: "140px" }}>{p.jugador2 || "—"}</span>
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
      <button type="button" className="admin-link-btn" onClick={() => onActualizar({ enCurso: !p.enCurso })}>
        {p.enCurso ? "★ En curso" : "Marcar en curso"}
      </button>
      {p.jugador1 && p.jugador2 && <CalendarioPartido p={p} maquinas={maquinas} onProgramar={onProgramar} />}
    </div>
  );
}
