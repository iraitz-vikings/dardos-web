import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function SocioPerfil() {
  const [perfil, setPerfil] = useState(null);
  const [fabricantes, setFabricantes] = useState([]);
  const [editando, setEditando] = useState(false);

  const [apodo, setApodo] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [idsFabricantes, setIdsFabricantes] = useState({}); // { [fabricanteId]: idExterno }
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const token = () => localStorage.getItem("socioToken");

  function restaurarDesdePerfil(p) {
    if (!p) return;
    setApodo(p.apodo || "");
    setBio(p.bio || "");
    setAvatarUrl(p.avatarUrl || "");
    const mapa = {};
    (p.idsFabricantes || []).forEach((i) => {
      mapa[i.fabricanteId] = i.idExterno || "";
    });
    setIdsFabricantes(mapa);
  }

  useEffect(() => {
    fetch(`${API_URL}/api/perfil`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        setPerfil(p);
        restaurarDesdePerfil(p);
      })
      .catch(() => {});

    fetch(`${API_URL}/api/fabricantes`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setFabricantes)
      .catch(() => {});
  }, []);

  async function subirAvatar(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setMensaje(null);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo subir la foto." });
        return;
      }
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al subir la foto." });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  function cambiarIdFabricante(fabricanteId, valor) {
    setIdsFabricantes((prev) => ({ ...prev, [fabricanteId]: valor }));
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          apodo,
          bio,
          avatarUrl,
          idsFabricantes: fabricantes.map((f) => ({
            fabricanteId: f.id,
            idExterno: idsFabricantes[f.id] || "",
          })),
        }),
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: "No se pudo guardar el perfil." });
        return;
      }
      setMensaje({ tipo: "ok", texto: "Perfil actualizado." });
      setPerfil((p) => ({
        ...p,
        apodo,
        bio,
        avatarUrl,
        idsFabricantes: fabricantes
          .filter((f) => (idsFabricantes[f.id] || "").trim())
          .map((f) => ({
            fabricanteId: f.id,
            nombreFabricante: f.nombre,
            urlPerfilPlantilla: f.urlPerfilPlantilla,
            idExterno: idsFabricantes[f.id],
          })),
      }));
      setEditando(false);
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) return <p className="chronicle-status">Cargando tu perfil…</p>;

  if (!editando) {
    return (
      <div className="perfil-resumen" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Tu foto de perfil"
            style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "rgba(255,255,255,.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
            }}
            aria-hidden="true"
          >
            🎯
          </div>
        )}
        <div style={{ flex: 1 }}>
          <strong style={{ display: "block", fontSize: "1.1rem" }}>{perfil.nombre}</strong>
          {apodo && <span style={{ display: "block", opacity: 0.85 }}>"{apodo}"</span>}
          <button type="button" className="admin-link-btn" style={{ marginTop: ".6rem" }} onClick={() => setEditando(true)}>
            Editar perfil
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={guardar}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="Tu foto de perfil"
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }}
        />
      )}
      <label>
        Nombre
        <input value={perfil.nombre} disabled />
      </label>
      <label>
        Email
        <input value={perfil.email} disabled />
      </label>
      <label>
        Rol
        <input value={perfil.rol} disabled />
      </label>
      <label>
        Apodo (como quieres que te vean en torneos y ligas)
        <input value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="Ej: El Certero" />
      </label>
      <label>
        Foto de perfil
        <input type="file" accept="image/*" onChange={subirAvatar} disabled={subiendo} />
        {subiendo && <span className="admin-uploading">Subiendo…</span>}
      </label>
      <label>
        Sobre ti (opcional)
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Una frase, tu récord favorito, lo que quieras..." />
      </label>

      {fabricantes.length > 0 && (
        <fieldset style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1rem" }}>
          <legend style={{ padding: "0 .4rem" }}>Alias de fabricante</legend>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Si juegas en dianas de estos fabricantes, indica tu alias de jugador en cada una para poder
            consultar más adelante tu media en su web.
          </p>
          {fabricantes.map((f) => {
            const guardado = (perfil.idsFabricantes || []).find((i) => i.fabricanteId === f.id);
            const alias = idsFabricantes[f.id] || "";
            const enlace =
              f.urlPerfilPlantilla && alias.trim()
                ? f.urlPerfilPlantilla.replace("{alias}", encodeURIComponent(alias.trim()))
                : null;
            return (
              <label key={f.id}>
                {f.nombre}
                <input
                  value={alias}
                  onChange={(e) => cambiarIdFabricante(f.id, e.target.value)}
                  placeholder={`Tu alias en ${f.nombre}`}
                />
                {guardado && (guardado.mpr != null || guardado.ppd != null) && (
                  <span style={{ display: "block", fontSize: ".8em", opacity: .85 }}>
                    {guardado.mpr != null && `MPR ${guardado.mpr} `}
                    {guardado.ppd != null && `PPD ${guardado.ppd}`}
                  </span>
                )}
                {guardado?.statsError && (
                  <span style={{ display: "block", fontSize: ".8em", opacity: .85 }}>{guardado.statsError}</span>
                )}
                {enlace && (
                  <a href={enlace} target="_blank" rel="noreferrer" style={{ fontSize: ".85em" }}>
                    Ver mi media en {f.nombre} ↗
                  </a>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      <div style={{ display: "flex", gap: ".6rem" }}>
        <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar perfil"}</button>
        <button
          type="button"
          className="admin-link-btn"
          onClick={() => {
            restaurarDesdePerfil(perfil);
            setMensaje(null);
            setEditando(false);
          }}
        >
          Cancelar
        </button>
      </div>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      <CambioPasswordVoluntario />
      </>
    );
  }
function CambioPasswordVoluntario() {
  const [abierto, setAbierto] = useState(false);
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  async function guardar(e) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const token = localStorage.getItem("socioToken");
      const res = await fetch(`${API_URL}/api/auth/cambiar-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || "No se pudo cambiar la contraseña." });
        return;
      }
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada." });
      setPasswordActual("");
      setPasswordNueva("");
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar" : "Cambiar mi contraseña"}
      </button>
      {abierto && (
        <form onSubmit={guardar} style={{ marginTop: ".8rem" }}>
          <label>
            Contraseña actual
            <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required />
          </label>
          <label>
            Contraseña nueva
            <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required minLength={6} />
          </label>
          <button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Cambiar contraseña"}</button>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}
    </div>
  );
}
