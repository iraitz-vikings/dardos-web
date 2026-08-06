import { useEffect, useState } from "react";
import { EMBLEM_DATA_URI } from "./emblem.js";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

function aInputDate(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export default function Admin() {
  const [token, setToken] = useState(() => sessionStorage.getItem("adminToken") || "");
  const [passwordInput, setPasswordInput] = useState("");
  const [noticias, setNoticias] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [fotos, setFotos] = useState("");
  const [videos, setVideos] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [torneoNombre, setTorneoNombre] = useState("");
  const [torneoDescripcion, setTorneoDescripcion] = useState("");
  const [torneoInicio, setTorneoInicio] = useState("");
  const [torneoFin, setTorneoFin] = useState("");
  const [torneoInsignia, setTorneoInsignia] = useState("");
  const [subiendoInsignia, setSubiendoInsignia] = useState(false);
  const [guardandoTorneo, setGuardandoTorneo] = useState(false);
  const [mensajeTorneo, setMensajeTorneo] = useState(null);

  const cargarNoticias = () => {
    fetch(`${API_URL}/api/noticias`)
      .then((r) => r.json())
      .then(setNoticias)
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
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (token) {
      cargarNoticias();
      cargarTorneo();
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

  async function subirInsignia(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    setSubiendoInsignia(true);
    setMensajeTorneo(null);
    try {
      const formData = new FormData();
      formData.append("imagen", archivo);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });

      if (res.status === 401) {
        setMensajeTorneo({ tipo: "error", texto: "Contraseña incorrecta. Vuelve a entrar." });
        salir();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensajeTorneo({ tipo: "error", texto: data.error || "No se pudo subir la insignia." });
        return;
      }

      const data = await res.json();
      setTorneoInsignia(data.url);
      setMensajeTorneo({ tipo: "ok", texto: "Insignia subida." });
    } catch {
      setMensajeTorneo({ tipo: "error", texto: "Error de conexión al subir la insignia." });
    } finally {
      setSubiendoInsignia(false);
      e.target.value = "";
    }
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
        <img src={EMBLEM_DATA_URI} alt="Escudo Vikings" className="admin-emblem" />
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

  return (
    <div className="admin">
      <header className="admin-header">
        <span>Panel del club</span>
        <button className="admin-link-btn" onClick={salir}>Salir</button>
      </header>

      <form onSubmit={guardarTorneo} className="admin-form">
        <h2>Próximo torneo</h2>
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
          Insignia del torneo
          <input type="file" accept="image/*" onChange={subirInsignia} disabled={subiendoInsignia} />
          {subiendoInsignia && <span className="admin-uploading">Subiendo…</span>}
          {torneoInsignia && !subiendoInsignia && (
            <img src={torneoInsignia} alt="Insignia actual" className="admin-badge-preview" />
          )}
        </label>
        <button type="submit" disabled={guardandoTorneo}>{guardandoTorneo ? "Guardando…" : "Guardar torneo"}</button>
        {mensajeTorneo && <p className={`admin-msg admin-msg-${mensajeTorneo.tipo}`}>{mensajeTorneo.texto}</p>}
      </form>

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
    </div>
  );
}
