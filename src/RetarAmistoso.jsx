import { useEffect, useState } from "react";

// "Retar a un amistoso" (plan "partido-amistoso-remoto", guardado en el
// proyecto): un socio, desde la Zona de miembros, reta a otro jugador del
// club (miembro o amigo) a un partido fuera de torneo/liga, jugable en
// remoto (cada uno desde su propio móvil, entrando por PIN en /partidas).
// Sin i18n a propósito, igual que JuegoHerramienta.jsx (todo el flujo de la
// herramienta de marcador es solo en castellano).

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

const ORIGEN = typeof window !== "undefined" ? window.location.origin : "";

export default function RetarAmistoso() {
  const [jugadores, setJugadores] = useState([]);
  const [rivalJugadorId, setRivalJugadorId] = useState("");
  const [amigoNuevo, setAmigoNuevo] = useState("");
  const [juego, setJuego] = useState("501");
  const [alMejorDe, setAlMejorDe] = useState(3);
  const [apertura, setApertura] = useState("simple");
  const [cierre, setCierre] = useState("doble");
  const [modoCricket, setModoCricket] = useState("normal");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [creado, setCreado] = useState(null);

  // Lista de "Tus amistosos" (pedido de Iraitz, 2026-09-17: poder borrar
  // amistosos, típicamente pruebas o retos que ya no interesan). Se recarga
  // sola al crear uno nuevo y al borrar uno de la lista.
  const [misAmistosos, setMisAmistosos] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [borrandoId, setBorrandoId] = useState("");

  function cargarMisAmistosos() {
    const token = localStorage.getItem("socioToken");
    setCargandoLista(true);
    fetch(`${API_URL}/api/partidas-herramienta/mis-amistosos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => setMisAmistosos(lista))
      .catch(() => {})
      .finally(() => setCargandoLista(false));
  }

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/jugadores/directorio`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista) => setJugadores(lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre))))
      .catch(() => {});
    cargarMisAmistosos();
  }, []);

  async function borrar(id) {
    if (!window.confirm("¿Borrar este amistoso? No se puede deshacer.")) return;
    setBorrandoId(id);
    try {
      const token = localStorage.getItem("socioToken");
      const resp = await fetch(`${API_URL}/api/partidas-herramienta/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok && resp.status !== 204) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "No se ha podido borrar el amistoso.");
      }
      setMisAmistosos((lista) => lista.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message || "No se ha podido borrar el amistoso.");
    } finally {
      setBorrandoId("");
    }
  }

  async function crear(e) {
    e.preventDefault();
    setError("");
    if (!rivalJugadorId && !amigoNuevo.trim()) {
      setError("Elige un rival de la lista, o escribe el nombre de un amigo nuevo.");
      return;
    }
    setEnviando(true);
    try {
      const token = localStorage.getItem("socioToken");
      const resp = await fetch(`${API_URL}/api/partidas-herramienta/amistosa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          rivalJugadorId: amigoNuevo.trim() ? undefined : rivalJugadorId,
          rivalNombreNuevo: amigoNuevo.trim() || undefined,
          juego,
          alMejorDe: Number(alMejorDe),
          apertura,
          cierre,
          modoCricket,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "No se ha podido crear el amistoso.");
      setCreado(data);
      cargarMisAmistosos();
    } catch (err) {
      setError(err.message || "No se ha podido crear el amistoso.");
    } finally {
      setEnviando(false);
    }
  }

  const listaAmistosos = (
    <div className="admin-form" style={{ maxWidth: 460, marginBottom: "1.5rem" }}>
      <h3 style={{ marginTop: 0 }}>Tus amistosos</h3>
      {cargandoLista && <p className="chronicle-status">Cargando…</p>}
      {!cargandoLista && misAmistosos.length === 0 && (
        <p className="chronicle-status">Todavía no tienes ningún amistoso.</p>
      )}
      {!cargandoLista && misAmistosos.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {misAmistosos.map((p) => (
            <li
              key={p.id}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0", borderBottom: "1px solid var(--border-color, #ddd)" }}
            >
              <span>
                {p.etiqueta1} vs {p.etiqueta2}
                {" — "}
                {p.finalizada
                  ? `${p.legsGanados1}-${p.legsGanados2}`
                  : "pendiente"}
              </span>
              <button type="button" onClick={() => borrar(p.id)} disabled={borrandoId === p.id}>
                {borrandoId === p.id ? "Borrando…" : "Borrar"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (creado) {
    const enlace = `${ORIGEN}/partidas`;
    return (
      <>
        {listaAmistosos}
        <div className="admin-form" style={{ maxWidth: 460 }}>
          <p className="admin-msg admin-msg-ok">
            Amistoso creado: {creado.etiqueta1} vs {creado.etiqueta2}.
          </p>
          <p className="chronicle-status">
            Comparte este enlace con tu rival para que juegue desde su móvil (se identifica con su PIN,
            igual que en un partido de torneo/liga):
          </p>
          <p style={{ wordBreak: "break-all" }}>
            <a href="/partidas">{enlace}</a>
          </p>
          <p className="chronicle-status">Tú también juegas desde ahí, con tu propio PIN.</p>
          <button type="button" onClick={() => setCreado(null)}>Retar a otro amistoso</button>
        </div>
      </>
    );
  }

  return (
    <>
      {listaAmistosos}
      <form className="admin-form" style={{ maxWidth: 460 }} onSubmit={crear}>
      <h3 style={{ marginTop: 0 }}>Retar a un amistoso</h3>
      <p className="chronicle-status">
        Fuera de liga/torneo, contra cualquier jugador del club. Cada uno juega desde su propio móvil.
      </p>

      <label>
        Rival (jugador del club)
        <select value={rivalJugadorId} onChange={(e) => { setRivalJugadorId(e.target.value); if (e.target.value) setAmigoNuevo(""); }}>
          <option value="">— elige uno —</option>
          {jugadores.map((j) => (
            <option key={j.id} value={j.id}>{j.apodo || j.nombre}</option>
          ))}
        </select>
      </label>

      <label>
        …o nombre de un amigo nuevo (sin ficha todavía)
        <input
          type="text"
          value={amigoNuevo}
          onChange={(e) => { setAmigoNuevo(e.target.value); if (e.target.value) setRivalJugadorId(""); }}
          placeholder="Nombre del amigo"
        />
      </label>

      <div className="live-tournament-toggle">
        <button type="button" className={juego === "501" ? "active" : ""} onClick={() => setJuego("501")}>501</button>
        <button type="button" className={juego === "cricket" ? "active" : ""} onClick={() => setJuego("cricket")}>Cricket</button>
      </div>

      <label>
        Al mejor de
        <input type="number" min={1} max={15} value={alMejorDe} onChange={(e) => setAlMejorDe(e.target.value)} />
      </label>

      {juego === "501" && (
        <>
          <label>
            Apertura
            <select value={apertura} onChange={(e) => setApertura(e.target.value)}>
              <option value="simple">Simple (cualquier dardo)</option>
              <option value="doble">Doble</option>
              <option value="master">Master (doble o triple)</option>
            </select>
          </label>
          <label>
            Cierre
            <select value={cierre} onChange={(e) => setCierre(e.target.value)}>
              <option value="simple">Simple (cualquier dardo)</option>
              <option value="doble">Doble</option>
              <option value="master">Master (doble o triple)</option>
            </select>
          </label>
        </>
      )}

      {juego === "cricket" && (
        <label>
          Modo
          <select value={modoCricket} onChange={(e) => setModoCricket(e.target.value)}>
            <option value="normal">Normal</option>
            <option value="cutthroat">Cutthroat</option>
          </select>
        </label>
      )}

      {error && <p className="admin-msg admin-msg-error">{error}</p>}

      <button type="submit" disabled={enviando}>{enviando ? "Creando…" : "Crear amistoso"}</button>
      </form>
    </>
  );
}
