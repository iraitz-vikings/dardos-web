import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { useLang } from "./i18n.jsx";
import ZonaSocio from "./ZonaSocio.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function Socios() {
  const { t } = useLang();
  const [usuario, setUsuario] = useState(() => {
    const guardado = localStorage.getItem("socioUsuario");
    return guardado ? JSON.parse(guardado) : null;
  });
  const [modo, setModo] = useState("login"); // login | registro
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigoInvitacion, setCodigoInvitacion] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function limpiarFormulario() {
    setNombre("");
    setEmail("");
    setPassword("");
    setCodigoInvitacion("");
  }

  async function iniciarSesion(e) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || t("socios.errorGenerico") });
        return;
      }
      localStorage.setItem("socioToken", data.token);
      localStorage.setItem("socioUsuario", JSON.stringify(data.usuario));
      setUsuario(data.usuario);
      limpiarFormulario();
    } catch {
      setMensaje({ tipo: "error", texto: t("socios.errorConexion") });
    } finally {
      setEnviando(false);
    }
  }

  async function registrarse(e) {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, password, codigoInvitacion }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: data.error || t("socios.errorGenerico") });
        return;
      }
      setMensaje({ tipo: "ok", texto: t("socios.registroOk") });
      limpiarFormulario();
      setModo("login");
    } catch {
      setMensaje({ tipo: "error", texto: t("socios.errorConexion") });
    } finally {
      setEnviando(false);
    }
  }

  function salir() {
    localStorage.removeItem("socioToken");
    localStorage.removeItem("socioUsuario");
    setUsuario(null);
  }

  return (
    <>
      <Nav />
      <main>
        <section className="gallery gallery-page">
          <p className="eyebrow">{t("socios.eyebrow")}</p>
          <h2 className="chronicle-title">{t("socios.title")}</h2>

          {usuario ? (
            <ZonaSocio usuario={usuario} salir={salir} />
          ) : (
            <div className="admin-form" style={{ maxWidth: 420, margin: "0 auto" }}>
              <div className="admin-tabs" style={{ marginBottom: "1.2rem" }}>
                <button
                  type="button"
                  className={`admin-tab ${modo === "login" ? "admin-tab-active" : ""}`}
                  onClick={() => { setModo("login"); setMensaje(null); }}
                >
                  {t("socios.tabEntrar")}
                </button>
                <button
                  type="button"
                  className={`admin-tab ${modo === "registro" ? "admin-tab-active" : ""}`}
                  onClick={() => { setModo("registro"); setMensaje(null); }}
                >
                  {t("socios.tabRegistro")}
                </button>
              </div>

              {modo === "login" ? (
                <form onSubmit={iniciarSesion}>
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </label>
                  <label>
                    {t("socios.password")}
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </label>
                  <button type="submit" disabled={enviando}>{enviando ? t("socios.entrando") : t("socios.tabEntrar")}</button>
                </form>
              ) : (
                <form onSubmit={registrarse}>
                  <label>
                    {t("socios.nombre")}
                    <input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
                  </label>
                  <label>
                    Email
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </label>
                  <label>
                    {t("socios.password")}
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  </label>
                  <label>
                    {t("socios.codigoInvitacion")}
                    <input value={codigoInvitacion} onChange={(e) => setCodigoInvitacion(e.target.value)} required />
                  </label>
                  <button type="submit" disabled={enviando}>{enviando ? t("socios.creando") : t("socios.tabRegistro")}</button>
                </form>
              )}

              {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
            </div>
          )}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
