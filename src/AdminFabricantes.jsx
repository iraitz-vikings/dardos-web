import { useEffect, useState } from "react";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function AdminFabricantes({ token, salir }) {
  const [fabricantes, setFabricantes] = useState([]);
  const [nombre, setNombre] = useState("");
  const [urlPerfilPlantilla, setUrlPerfilPlantilla] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [resumenActualizacion, setResumenActualizacion] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [urlEditada, setUrlEditada] = useState("");
  const [logoEditado, setLogoEditado] = useState("");
  const [guardandoUrl, setGuardandoUrl] = useState(false);

  const cargar = () => {
    fetch(`${API_URL}/api/fabricantes`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFabricantes)
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
      const res = await fetch(`${API_URL}/api/fabricantes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({
          nombre: nombre.trim(),
          urlPerfilPlantilla: urlPerfilPlantilla.trim() || undefined,
          logoUrl: logoUrl || undefined,
        }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo crear el fabricante." });
        return;
      }
      setNombre("");
      setUrlPerfilPlantilla("");
      setLogoUrl("");
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setCreando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar este fabricante? También se borrarán los alias que los jugadores tengan guardados para él.")) return;
    await fetch(`${API_URL}/api/fabricantes/${id}`, { method: "DELETE", headers: { "x-admin-token": token } });
    cargar();
  }

  function empezarEdicionUrl(f) {
    setEditandoId(f.id);
    setUrlEditada(f.urlPerfilPlantilla || "");
    setLogoEditado(f.logoUrl || "");
    setMensaje(null);
  }

  async function guardarUrl(id) {
    setGuardandoUrl(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/fabricantes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ urlPerfilPlantilla: urlEditada.trim() || undefined, logoUrl: logoEditado }),
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: "No se pudo guardar la URL." });
        return;
      }
      setEditandoId(null);
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardandoUrl(false);
    }
  }

  async function actualizarMedias() {
    setActualizando(true);
    setResumenActualizacion(null);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/fabricantes/actualizar-medias`, {
        method: "POST",
        headers: { "x-admin-token": token },
      });
      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo actualizar las medias." });
        return;
      }
      setResumenActualizacion(data);
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setActualizando(false);
    }
  }

  return (
    <section className="admin-form">
      <h2>Fabricantes</h2>
      <p className="admin-hint">
        Dianas electrónicas u otros fabricantes en cuya web cada jugador tiene su propio alias (para
        consultar sus medias/estadísticas). Los que des de alta aquí aparecerán en "Mi perfil" para
        que cada socio introduzca su alias.
      </p>

      <section style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1.2rem" }}>
        <h3 style={{ marginTop: 0 }}>Medias de Connection, Phoenix y Radikal Darts</h3>
        <p className="admin-hint" style={{ marginTop: 0 }}>
          Consulta automáticamente la media (MPR/PPD) de cada socio que tenga alias guardado en estos tres
          fabricantes. Se ejecuta también sola cada noche. Bullshooter no se consulta aquí (se enlaza
          directamente desde el perfil). Radikal Darts no tiene buscador general de jugadores, así que
          además del alias hace falta que el socio indique en su perfil el nombre de un torneo, liga o
          campeonato en el que haya jugado (vale cualquiera de los tres tipos): se busca su alias en la
          clasificación de esa competición y se entra en su ficha de jugador para leer su PPD/MPR real.
        </p>
        <button type="button" onClick={actualizarMedias} disabled={actualizando}>
          {actualizando ? "Actualizando…" : "Actualizar medias ahora"}
        </button>
        {resumenActualizacion && (
          <ul style={{ marginTop: ".8rem" }}>
            {Object.entries(resumenActualizacion).map(([nombreFab, r]) => (
              <li key={nombreFab}>
                <strong>{nombreFab}:</strong>{" "}
                {r.omitido && `omitido (${r.motivo})`}
                {r.error && `error: ${r.error}`}
                {!r.omitido && !r.error && `${r.actualizados} actualizados, ${r.errores} con error`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={crear} className="admin-inline-form">
        <label>
          Nombre del fabricante
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: DARTSLIVE" />
        </label>
        <label>
          URL de perfil (opcional, usa {"{alias}"} donde iría el alias del jugador)
          <input
            value={urlPerfilPlantilla}
            onChange={(e) => setUrlPerfilPlantilla(e.target.value)}
            placeholder="Ej: https://www.dartslive.com/es/rank/?id={alias}"
          />
        </label>
        <label>
          Logo (opcional)
          <SelectorImagen
            token={token}
            valor={logoUrl}
            onCambiar={setLogoUrl}
            onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
            etiqueta="Logo"
          />
        </label>
        <button type="submit" disabled={creando || !nombre.trim()}>{creando ? "Creando…" : "Añadir"}</button>
      </form>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {fabricantes.length === 0 && <p className="chronicle-status">Todavía no hay fabricantes dados de alta.</p>}
      <ul>
        {fabricantes.map((f) => (
          <li key={f.id} className="admin-list-item" style={{ alignItems: editandoId === f.id ? "flex-start" : "center" }}>
            <div style={{ display: "flex", alignItems: editandoId === f.id ? "flex-start" : "center", gap: ".8rem", flex: 1 }}>
              {f.logoUrl && (
                <img
                  src={f.logoUrl}
                  alt={f.nombre}
                  style={{ width: 40, height: 40, objectFit: "contain", background: "#fff", padding: 2, borderRadius: 4, flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <strong>{f.nombre}</strong>
                {editandoId === f.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: ".6rem", marginTop: ".4rem" }}>
                    <input
                      value={urlEditada}
                      onChange={(e) => setUrlEditada(e.target.value)}
                      placeholder="Ej: https://www.dartslive.com/es/rank/?id={alias}"
                    />
                    <SelectorImagen
                      token={token}
                      valor={logoEditado}
                      onCambiar={setLogoEditado}
                      onError={(msg) => setMensaje({ tipo: "error", texto: msg })}
                      etiqueta="Logo"
                    />
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      <button className="admin-link-btn" disabled={guardandoUrl} onClick={() => guardarUrl(f.id)}>
                        {guardandoUrl ? "Guardando…" : "Guardar"}
                      </button>
                      <button className="admin-link-btn" onClick={() => setEditandoId(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  f.urlPerfilPlantilla && <em style={{ display: "block", fontSize: ".8em" }}>{f.urlPerfilPlantilla}</em>
                )}
              </div>
            </div>
            {editandoId !== f.id && (
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button className="admin-link-btn" onClick={() => empezarEdicionUrl(f)}>Editar</button>
                <button className="admin-link-btn" onClick={() => borrar(f.id)}>Borrar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
