import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";
import { apiFetch, API_URL } from "./apiHerramienta.js";
import EditorMediasFabricante, { construirIdsFabricantes, mapasDesdeIdsFabricantes } from "./EditorMediasFabricante.jsx";

// Pestaña "Perfil" de la página pública "Invitados": un amigo/invitado
// identificado con su PIN edita su propia ficha (foto, nombre, apodo) y sus
// alias/medias de fabricante, igual que un socio en su perfil. Los miembros
// tienen su perfil completo en la zona de socios, así que a ellos solo se les
// remite allí.
export default function PerfilInvitado({ token, onNombreCambiado }) {
  const { t } = useLang();
  const [perfil, setPerfil] = useState(null);
  const [fabricantes, setFabricantes] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const [nombre, setNombre] = useState("");
  const [apodo, setApodo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [ids, setIds] = useState({});
  const [notas, setNotas] = useState({});
  const [medias, setMedias] = useState({});

  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function rellenar(p) {
    setPerfil(p);
    setNombre(p.nombre || "");
    setApodo(p.apodo || "");
    setAvatarUrl(p.avatarUrl || "");
    const { ids, notas, medias } = mapasDesdeIdsFabricantes(p.idsFabricantes);
    setIds(ids);
    setNotas(notas);
    setMedias(medias);
  }

  useEffect(() => {
    let vivo = true;
    Promise.all([
      apiFetch("/api/partidas-herramienta/mi-perfil", { token }),
      fetch(`${API_URL}/api/fabricantes`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ])
      .then(([p, fabs]) => {
        if (!vivo) return;
        rellenar(p);
        setFabricantes(fabs);
      })
      .catch((err) => vivo && setError(err.message || "No se pudo cargar tu perfil."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || t("perfil.noSubioFoto") });
        return;
      }
      setAvatarUrl(data.url);
    } catch {
      setMensaje({ tipo: "error", texto: t("perfil.errorConexionFoto") });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  async function guardar(e) {
    e.preventDefault();
    if (!nombre.trim()) {
      setMensaje({ tipo: "error", texto: t("invitados.nombreVacio") });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const actualizado = await apiFetch("/api/partidas-herramienta/mi-perfil", {
        token,
        method: "PUT",
        body: JSON.stringify({
          nombre: nombre.trim(),
          apodo,
          avatarUrl,
          idsFabricantes: construirIdsFabricantes(fabricantes, ids, notas, medias),
        }),
      });
      rellenar(actualizado);
      onNombreCambiado?.(actualizado.nombre);
      setMensaje({ tipo: "ok", texto: t("invitados.perfilGuardado") });
    } catch (err) {
      setMensaje({ tipo: "error", texto: err.message || t("perfil.errorConexion") });
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="chronicle-status">{t("equiposClub.cargando")}</p>;
  if (error) return <p className="admin-msg admin-msg-error">{error}</p>;

  // Miembro: su perfil se gestiona en la zona de socios, no aquí.
  if (perfil?.esMiembro) {
    return (
      <p className="chronicle-status">
        {t("invitados.esMiembro")}{" "}
        <a href="/socios">{t("invitados.irZonaSocios")}</a>
      </p>
    );
  }

  return (
    <form onSubmit={guardar} style={{ maxWidth: 560 }}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={t("perfil.tuFoto")}
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }}
        />
      )}
      <label>
        {t("perfil.nombre")}
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
      </label>
      <label>
        {t("perfil.apodoLabel")}
        <input value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder={t("perfil.apodoPlaceholder")} />
      </label>
      <label>
        {t("perfil.fotoLabel")}
        <input type="file" accept="image/*" onChange={subirAvatar} disabled={subiendo} />
        {subiendo && <span className="admin-uploading">{t("perfil.subiendo")}</span>}
      </label>

      <EditorMediasFabricante
        fabricantes={fabricantes}
        ids={ids}
        notas={notas}
        medias={medias}
        onId={(id, v) => setIds((p) => ({ ...p, [id]: v }))}
        onNota={(id, v) => setNotas((p) => ({ ...p, [id]: v }))}
        onMedia={(id, campo, v) => setMedias((p) => ({ ...p, [id]: { ...p[id], [campo]: v } }))}
      />

      <button type="submit" disabled={guardando}>{guardando ? t("perfil.guardando") : t("perfil.guardarPerfil")}</button>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </form>
  );
}
