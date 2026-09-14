import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TablonAnuncios({ usuario }) {
  const { t, lang } = useLang();
  const [anuncios, setAnuncios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fijado, setFijado] = useState(false);
  const [notificar, setNotificar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const puedePublicar = usuario.rol === "admin" || usuario.rol === "capitan";
  const token = () => localStorage.getItem("socioToken");

  const cargar = () => {
    fetch(`${API_URL}/api/anuncios`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setAnuncios)
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  async function publicar(e) {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) return;
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/anuncios`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ titulo: titulo.trim(), contenido: contenido.trim(), fijado, notificar }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || t("tablon.errorPublicar") });
        return;
      }
      setTitulo("");
      setContenido("");
      setFijado(false);
      setNotificar(false);
      setMostrarFormulario(false);
      cargar();
    } catch {
      setMensaje({ tipo: "error", texto: t("socios.errorConexion") });
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(id) {
    if (!confirm(t("tablon.confirmarBorrar"))) return;
    await fetch(`${API_URL}/api/anuncios/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    cargar();
  }

  return (
    <div>
      <h3>{t("zona.tablon")}</h3>

      {puedePublicar && !mostrarFormulario && (
        <button type="button" onClick={() => setMostrarFormulario(true)} style={{ marginBottom: "1rem" }}>
          ＋ {t("tablon.publicarAnuncio")}
        </button>
      )}

      {puedePublicar && mostrarFormulario && (
        <form onSubmit={publicar} style={{ marginBottom: "1.5rem" }}>
          <label>
            {t("tablon.tituloLabel")}
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
          </label>
          <label>
            {t("tablon.contenidoLabel")}
            <textarea rows={4} value={contenido} onChange={(e) => setContenido(e.target.value)} required />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
            <input type="checkbox" checked={fijado} onChange={(e) => setFijado(e.target.checked)} style={{ width: "auto" }} />
            {t("tablon.fijarLabel")}
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", flexDirection: "row" }}>
            <input type="checkbox" checked={notificar} onChange={(e) => setNotificar(e.target.checked)} style={{ width: "auto" }} />
            {t("tablon.notificarLabel")}
          </label>
          <div style={{ display: "flex", gap: ".6rem" }}>
            <button type="submit" disabled={enviando}>{enviando ? t("tablon.publicando") : t("tablon.publicar")}</button>
            <button type="button" className="admin-link-btn" onClick={() => setMostrarFormulario(false)}>{t("tablon.cancelar")}</button>
          </div>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}

      {cargando && <p className="chronicle-status">{t("tablon.cargando")}</p>}
      {!cargando && anuncios.length === 0 && <p className="chronicle-status">{t("tablon.vacio")}</p>}

      <ul>
        {anuncios.map((a) => (
          <li key={a.id} className="admin-list-item" style={{ alignItems: "flex-start", flexDirection: "column", gap: ".4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <strong>{a.fijado ? "📌 " : ""}{a.titulo}</strong>
              {(usuario.rol === "admin" || a.autor?.nombre === usuario.nombre) && (
                <button type="button" className="admin-link-btn" onClick={() => borrar(a.id)}>{t("tablon.borrar")}</button>
              )}
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{a.contenido}</p>
            <em style={{ fontSize: ".8em" }}>{a.autor?.nombre} · {formatFecha(a.fechaPublicacion, lang)}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
