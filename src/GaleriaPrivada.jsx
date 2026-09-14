import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export default function GaleriaPrivada({ usuario }) {
  const { t, lang } = useLang();
  const [fotos, setFotos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [lightbox, setLightbox] = useState(null);

  const token = () => localStorage.getItem("socioToken");

  const cargar = () => {
    fetch(`${API_URL}/api/galeria-privada`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setFotos)
      .catch(() => {})
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  // Sube varias fotos a la vez, una detrás de otra (no en paralelo, para no saturar
  // Cloudinary ni el servidor). Si alguna falla, las demás siguen subiéndose igual y
  // al final se informa de cuántas se subieron y cuáles no.
  async function subirFoto(e) {
    const archivos = Array.from(e.target.files || []);
    if (archivos.length === 0) return;
    setSubiendo({ actual: 0, total: archivos.length });
    setMensaje(null);
    let subidas = 0;
    const errores = [];

    for (let i = 0; i < archivos.length; i++) {
      setSubiendo({ actual: i + 1, total: archivos.length });
      try {
        const formData = new FormData();
        formData.append("imagen", archivos[i]);
        const resSubida = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token()}` },
          body: formData,
        });
        if (!resSubida.ok) {
          errores.push(archivos[i].name);
          continue;
        }
        const { url } = await resSubida.json();
        const resGuardar = await fetch(`${API_URL}/api/galeria-privada`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ url, descripcion: descripcion.trim() || undefined }),
        });
        if (!resGuardar.ok) {
          errores.push(archivos[i].name);
          continue;
        }
        subidas++;
      } catch {
        errores.push(archivos[i].name);
      }
    }

    setSubiendo(false);
    if (errores.length === 0) {
      setMensaje(subidas > 1 ? { tipo: "ok", texto: t("galeriaPriv.fotosSubidas").replace("{n}", subidas) } : null);
    } else {
      setMensaje({
        tipo: subidas > 0 ? "ok" : "error",
        texto: t("galeriaPriv.fotosSubidasParcial")
          .replace("{subidas}", subidas)
          .replace("{total}", archivos.length)
          .replace("{lista}", errores.join(", ")),
      });
    }
    setDescripcion("");
    cargar();
    e.target.value = "";
  }

  async function borrar(id) {
    if (!confirm(t("galeriaPriv.confirmarBorrar"))) return;
    await fetch(`${API_URL}/api/galeria-privada/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    cargar();
  }

  return (
    <div>
      <h3>{t("zona.galeriaPrivada")}</h3>
      <p className="admin-hint-bloque">{t("galeriaPriv.intro")}</p>

      <div className="admin-inline-form" style={{ marginBottom: "1.2rem" }}>
        <label>
          {t("galeriaPriv.descripcionLabel")}
          <input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={t("galeriaPriv.descripcionPlaceholder")} />
        </label>
        <label>
          {t("galeriaPriv.subirLabel")}
          <input type="file" accept="image/*" multiple onChange={subirFoto} disabled={!!subiendo} />
        </label>
      </div>
      {subiendo && (
        <p className="admin-hint">
          {t("galeriaPriv.subiendo").replace("{actual}", subiendo.actual).replace("{total}", subiendo.total)}
        </p>
      )}
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {cargando && <p className="chronicle-status">{t("galeriaPriv.cargando")}</p>}
      {!cargando && fotos.length === 0 && <p className="chronicle-status">{t("galeriaPriv.vacio")}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: ".8rem" }}>
        {fotos.map((f) => (
          <div key={f.id}>
            <img
              src={f.url}
              alt={f.descripcion || t("galeriaPriv.altFoto")}
              style={{ width: "100%", aspectRatio: "1", objectFit: "cover", cursor: "zoom-in" }}
              onClick={() => setLightbox(f)}
            />
            <div style={{ fontSize: ".75em", marginTop: ".3rem", display: "flex", justifyContent: "space-between" }}>
              <span>{f.autor?.nombre} · {formatFecha(f.fechaSubida, lang)}</span>
              {(f.autor?.nombre === usuario.nombre || usuario.rol === "admin") && (
                <button type="button" className="admin-link-btn" onClick={() => borrar(f.id)}>{t("galeriaPriv.borrar")}</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, cursor: "zoom-out" }}
        >
          <img src={lightbox.url} alt={lightbox.descripcion || ""} style={{ maxWidth: "90%", maxHeight: "85%", objectFit: "contain" }} />
        </div>
      )}
    </div>
  );
}
