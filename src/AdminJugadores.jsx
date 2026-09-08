import { useEffect, useState } from "react";
import { agruparPorSocio } from "./agruparJugadores.js";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminJugadores({ token, salir }) {
  const [jugadores, setJugadores] = useState([]);
  const [nombre, setNombre] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [enlaces, setEnlaces] = useState({}); // { [jugadorId]: { urlCheckIn, urlTelegram, telegramVinculado } }
  const [copiando, setCopiando] = useState(null);
  // Edición del nombre/apodo de un invitado (los socios no se editan aquí,
  // su nombre viene de su cuenta). Solo un jugador a la vez.
  const [editandoId, setEditandoId] = useState(null);
  const [nombreEdicion, setNombreEdicion] = useState("");
  const [apodoEdicion, setApodoEdicion] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  // PIN de partidas (4 dígitos) para jugar con la herramienta de marcador en
  // torneos/ligas — el admin puede ponérselo/cambiárselo a cualquier
  // jugador, socio o invitado (el socio también puede desde su perfil).
  const [editandoPinId, setEditandoPinId] = useState(null);
  const [pinEdicion, setPinEdicion] = useState("");
  const [guardandoPin, setGuardandoPin] = useState(false);

  const cargar = () => {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
  }, []);

  async function crear(e) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setCreando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/jugadores`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el jugador." });
        return;
      }
      setNombre("");
      setMensaje({ tipo: "ok", texto: "Jugador creado." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  // Genera (o recupera) el enlace de avisos personal de un invitado y lo
  // copia al portapapeles, para poder pasárselo por WhatsApp, en persona,
  // etc. Solo hace falta que lo abra y pulse "Iniciar" en Telegram una vez.
  async function copiarEnlaceAvisos(id) {
    setCopiando(id);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/notificaciones/invitados/${id}/enlace`, {
        headers: { "x-admin-token": token },
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: "No se pudo generar el enlace de avisos." });
        return;
      }
      const data = await res.json();
      setEnlaces((prev) => ({ ...prev, [id]: data }));
      const url = data.urlCheckIn || data.urlTelegram;
      if (!url) {
        setMensaje({ tipo: "error", texto: "Faltan avisos por configurar en el servidor (FRONTEND_URL o el bot de Telegram)." });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMensaje({ tipo: "ok", texto: "Enlace de avisos copiado al portapapeles." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCopiando(null);
    }
  }

  function empezarEdicion(j) {
    setMensaje(null);
    setEditandoId(j.id);
    setNombreEdicion(j.nombre);
    setApodoEdicion(j.apodo || "");
  }

  function cancelarEdicion() {
    setEditandoId(null);
  }

  async function guardarEdicion(id) {
    if (!nombreEdicion.trim()) return;
    setGuardandoEdicion(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/jugadores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ nombre: nombreEdicion.trim(), apodo: apodoEdicion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo guardar el cambio." });
        return;
      }
      setEditandoId(null);
      setMensaje({ tipo: "ok", texto: "Nombre actualizado." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardandoEdicion(false);
    }
  }

  function empezarEdicionPin(j) {
    setMensaje(null);
    setEditandoPinId(j.id);
    setPinEdicion("");
  }

  function cancelarEdicionPin() {
    setEditandoPinId(null);
  }

  async function guardarPin(id) {
    if (!/^\d{4}$/.test(pinEdicion)) {
      setMensaje({ tipo: "error", texto: "El PIN tiene que ser de 4 dígitos." });
      return;
    }
    setGuardandoPin(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/jugadores/${id}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ pin: pinEdicion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo guardar el PIN." });
        return;
      }
      setEditandoPinId(null);
      setMensaje({ tipo: "ok", texto: "PIN actualizado." });
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardandoPin(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este jugador? Si tiene un socio vinculado, solo se borra la ficha de jugador, no la cuenta.")) return;
    setMensaje(null);
    const res = await fetch(`${API_URL}/api/jugadores/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMensaje({ tipo: "error", texto: data.error || "No se pudo borrar el jugador." });
      return;
    }
    cargar();
  }

  return (
    <section className="admin-form">
      <h2>Jugadores del club</h2>
      <p className="admin-hint">
        Directorio de todos los jugadores, tengan cuenta de socio o no (invitados). Se usan para apuntar
        participantes a los cuadrantes de torneos, individuales o en pareja. El nombre de un invitado se puede
        corregir con "Editar nombre" (el de un socio se cambia desde su propia cuenta); ojo, el cambio no
        reescribe el nombre en los cuadrantes o calendarios ya generados con el nombre anterior, solo afecta a
        partir de ahora. El PIN de partidas (4 dígitos) es para identificarse en la página pública al jugar un
        partido de torneo/liga con la herramienta de marcador; un socio también puede cambiárselo desde su perfil.
      </p>

      <form onSubmit={crear} className="admin-inline-form">
        <label>
          Nombre del jugador nuevo (invitado, sin cuenta)
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Jon Errenteria" />
        </label>
        <button type="submit" disabled={creando || !nombre.trim()}>{creando ? "Creando…" : "Crear jugador"}</button>
      </form>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {jugadores.length === 0 && <p className="chronicle-status">Todavía no hay jugadores dados de alta.</p>}

      {(() => {
        const { socios, invitados } = agruparPorSocio(jugadores);
        const filaJugador = (j) => {
          if (editandoPinId === j.id) {
            return (
              <li key={j.id} className="admin-list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: ".4rem" }}>
                <div className="admin-inline-form" style={{ marginTop: 0 }}>
                  <label>
                    PIN de partidas de {j.nombre} (4 dígitos)
                    <input
                      value={pinEdicion}
                      onChange={(e) => setPinEdicion(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="1234"
                      inputMode="numeric"
                      maxLength={4}
                    />
                  </label>
                  <button type="button" disabled={guardandoPin || pinEdicion.length !== 4} onClick={() => guardarPin(j.id)}>
                    {guardandoPin ? "Guardando…" : "Guardar"}
                  </button>
                  <button type="button" className="admin-link-btn" onClick={cancelarEdicionPin}>Cancelar</button>
                </div>
              </li>
            );
          }
          if (editandoId === j.id) {
            return (
              <li key={j.id} className="admin-list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: ".4rem" }}>
                <div className="admin-inline-form" style={{ marginTop: 0 }}>
                  <label>
                    Nombre
                    <input value={nombreEdicion} onChange={(e) => setNombreEdicion(e.target.value)} placeholder="Nombre y apellido" />
                  </label>
                  <label>
                    Apodo (opcional)
                    <input value={apodoEdicion} onChange={(e) => setApodoEdicion(e.target.value)} />
                  </label>
                  <button type="button" disabled={guardandoEdicion || !nombreEdicion.trim()} onClick={() => guardarEdicion(j.id)}>
                    {guardandoEdicion ? "Guardando…" : "Guardar"}
                  </button>
                  <button type="button" className="admin-link-btn" onClick={cancelarEdicion}>Cancelar</button>
                </div>
              </li>
            );
          }
          return (
            <li key={j.id} className="admin-list-item">
              <div>
                <strong>{j.nombre}</strong>
                {j.apodo && <span> — "{j.apodo}"</span>}
                {j.usuario?.email && <em style={{ display: "block", fontSize: ".8em" }}>{j.usuario.email}</em>}
                {!j.usuario && (
                  <em style={{ display: "block", fontSize: ".8em" }}>
                    Invitado (sin cuenta)
                    {enlaces[j.id] && (enlaces[j.id].telegramVinculado ? " · Avisos por Telegram activados" : " · Todavía no ha activado avisos")}
                  </em>
                )}
              </div>
              <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                {!j.usuario && (
                  <>
                    <button className="admin-link-btn" onClick={() => empezarEdicion(j)}>Editar nombre</button>
                    <button className="admin-link-btn" disabled={copiando === j.id} onClick={() => copiarEnlaceAvisos(j.id)}>
                      {copiando === j.id ? "Copiando…" : "Copiar enlace de avisos"}
                    </button>
                  </>
                )}
                <button className="admin-link-btn" onClick={() => empezarEdicionPin(j)}>
                  {j.tienePinPartidas ? "Cambiar PIN" : "Poner PIN"}
                </button>
                <button className="admin-link-btn" onClick={() => borrar(j.id)}>Borrar</button>
              </div>
            </li>
          );
        };
        return (
          <>
            {socios.length > 0 && (
              <>
                <h3 style={{ marginTop: "1rem" }}>Socios ({socios.length})</h3>
                <ul>{socios.map(filaJugador)}</ul>
              </>
            )}
            {invitados.length > 0 && (
              <>
                <h3 style={{ marginTop: "1rem" }}>Invitados ({invitados.length})</h3>
                <ul>{invitados.map(filaJugador)}</ul>
              </>
            )}
          </>
        );
      })()}
    </section>
  );
}
