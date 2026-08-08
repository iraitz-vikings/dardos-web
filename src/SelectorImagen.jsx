import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function SelectorImagen({ token, valor, onCambiar, onError, etiqueta }) {
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarExistentes, setMostrarExistentes] = useState(false);
  const [existentes, setExistentes] = useState([]);
  const [cargandoExistentes, setCargandoExistentes] = useState(false);

  async function subirArchivo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);
      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onError?.(data.error || "No se pudo subir la imagen.");
        return;
      }
      const data = await res.json();
      onCambiar(data.url);
    } catch {
      onError?.("Error de conexión al subir la imagen.");
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  async function abrirExistentes() {
    setMostrarExistentes(true);
    if (existentes.length > 0) return;
    setCargandoExistentes(true);
    try {
      const res = await fetch(`${API_URL}/api/upload/existentes`, { headers: { "x-admin-token": token } });
      if (res.ok) setExistentes(await res.json());
      else onError?.("No se pudo cargar el listado de imágenes.");
    } catch {
      onError?.("Error de conexión al cargar el listado de imágenes.");
    } finally {
      setCargandoExistentes(false);
    }
  }

  return (
    <div className="selector-imagen">
      <div className="selector-imagen-botones">
        <label className="selector-imagen-subir">
          Subir nueva
          <input type="file" accept="image/*" onChange={subirArchivo} disabled={subiendo} />
        </label>
        <button type="button" className="admin-link-btn" onClick={abrirExistentes} disabled={subiendo}>
          Elegir de Cloudinary
        </button>
        {valor && (
          <button type="button" className="admin-link-btn" onClick={() => onCambiar("")}>
            Quitar
          </button>
        )}
      </div>
      {subiendo && <span className="admin-uploading">Subiendo…</span>}
      {valor && !subiendo && <img src={valor} alt={etiqueta || "Imagen elegida"} className="admin-badge-preview" />}

      {mostrarExistentes && (
        <div className="selector-imagen-modal" onClick={() => setMostrarExistentes(false)}>
          <div className="selector-imagen-panel" onClick={(e) => e.stopPropagation()}>
            <div className="selector-imagen-panel-header">
              <strong>Elegir una imagen ya subida</strong>
              <button type="button" className="admin-link-btn" onClick={() => setMostrarExistentes(false)}>Cerrar</button>
            </div>
            {cargandoExistentes && <p className="chronicle-status">Cargando…</p>}
            {!cargandoExistentes && existentes.length === 0 && (
              <p className="chronicle-status">Todavía no hay imágenes subidas.</p>
            )}
            <div className="selector-imagen-grid">
              {existentes.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  className="selector-imagen-item"
                  onClick={() => {
                    onCambiar(img.url);
                    setMostrarExistentes(false);
                  }}
                >
                  <img src={img.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
