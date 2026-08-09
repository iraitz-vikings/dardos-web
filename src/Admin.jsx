import { useEffect, useState } from "react";
const ADMIN_EMBLEM_URL = "https://res.cloudinary.com/lodi1y1k/image/upload/v1786283841/vikings-logo-transparente_bjtv7c.png";
import AdminTorneosClub from "./AdminTorneosClub.jsx";
import AdminPatrocinadores from "./AdminPatrocinadores.jsx";
import AdminSocios from "./AdminSocios.jsx";
import AdminMensajeAnclado from "./AdminMensajeAnclado.jsx";
import SelectorImagen from "./SelectorImagen.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function aInputDate(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

function idVideoYoutube(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("adminToken") || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [pestana, setPestana] = useState("noticias");
  const [noticias, setNoticias] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fotos, setFotos] = useState("");
  const [videos, setVideos] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [subiendoVideo, setSubiendoVideo] = useState(false);

  const [galeriaItems, setGaleriaItems] = useState([]);
  const [subiendoGaleriaFoto, setSubiendoGaleriaFoto] = useState(false);
  const [subiendoGaleriaVideo, setSubiendoGaleriaVideo] = useState(false);
  const [galeriaYoutubeUrl, setGaleriaYoutubeUrl] = useState("");
  const [anadiendoGaleriaYoutube, setAnadiendoGaleriaYoutube] = useState(false);
  const [mensajeGaleria, setMensajeGaleria] = useState(null);

  const [torneoNombre, setTorneoNombre] = useState("");
  const [torneoDescripcion, setTorneoDescripcion] = useState("");
  const [torneoInicio, setTorneoInicio] = useState("");
  const [torneoFin, setTorneoFin] = useState("");
  const [torneoInsignia, setTorneoInsignia] = useState("");
  const [torneoCartel, setTorneoCartel] = useState("");
  const [guardandoTorneo, setGuardandoTorneo] = useState(false);
  const [mensajeTorneo, setMensajeTorneo] = useState(null);

  const cargarNoticias = () => {
    fetch(`${API_URL}/api/noticias`)
      .then((r) => r.json())
      .then(setNoticias)
      .catch(() => {});
  };

  const cargarGaleria = () => {
    fetch(`${API_URL}/api/galeria`)
      .then((r) => r.json())
      .then(setGaleriaItems)
      .catch(() => {});
  };

  const cargarTorneo = () => {
    fetch(`${API_URL}/api/torneo-destacado`)
      .then((r) => r.json())
      .then((t) => {
        if (!t) return;
        setTorneoNombre(t.nombre || "");
        setTorneoDescripcion(t.descripcion || "");
        setTorneoInicio(aInputDate(t.fechaInicio));
        setTorneoFin(aInputDate(t.fechaFin));
        setTorneoInsignia(t.insigniaUrl || "");
        setTorneoCartel(t.cartelUrl || "");
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (token) {
      cargarNoticias();
      cargarTorneo();
      cargarGaleria();
    }
  }, [token]);

  function entrar(e) {
    e.preventDefault();
    sessionStorage.setItem("adminToken", passwordInput);
    setToken(passwordInput);
  }

  function salir() {
    sessionStorage.removeItem("adminToken");
    setToken("");
    setPasswordInput("");
  }

  async function subirFoto(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoFoto(true);
    setMensaje(null);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });

      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo subir la foto." });
        return;
      }

      const data = await res.json();
      setFotos((prev) => (prev ? `${prev}, ${data.url}` : data.url));
      setMensaje({ tipo: "ok", texto: "Foto subida y añadida." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al subir la foto." });
    } finally {
      setSubiendoFoto(false);
      e.target.value = "";
    }
  }

  async function subirVideo(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoVideo(true);
    setMensaje(null);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });

      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (res.status === 413) {
        setMensaje({ tipo: "error", texto: "El vídeo pesa demasiado (máximo 100 MB)." });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo subir el vídeo." });
        return;
      }

      const data = await res.json();
      setVideos((prev) => (prev ? `${prev}, ${data.url}` : data.url));
      setMensaje({ tipo: "ok", texto: "Vídeo subido y añadido." });
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al subir el vídeo." });
    } finally {
      setSubiendoVideo(false);
      e.target.value = "";
    }
  }

  async function subirAGaleria(archivo, tipo) {
    const setSubiendo = tipo === "image" ? setSubiendoGaleriaFoto : setSubiendoGaleriaVideo;
    setSubiendo(true);
    setMensajeGaleria(null);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);

      const resUpload = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });

      if (resUpload.status === 401) {
        setMensajeGaleria({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (resUpload.status === 413) {
        setMensajeGaleria({ tipo: "error", texto: "El archivo pesa demasiado (máximo 100 MB)." });
        return;
      }
      if (!resUpload.ok) {
        const data = await resUpload.json().catch(() => ({}));
        setMensajeGaleria({ tipo: "error", texto: data.error || "No se pudo subir el archivo." });
        return;
      }

      const { url } = await resUpload.json();

      const resGaleria = await fetch(`${API_URL}/api/galeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ url, tipo }),
      });

      if (!resGaleria.ok) {
        const data = await resGaleria.json().catch(() => ({}));
        setMensajeGaleria({ tipo: "error", texto: data.error || "No se pudo añadir a la galería." });
        return;
      }

      setMensajeGaleria({ tipo: "ok", texto: tipo === "image" ? "Foto añadida a la galería." : "Vídeo añadido a la galería." });
      cargarGaleria();
    } catch {
      setMensajeGaleria({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setSubiendo(false);
    }
  }

  function subirGaleriaFoto(e) {
    const archivo = e.target.files?.[0];
    if (archivo) subirAGaleria(archivo, "image");
    e.target.value = "";
  }

  function subirGaleriaVideo(e) {
    const archivo = e.target.files?.[0];
    if (archivo) subirAGaleria(archivo, "video");
    e.target.value = "";
  }

  async function anadirGaleriaYoutube(e) {
    e.preventDefault();
    if (!galeriaYoutubeUrl.trim()) return;

    setAnadiendoGaleriaYoutube(true);
    setMensajeGaleria(null);
    try {
      const res = await fetch(`${API_URL}/api/galeria`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": token },
        body: JSON.stringify({ url: galeriaYoutubeUrl.trim(), tipo: "video" }),
      });

      if (res.status === 401) {
        setMensajeGaleria({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensajeGaleria({ tipo: "error", texto: data.error || "No se pudo añadir el vídeo." });
        return;
      }

      setGaleriaYoutubeUrl("");
      setMensajeGaleria({ tipo: "ok", texto: "Vídeo de YouTube añadido a la galería." });
      cargarGaleria();
    } catch {
      setMensajeGaleria({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setAnadiendoGaleriaYoutube(false);
    }
  }

  async function borrarGaleria(id) {
    if (!confirm("¿Quitar este elemento de la galería?")) return;
    const res = await fetch(`${API_URL}/api/galeria/${id}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    if (res.status === 401) {
      setMensajeGaleria({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
      salir();
      return;
    }
    cargarGaleria();
  }

  async function guardarTorneo(e) {
    e.preventDefault();
    setGuardandoTorneo(true);
    setMensajeTorneo(null);
    try {
      const res = await fetch(`${API_URL}/api/torneo-destacado`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          nombre: torneoNombre,
          descripcion: torneoDescripcion,
          fechaInicio: torneoInicio,
          fechaFin: torneoFin,
          insigniaUrl: torneoInsignia,
          cartelUrl: torneoCartel,
        }),
      });

      if (res.status === 401) {
        setMensajeTorneo({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensajeTorneo({ tipo: "error", texto: data.error || "No se pudo guardar el torneo." });
        return;
      }

      setMensajeTorneo({ tipo: "ok", texto: "Torneo actualizado." });
    } catch {
      setMensajeTorneo({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setGuardandoTorneo(false);
    }
  }

  async function publicar(e) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/noticias`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({
          titulo,
          contenido,
          fotos: fotos
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          videos: videos
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
        }),
      });

      if (res.status === 401) {
        setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || "No se pudo publicar la noticia." });
        return;
      }

      setTitulo("");
      setContenido("");
      setFotos("");
      setVideos("");
      setMensaje({ tipo: "ok", texto: "Noticia publicada." });
      cargarNoticias();
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión con el servidor." });
    } finally {
      setEnviando(false);
    }
  }

  async function borrar(id) {
    if (!confirm("¿Borrar esta noticia?")) return;
    const res = await fetch(`${API_URL}/api/noticias/${id}`, {
      method: "DELETE",
      headers: { "x-admin-token": token },
    });
    if (res.status === 401) {
      setMensaje({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
      salir();
      return;
    }
    cargarNoticias();
  }

  if (!token) {
    return (
      <div className="admin-gate">
        <img src={ADMIN_EMBLEM_URL} alt="Escudo Vikings" className="admin-emblem" />
        <h1>Panel del club</h1>
        <form onSubmit={entrar} className="admin-login-form">
          <input
            type="password"
            placeholder="Contraseña de administrador"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            autoFocus
          />
          <button type="submit">Entrar</button>
        </form>
      </div>
    );
  }

  const TABS = [
    { id: "noticias", etiqueta: "Noticias" },
    { id: "torneos-club", etiqueta: "Torneos del club" },
    { id: "galeria", etiqueta: "Galería" },
    { id: "torneo-destacado", etiqueta: "Torneo destacado" },
    { id: "patrocinadores", etiqueta: "Patrocinadores" },
    { id: "socios", etiqueta: "Socios" },
    { id: "mensaje", etiqueta: "Mensaje" },
  ];

  return (
    <div className="admin">
      <header className="admin-header">
        <span>Panel del club</span>
        <button className="admin-link-btn" onClick={salir}>Salir</button>
      </header>

      <nav className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-tab ${pestana === t.id ? "admin-tab-active" : ""}`}
            onClick={() => setPestana(t.id)}
          >
            {t.etiqueta}
          </button>
        ))}
      </nav>

      {pestana === "torneo-destacado" && (
        <form onSubmit={guardarTorneo} className="admin-form">
          <h2>Próximo torneo (destacado en la home)</h2>
          <label>
            Nombre del torneo
            <input value={torneoNombre} onChange={(e) => setTorneoNombre(e.target.value)} required />
          </label>
          <label>
            Descripción (opcional)
            <textarea rows={3} value={torneoDescripcion} onChange={(e) => setTorneoDescripcion(e.target.value)} />
          </label>
          <label>
            Fecha de inicio
            <input type="date" value={torneoInicio} onChange={(e) => setTorneoInicio(e.target.value)} required />
          </label>
          <label>
            Fecha de fin
            <input type="date" value={torneoFin} onChange={(e) => setTorneoFin(e.target.value)} required />
          </label>
          <label>
            Cartel del torneo (opcional)
            <SelectorImagen
              token={token}
              valor={torneoCartel}
              onCambiar={setTorneoCartel}
              onError={(msg) => setMensajeTorneo({ tipo: "error", texto: msg })}
              etiqueta="Cartel"
            />
          </label>
          <label>
            Insignia del torneo (opcional)
            <SelectorImagen
              token={token}
              valor={torneoInsignia}
              onCambiar={setTorneoInsignia}
              onError={(msg) => setMensajeTorneo({ tipo: "error", texto: msg })}
              etiqueta="Insignia"
            />
          </label>
          <button type="submit" disabled={guardandoTorneo}>{guardandoTorneo ? "Guardando…" : "Guardar torneo"}</button>
          {mensajeTorneo && <p className={`admin-msg admin-msg-${mensajeTorneo.tipo}`}>{mensajeTorneo.texto}</p>}
        </form>
      )}

      {pestana === "noticias" && (
        <>
          <form onSubmit={publicar} className="admin-form">
            <h2>Publicar noticia</h2>
            <label>
              Título
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required />
            </label>
            <label>
              Contenido
              <textarea rows={5} value={contenido} onChange={(e) => setContenido(e.target.value)} required />
            </label>
            <label>
              Fotos (URLs separadas por comas, opcional)
              <input value={fotos} onChange={(e) => setFotos(e.target.value)} placeholder="https://..., https://..." />
            </label>
            <label>
              Subir una foto
              <input type="file" accept="image/*" onChange={subirFoto} disabled={subiendoFoto} />
              {subiendoFoto && <span className="admin-uploading">Subiendo…</span>}
            </label>
            <label>
              Vídeos de YouTube (URLs separadas por comas, opcional)
              <input value={videos} onChange={(e) => setVideos(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </label>
            <label>
              Subir un vídeo (archivo, hasta 100 MB, opcional)
              <input type="file" accept="video/*" onChange={subirVideo} disabled={subiendoVideo} />
              {subiendoVideo && <span className="admin-uploading">Subiendo vídeo, puede tardar unos minutos…</span>}
            </label>
            <button type="submit" disabled={enviando}>{enviando ? "Publicando…" : "Publicar"}</button>
            {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
          </form>

          <section className="admin-list">
            <h2>Noticias publicadas</h2>
            {noticias.length === 0 && <p className="chronicle-status">Todavía no hay noticias.</p>}
            <ul>
              {noticias.map((n) => (
                <li key={n.id} className="admin-list-item">
                  <div>
                    <strong>{n.titulo}</strong>
                    <time>{formatFecha(n.fechaPublicacion)}</time>
                  </div>
                  <button className="admin-link-btn" onClick={() => borrar(n.id)}>Borrar</button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {pestana === "galeria" && (
        <section className="admin-form">
          <h2>Galería (sin noticia)</h2>
          <p className="admin-hint">Añade fotos o vídeos sueltos a la galería, sin necesidad de crear una noticia.</p>
          <label>
            Subir una foto
            <input type="file" accept="image/*" onChange={subirGaleriaFoto} disabled={subiendoGaleriaFoto} />
            {subiendoGaleriaFoto && <span className="admin-uploading">Subiendo…</span>}
          </label>
          <label>
            Subir un vídeo (hasta 100 MB)
            <input type="file" accept="video/*" onChange={subirGaleriaVideo} disabled={subiendoGaleriaVideo} />
            {subiendoGaleriaVideo && <span className="admin-uploading">Subiendo vídeo, puede tardar unos minutos…</span>}
          </label>
          <form onSubmit={anadirGaleriaYoutube} className="admin-inline-form">
            <label>
              O pegar un enlace de YouTube
              <input
                value={galeriaYoutubeUrl}
                onChange={(e) => setGaleriaYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
              />
            </label>
            <button type="submit" disabled={anadiendoGaleriaYoutube || !galeriaYoutubeUrl.trim()}>
              {anadiendoGaleriaYoutube ? "Añadiendo…" : "Añadir"}
            </button>
          </form>
          {mensajeGaleria && <p className={`admin-msg admin-msg-${mensajeGaleria.tipo}`}>{mensajeGaleria.texto}</p>}

          {galeriaItems.length > 0 && (
            <ul className="admin-gallery-grid">
              {galeriaItems.map((item) => {
                const ytId = item.tipo === "video" ? idVideoYoutube(item.url) : null;
                return (
                  <li key={item.id} className="admin-gallery-item">
                    {item.tipo === "video" ? (
                      ytId ? (
                        <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="" />
                      ) : (
                        <video src={item.url} muted />
                      )
                    ) : (
                      <img src={item.url} alt="" />
                    )}
                    <button type="button" className="admin-link-btn" onClick={() => borrarGaleria(item.id)}>Borrar</button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {pestana === "torneos-club" && <AdminTorneosClub token={token} salir={salir} />}
      {pestana === "patrocinadores" && <AdminPatrocinadores token={token} salir={salir} />}
      {pestana === "socios" && <AdminSocios token={token} salir={salir} />}
      {pestana === "mensaje" && <AdminMensajeAnclado token={token} salir={salir} />}
    </div>
  );
}
