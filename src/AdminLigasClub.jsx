import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

const MODALIDADES = [
  { id: "individual", etiqueta: "Individual" },
  { id: "parejas_hechas", etiqueta: "Parejas ya formadas" },
  { id: "parejas_ciegas", etiqueta: "Parejas ciegas (se sortean)" },
];

const GRUPOS_POR_METODO = { AB: ["A", "B"], ABC: ["A", "B", "C"], ABCD: ["A", "B", "C", "D"] };

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminLigasClub({ token, salir }) {
  const [ligas, setLigas] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [gestionandoId, setGestionandoId] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [visibilidad, setVisibilidad] = useState("privado");
  const [modalidad, setModalidad] = useState("individual");
  const [vueltas, setVueltas] = useState(1);
  const [numeroParticipantes, setNumeroParticipantes] = useState(8);
  const [metodoSorteoParejas, setMetodoSorteoParejas] = useState("AB");
  const [insigniaUrl, setInsigniaUrl] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarLigas = () => {
    fetch(`${API_URL}/api/ligas-club/todos`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLigas)
      .catch(() => {});
  };
  const cargarJugadores = () => {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {});
  };

  useEffect(() => {
    cargarLigas();
    cargarJugadores();
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
          metodoSorteoParejas: modalidad === "parejas_ciegas" ? metodoSorteoParejas : undefined,
          insigniaUrl,
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
      setNumeroParticipantes(8); setMetodoSorteoParejas("AB"); setInsigniaUrl("");
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
  async function borrarLiga(id) {
    if (!confirm("¿Borrar esta liga, sus participantes y todo su calendario?")) return;
    await fetch(`${API_URL}/api/ligas-club/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (gestionandoId === id) setGestionandoId(null);
    cargarLigas();
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

  const ligaEnGestion = ligas.find((l) => l.id === gestionandoId);

  if (ligaEnGestion) {
    return (
      <LigaGestion
        liga={ligaEnGestion}
        jugadores={jugadores}
        onVolver={() => setGestionandoId(null)}
        onCrearParticipante={(datos) => crearParticipante(ligaEnGestion.id, datos)}
        onBorrarParticipante={borrarParticipante}
        onSortearParejasGrupos={(entradas) => sortearParejasGrupos(ligaEnGestion.id, entradas)}
        onGenerarCalendario={() => generarCalendario(ligaEnGestion.id)}
        onActualizarPartido={actualizarPartido}
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
          <div style={{ display: "flex", gap: ".6rem", alignItems: "center" }}>
            <button type="submit" disabled={guardando}>{guardando ? "Creando…" : "Crear liga"}</button>
            <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>Cancelar</button>
          </div>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}

      {ligas.length === 0 && <p className="chronicle-status">Todavía no hay ligas del club.</p>}

      <ul className="admin-torneos-club-list">
        {ligas.map((l) => (
          <li key={l.id} className="admin-list-item">
            <div>
              <strong>{l.nombre}</strong>
              <time>
                {formatFecha(l.fechaInicio)} – {formatFecha(l.fechaFin)} ·{" "}
                {l.visibilidad === "publico" ? "Público" : "Privado"} ·{" "}
                {MODALIDADES.find((m) => m.id === l.modalidad)?.etiqueta || "Individual"} ·{" "}
                {l.vueltas === 2 ? "Ida y vuelta" : "Ida"} · {l.numeroParticipantes} participantes
                {l.finalizado ? " · Finalizada" : ""}
              </time>
            </div>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              <button type="button" className="admin-link-btn" onClick={() => cambiarVisibilidad(l, l.visibilidad === "publico" ? "privado" : "publico")}>
                Hacer {l.visibilidad === "publico" ? "privado" : "público"}
              </button>
              <button type="button" className="admin-link-btn" onClick={() => cambiarFinalizado(l, !l.finalizado)}>
                {l.finalizado ? "Reabrir" : "Marcar finalizada"}
              </button>
              <button type="button" className="admin-link-btn" onClick={() => setGestionandoId(l.id)}>Gestionar</button>
              <button type="button" className="admin-link-btn" onClick={() => borrarLiga(l.id)}>Borrar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LigaGestion({ liga, jugadores, onVolver, onCrearParticipante, onBorrarParticipante, onSortearParejasGrupos, onGenerarCalendario, onActualizarPartido }) {
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
            onGenerarCalendario={onGenerarCalendario}
          />
        </div>
      )}

      {subpestana === "calendario" && <CalendarioLiga liga={liga} onActualizarPartido={onActualizarPartido} />}
      {subpestana === "clasificacion" && <ClasificacionLiga liga={liga} />}
    </section>
  );
}

function JugadoresDelClubLiga({ jugadores }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="admin-cuadrante-participantes">
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar" : "Ver"} jugadores del club ({jugadores.length})
      </button>
      {abierto && (
        <ul style={{ marginTop: ".6rem" }}>
          {jugadores.map((j) => (
            <li key={j.id} className="admin-list-item">
              <span>{j.nombre}{j.apodo ? ` — "${j.apodo}"` : ""}</span>
            </li>
          ))}
          {jugadores.length === 0 && <p className="chronicle-status">Todavía no hay nadie en el plantel del club.</p>}
        </ul>
      )}
    </div>
  );
}

function ParticipantesPanelLiga({ liga, jugadores, onCrearParticipante, onBorrarParticipante, onSortearParejasGrupos, onGenerarCalendario }) {
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                {disponiblesClub.map((j) => (
                  <button key={j.id} type="button" className="admin-link-btn" onClick={() => anadirAlPool(j.id, j.nombre)}>＋ {j.nombre}</button>
                ))}
              </div>
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
          {disponiblesClub.length > 0 && (
            <ul>
              {disponiblesClub.map((j) => (
                <li key={j.id} className="admin-list-item">
                  <span>{j.nombre}</span>
                  <button type="button" className="admin-link-btn" disabled={enviando} onClick={() => anadirIndividualDirecto(j.id)}>＋ Añadir</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h5 style={{ marginTop: "1.2rem" }}>Participantes ({participantes.length} / {liga.numeroParticipantes})</h5>
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
        <button type="button" disabled={generando || participantes.length !== liga.numeroParticipantes} onClick={generar}>
          {generando ? "Generando…" : `Generar calendario (${participantes.length} / ${liga.numeroParticipantes} apuntados)`}
        </button>
        {errorCalendario && <p className="admin-msg admin-msg-error">{errorCalendario}</p>}
      </div>
    </div>
  );
}

function CalendarioLiga({ liga, onActualizarPartido }) {
  const partidos = liga.partidos || [];
  const porJornada = {};
  for (const p of partidos) {
    if (!porJornada[p.jornada]) porJornada[p.jornada] = [];
    porJornada[p.jornada].push(p);
  }
  const jornadas = Object.keys(porJornada).map(Number).sort((a, b) => a - b);

  if (jornadas.length === 0) {
    return <p className="chronicle-status">Todavía no hay calendario — apunta a todos los participantes y pulsa "Generar calendario" en la pestaña Participantes.</p>;
  }

  return (
    <div>
      {jornadas.map((j) => (
        <div key={j} className="admin-cuadro-maquina">
          <h4>Jornada {j}</h4>
          {porJornada[j].sort((a, b) => a.posicion - b.posicion).map((p) => (
            <PartidoLigaRow key={p.id} p={p} onActualizar={(datos) => onActualizarPartido(p.id, datos)} />
          ))}
        </div>
      ))}
    </div>
  );
}

function PartidoLigaRow({ p, onActualizar }) {
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
    </div>
  );
}

function calcularClasificacion(liga) {
  const stats = {};
  function fila(nombre) {
    if (!stats[nombre]) {
      stats[nombre] = { nombre, jugados: 0, victorias: 0, empates: 0, derrotas: 0, partidasGanadas: 0, partidasPerdidas: 0, puntos: 0 };
    }
    return stats[nombre];
  }
  for (const p of liga.participantes || []) fila(p.etiqueta);

  function parseResultado(resultado) {
    if (!resultado) return null;
    const m = resultado.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2])];
  }

  for (const p of liga.partidos || []) {
    const numeros = parseResultado(p.resultado);
    if (numeros) {
      const [a, b] = numeros;
      const f1 = fila(p.participante1);
      const f2 = fila(p.participante2);
      f1.jugados++; f2.jugados++;
      f1.partidasGanadas += a; f1.partidasPerdidas += b;
      f2.partidasGanadas += b; f2.partidasPerdidas += a;
      if (a > b) { f1.victorias++; f1.puntos += 2; f2.derrotas++; }
      else if (a < b) { f2.victorias++; f2.puntos += 2; f1.derrotas++; }
      else { f1.empates++; f2.empates++; f1.puntos += 1; f2.puntos += 1; }
    } else if (p.ganador) {
      const perdedor = p.ganador === p.participante1 ? p.participante2 : p.participante1;
      const fg = fila(p.ganador);
      const fp = fila(perdedor);
      fg.jugados++; fp.jugados++;
      fg.victorias++; fg.puntos += 2;
      fp.derrotas++;
    }
  }

  return Object.values(stats).sort(
    (x, y) => y.puntos - x.puntos || (y.partidasGanadas - y.partidasPerdidas) - (x.partidasGanadas - x.partidasPerdidas)
  );
}

function ClasificacionLiga({ liga }) {
  const filas = calcularClasificacion(liga);
  if (filas.length === 0) return <p className="chronicle-status">Todavía no hay participantes.</p>;
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
            <td>{f.nombre}</td>
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
