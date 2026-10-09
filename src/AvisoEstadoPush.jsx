import { useState } from "react";
import { useLang } from "./i18n.jsx";
import { activarSuscripcionPush } from "./SocioPerfil.jsx";

// Aviso en la zona de socios cuando ESTE dispositivo no va a recibir los
// avisos de partidos (plan de avisos de 2026-09-26: que el socio se entere
// antes del siguiente torneo, no en mitad de él). `estado` es lo que
// devuelve sincronizarSuscripcionPush() (SocioPerfil.jsx), que ya se ejecuta
// al entrar en la zona de socios:
// - permiso "denied": el navegador o Android han bloqueado las
//   notificaciones (a veces solos, ver webPush.js en el backend). La web no
//   puede volver a pedirlo: solo se puede explicar dónde reactivarlo a mano.
// - permiso "default": nunca se ha pedido, o se ha reiniciado — botón para
//   activarlos (el navegador exige que la petición salga de un toque).
// iPhone sin instalar y navegadores sin soporte no muestran nada aquí: eso
// ya se explica en "Mi perfil".
//
// Se puede ocultar unos días ("Ahora no"), guardado en localStorage de este
// dispositivo, para no machacar a quien no quiere avisos.
const CLAVE_OCULTO = "avisoEstadoPush.ocultoHasta";
const DIAS_OCULTO = 7;

function ocultoAhora() {
  try {
    return Number(localStorage.getItem(CLAVE_OCULTO) || 0) > Date.now();
  } catch {
    return false;
  }
}

function enAppInstalada() {
  return window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
}

export default function AvisoEstadoPush({ estado, onActivado }) {
  const { t } = useLang();
  const [oculto, setOculto] = useState(ocultoAhora);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState(null);

  if (!estado || oculto || !estado.soportado || estado.iosSinInstalar || estado.activo) return null;
  const bloqueado = estado.permiso === "denied";
  if (!bloqueado && estado.permiso !== "default") return null;

  function ocultar() {
    try {
      localStorage.setItem(CLAVE_OCULTO, String(Date.now() + DIAS_OCULTO * 24 * 60 * 60 * 1000));
    } catch { /* sin almacenamiento: se oculta solo en esta visita */ }
    setOculto(true);
  }

  async function activar() {
    setProcesando(true);
    setError(null);
    try {
      const r = await activarSuscripcionPush();
      if (r.ok) onActivado?.();
      else setError(t(r.clave));
    } finally {
      setProcesando(false);
    }
  }

  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const pasos = bloqueado
    ? esIOS
      ? t("avisoPush.pasosIOS")
      : enAppInstalada()
      ? t("avisoPush.pasosAppAndroid")
      : t("avisoPush.pasosNavegador")
    : null;

  return (
    <div className={`aviso-estado-push ${bloqueado ? "aviso-estado-push-bloqueado" : ""}`} role="status">
      <p style={{ margin: 0 }}>
        <strong>{bloqueado ? t("avisoPush.bloqueadoTitulo") : t("avisoPush.sinActivarTitulo")}</strong>{" "}
        {bloqueado ? t("avisoPush.bloqueadoTexto") : t("avisoPush.sinActivarTexto")}
      </p>
      {bloqueado && (
        <details style={{ marginTop: ".4rem" }}>
          <summary>{t("avisoPush.comoReactivar")}</summary>
          <p className="admin-hint" style={{ margin: ".4rem 0 0" }}>{pasos}</p>
          <p className="admin-hint" style={{ margin: ".4rem 0 0" }}>{t("avisoPush.despues")}</p>
        </details>
      )}
      {error && <p className="admin-msg admin-msg-error" style={{ margin: ".4rem 0 0" }}>{error}</p>}
      <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".5rem" }}>
        {!bloqueado && (
          <button type="button" onClick={activar} disabled={procesando}>
            {procesando ? t("avisosPush.unMomento") : t("avisoPush.activar")}
          </button>
        )}
        <button type="button" className="admin-link-btn" onClick={ocultar}>
          {t("avisoPush.ahoraNo")}
        </button>
      </div>
    </div>
  );
}
