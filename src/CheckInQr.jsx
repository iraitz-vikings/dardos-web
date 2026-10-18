import { useEffect, useState } from "react";
import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { LoginPin, CLAVE_TOKEN, CLAVE_JUGADOR } from "./JuegoHerramienta.jsx";
import { apiFetch } from "./apiHerramienta.js";
import { useLang } from "./i18n.jsx";

// Página que abre el QR de check-in de un cuadrante (/checkin/:token, ver
// AdminCheckInQr.jsx y src/routes/checkIn.js en el backend): el jugador se
// identifica y marca su presencia él mismo, sin pasar por la mesa. Vale la
// sesión de PIN de la página pública (la misma que /torneos y la
// herramienta de marcador) o, si no hay, la sesión de la zona de socios.
function leerSesion() {
  try {
    const pin = sessionStorage.getItem(CLAVE_TOKEN);
    if (pin) return { token: pin, jugador: JSON.parse(sessionStorage.getItem(CLAVE_JUGADOR) || "null"), tipo: "pin" };
  } catch { /* sin almacenamiento */ }
  try {
    const socio = localStorage.getItem("socioToken");
    if (socio) return { token: socio, jugador: null, tipo: "socio" };
  } catch { /* sin almacenamiento */ }
  return null;
}

export default function CheckInQr({ token: tokenQr }) {
  const { t } = useLang();
  const [sesion, setSesion] = useState(leerSesion);
  const [info, setInfo] = useState(null); // { competicion, participantes? }
  const [error, setError] = useState(null);
  const [cerrado, setCerrado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [nombreSocio, setNombreSocio] = useState(null);

  const ruta = `/api/check-in/${encodeURIComponent(tokenQr)}`;

  useEffect(() => {
    setError(null);
    apiFetch(ruta, { token: sesion?.token })
      .then(setInfo)
      .catch((err) => {
        if (err.status === 404) setCerrado(true);
        else setError(t("checkin.error"));
      });
  }, [ruta, sesion?.token]);

  // Con sesión de socio no se sabe el nombre hasta preguntarlo.
  useEffect(() => {
    if (sesion?.tipo !== "socio") return;
    apiFetch("/api/auth/me", { token: sesion.token })
      .then((u) => setNombreSocio(u.nombre))
      .catch((err) => {
        // Sesión de socio caducada: se pide el PIN como a cualquiera.
        if (err.status === 401) setSesion(null);
      });
  }, [sesion]);

  function alEntrar({ token, jugador }) {
    try {
      sessionStorage.setItem(CLAVE_TOKEN, token);
      sessionStorage.setItem(CLAVE_JUGADOR, JSON.stringify(jugador));
    } catch { /* se queda en memoria */ }
    setSesion({ token, jugador, tipo: "pin" });
  }

  function cambiarJugador() {
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem(CLAVE_JUGADOR);
    } catch { /* sin almacenamiento */ }
    // Si además hay sesión de socio, se cambia a PIN: quien quiere "cambiar
    // de jugador" en un móvil con sesión de socio es otra persona.
    setSesion(null);
    setInfo((i) => (i ? { competicion: i.competicion } : i));
  }

  async function hacerCheckIn() {
    setEnviando(true);
    setError(null);
    try {
      setInfo(await apiFetch(ruta, { method: "POST", token: sesion.token }));
    } catch (err) {
      if (err.status === 401) return cambiarJugador();
      if (err.status === 404) setCerrado(true);
      else setError(err.status === 403 ? t("checkin.noApuntado") : t("checkin.error"));
    } finally {
      setEnviando(false);
    }
  }

  const competicion = info?.competicion;
  const mios = info?.participantes;
  const nombre = sesion?.jugador?.nombre || nombreSocio;
  const yaHecho = mios && mios.length > 0 && mios.every((p) => p.hecho);

  return (
    <>
      <Nav />
      <main>
        <section className="gallery gallery-page" style={{ maxWidth: 520, margin: "0 auto" }}>
          <p className="eyebrow">{t("checkin.titulo")}</p>
          <h2 className="chronicle-title">{competicion?.nombre || t("checkin.titulo")}</h2>
          {competicion?.cuadrante && <p style={{ marginTop: 0 }}>{competicion.cuadrante}</p>}

          {cerrado && (
            <p className="chronicle-status">{t("checkin.cerrado")}</p>
          )}

          {!cerrado && !info && !error && <p className="chronicle-status">{t("checkin.cargando")}</p>}

          {!cerrado && info && !sesion && (
            <>
              <p className="chronicle-status">{t("checkin.identificate")}</p>
              <LoginPin onEntrar={alEntrar} />
            </>
          )}

          {!cerrado && info && sesion && (
            <>
              <p>
                {nombre ? <><strong>{t("checkin.eres").replace("{nombre}", nombre)}</strong>{" "}</> : null}
                <button type="button" className="admin-link-btn" onClick={cambiarJugador}>{t("checkin.noSoyYo")}</button>
              </p>

              {!yaHecho && (
                <button type="button" disabled={enviando} onClick={hacerCheckIn} style={{ fontSize: "1.15rem", padding: ".8rem 1.6rem" }}>
                  {enviando ? t("checkin.haciendo") : t("checkin.hacer")}
                </button>
              )}

              {yaHecho && mios.map((p) => (
                <div key={p.etiqueta} className="admin-msg admin-msg-ok" style={{ marginTop: ".8rem" }}>
                  <strong>{t("checkin.hecho")}</strong> — {p.etiqueta}
                  {p.esPareja && !p.companeroHecho && (
                    <p style={{ margin: ".4rem 0 0" }}>
                      {t(p.companeroSinCuenta ? "checkin.parejaSinCuenta" : "checkin.faltaPareja").replace("{nombre}", p.companero || t("checkin.tuPareja"))}
                    </p>
                  )}
                  {p.esPareja && p.companeroHecho && <p style={{ margin: ".4rem 0 0" }}>{t("checkin.parejaCompleta")}</p>}
                  {!p.esPareja && <p style={{ margin: ".4rem 0 0" }}>{t("checkin.individualHecho")}</p>}
                </div>
              ))}
            </>
          )}

          {error && !cerrado && <p className="admin-msg admin-msg-error">{error}</p>}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
