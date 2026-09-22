import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";
import MediasFabricante from "./MediasFabricante.jsx";
import AceroJugador from "./AceroJugador.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

// Convierte la clave pública VAPID (base64 URL-safe, tal como la da el
// servidor) al formato Uint8Array que pide pushManager.subscribe().
function claveVapidABytes(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Normalizada = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = window.atob(base64Normalizada);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

export default function SocioPerfil() {
  const { t } = useLang();
  const [perfil, setPerfil] = useState(null);
  const [fabricantes, setFabricantes] = useState([]);
  const [editando, setEditando] = useState(false);

  const [apodo, setApodo] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [idsFabricantes, setIdsFabricantes] = useState({}); // { [fabricanteId]: idExterno }
  const [notasFabricantes, setNotasFabricantes] = useState({}); // { [fabricanteId]: notaBusqueda }
  // Media manual (hoy solo la usa Radikal Darts: su scraper automático no
  // puede iniciar sesión porque la propia web bloquea en silencio los
  // intentos de login desde un navegador automatizado — ver el error que
  // muestra el panel de admin. Mientras eso no se resuelva, cada socio
  // puede escribir aquí su MPR/PPD tal como aparece en su perfil de
  // radikalplayers.com).
  const [mediasFabricantes, setMediasFabricantes] = useState({}); // { [fabricanteId]: { mpr, ppd } }
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
    const notas = {};
    const medias = {};
    (p.idsFabricantes || []).forEach((i) => {
      mapa[i.fabricanteId] = i.idExterno || "";
      notas[i.fabricanteId] = i.notaBusqueda || "";
      medias[i.fabricanteId] = {
        mpr: i.mpr != null ? String(i.mpr) : "",
        ppd: i.ppd != null ? String(i.ppd) : "",
      };
    });
    setIdsFabricantes(mapa);
    setNotasFabricantes(notas);
    setMediasFabricantes(medias);
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
        setMensaje({ tipo: "error", texto: data.error || t("perfil.noSubioFoto") });
        return;
      }
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch {
      setMensaje({ tipo: "error", texto: t("perfil.errorConexionFoto") });
    } finally {
      setSubiendo(false);
      e.target.value = "";
    }
  }

  function cambiarIdFabricante(fabricanteId, valor) {
    setIdsFabricantes((prev) => ({ ...prev, [fabricanteId]: valor }));
  }

  function cambiarNotaFabricante(fabricanteId, valor) {
    setNotasFabricantes((prev) => ({ ...prev, [fabricanteId]: valor }));
  }

  function cambiarMediaFabricante(fabricanteId, campo, valor) {
    setMediasFabricantes((prev) => ({
      ...prev,
      [fabricanteId]: { ...prev[fabricanteId], [campo]: valor },
    }));
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
          idsFabricantes: fabricantes.map((f) => {
            const item = {
              fabricanteId: f.id,
              idExterno: idsFabricantes[f.id] || "",
              notaBusqueda: notasFabricantes[f.id] || "",
            };
            // mpr/ppd solo se mandan para Radikal (entrada manual, ver más
            // abajo): para el resto de fabricantes no se incluyen esas
            // claves, para no pisar con null la media que ya haya puesto su
            // scraper automático.
            if (f.nombre.toLowerCase().includes("radikal")) {
              const media = mediasFabricantes[f.id] || {};
              item.mpr = media.mpr === "" || media.mpr == null ? null : Number(media.mpr);
              item.ppd = media.ppd === "" || media.ppd == null ? null : Number(media.ppd);
            }
            return item;
          }),
        }),
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: t("perfil.noGuardoPerfil") });
        return;
      }
      setMensaje({ tipo: "ok", texto: t("perfil.actualizado") });
      setPerfil((p) => ({
        ...p,
        apodo,
        bio,
        avatarUrl,
        idsFabricantes: fabricantes
          .filter((f) => (idsFabricantes[f.id] || "").trim())
          .map((f) => {
            const esRadikal = f.nombre.toLowerCase().includes("radikal");
            const media = mediasFabricantes[f.id] || {};
            return {
              fabricanteId: f.id,
              nombreFabricante: f.nombre,
              urlPerfilPlantilla: f.urlPerfilPlantilla,
              logoUrl: f.logoUrl,
              idExterno: idsFabricantes[f.id],
              notaBusqueda: notasFabricantes[f.id] || "",
              mpr: esRadikal && media.mpr !== "" ? Number(media.mpr) : null,
              ppd: esRadikal && media.ppd !== "" ? Number(media.ppd) : null,
            };
          }),
      }));
      setEditando(false);
    } catch {
      setMensaje({ tipo: "error", texto: t("perfil.errorConexion") });
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) return <p className="chronicle-status">{t("perfil.cargando")}</p>;

  if (!editando) {
    return (
      <div className="perfil-resumen">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={t("perfil.tuFoto")}
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
              {t("perfil.editarPerfil")}
            </button>
          </div>
        </div>
        <MediasFabricante idsFabricantes={perfil.idsFabricantes} />
        <AceroJugador jugadorId={perfil.id} token={token()} />
        <AvisosPush />
        <AvisosTelegram />
        <SelectorIdiomaAvisos perfil={perfil} token={token} onGuardado={setPerfil} />
        <PinPartidas tienePin={perfil.tienePinPartidas} />
      </div>
    );
  }

  return (
    <>
    <form onSubmit={guardar}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={t("perfil.tuFoto")}
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }}
        />
      )}
      <label>
        {t("perfil.nombre")}
        <input value={perfil.nombre} disabled />
      </label>
      <label>
        {t("perfil.email")}
        <input value={perfil.email} disabled />
      </label>
      <label>
        {t("perfil.rol")}
        <input value={perfil.rol} disabled />
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
      <label>
        {t("perfil.sobreTiLabel")}
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t("perfil.sobreTiPlaceholder")} />
      </label>

      {fabricantes.length > 0 && (
        <fieldset style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1rem" }}>
          <legend style={{ padding: "0 .4rem" }}>{t("perfil.aliasFabricante")}</legend>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            {t("perfil.aliasHint")}
          </p>
          {fabricantes.map((f) => {
            const guardado = (perfil.idsFabricantes || []).find((i) => i.fabricanteId === f.id);
            const alias = idsFabricantes[f.id] || "";
            const nombreFab = f.nombre.toLowerCase();
            const esBullshooter = nombreFab.includes("bullshooter");
            const esConnection = nombreFab.includes("connection");
            const esRadikal = nombreFab.includes("radikal");
            const enlace =
              f.urlPerfilPlantilla && alias.trim()
                ? f.urlPerfilPlantilla.replace("{alias}", encodeURIComponent(alias.trim()))
                : null;
            return (
              <label key={f.id}>
                <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  {f.logoUrl && (
                    <img
                      src={f.logoUrl}
                      alt=""
                      style={{ width: 20, height: 20, objectFit: "contain", background: "#fff", borderRadius: 3 }}
                    />
                  )}
                  {f.nombre}
                </span>
                <input
                  value={alias}
                  onChange={(e) => cambiarIdFabricante(f.id, e.target.value)}
                  placeholder={t("perfil.aliasPlaceholder").replace("{fabricante}", f.nombre)}
                />
                {/* Radikal Darts no tiene buscador general de jugadores: hace falta
                    además el nombre de un torneo/liga/campeonato en el que hayas
                    participado, para poder localizarte en su clasificación (ver
                    notaBusqueda) y entrar en tu ficha de jugador a leer tu media real. */}
                {esRadikal && (
                  <input
                    value={notasFabricantes[f.id] || ""}
                    onChange={(e) => cambiarNotaFabricante(f.id, e.target.value)}
                    placeholder={t("perfil.notaRadikalPlaceholder")}
                    style={{ marginTop: ".3rem" }}
                  />
                )}
                {/* La web de Radikal Darts bloquea en silencio los intentos de login
                    automático (ver el error en el panel de admin), así que de
                    momento su media no se puede consultar sola: se escribe a mano
                    aquí, tal como aparece en tu perfil de radikalplayers.com. */}
                {esRadikal && (
                  <span style={{ display: "flex", gap: ".5rem", marginTop: ".3rem" }}>
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={mediasFabricantes[f.id]?.mpr ?? ""}
                      onChange={(e) => cambiarMediaFabricante(f.id, "mpr", e.target.value)}
                      placeholder={t("perfil.mprRadikalPlaceholder")}
                    />
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={mediasFabricantes[f.id]?.ppd ?? ""}
                      onChange={(e) => cambiarMediaFabricante(f.id, "ppd", e.target.value)}
                      placeholder={t("perfil.ppdRadikalPlaceholder")}
                    />
                  </span>
                )}
                {esRadikal && (
                  <span style={{ display: "block", fontSize: ".75em", opacity: 0.7, marginTop: ".2rem" }}>
                    {t("perfil.radikalManualHint")}
                  </span>
                )}
                {/* Bullshooter no tiene scraping automático: aquí solo tiene sentido el
                    enlace de salida, no un MPR/PPD que nunca se va a rellenar solo.
                    Radikal ya tiene sus propios inputs editables arriba, así que este
                    resumen de solo lectura sería redundante para él. */}
                {guardado && !esBullshooter && !esConnection && !esRadikal && (
                  <span style={{ display: "block", fontSize: ".8em", opacity: .85 }}>
                    {t("mediasFab.stats").replace("{mpr}", Number(guardado.mpr ?? 0).toFixed(2)).replace("{ppd}", Number(guardado.ppd ?? 0).toFixed(2))}
                  </span>
                )}
                {/* Connection distingue media Virtual y Presencial, cada una con su
                    propio MPR/PPD. */}
                {guardado && esConnection && (
                  <span style={{ display: "block", fontSize: ".8em", opacity: .85 }}>
                    {t("mediasFab.virtual").replace("{mpr}", Number(guardado.mprVirtual ?? 0).toFixed(2)).replace("{ppd}", Number(guardado.ppdVirtual ?? 0).toFixed(2))}
                    <br />
                    {t("mediasFab.presencial").replace("{mpr}", Number(guardado.mprPresencial ?? 0).toFixed(2)).replace("{ppd}", Number(guardado.ppdPresencial ?? 0).toFixed(2))}
                  </span>
                )}
                {enlace && (
                  <a href={enlace} target="_blank" rel="noreferrer" style={{ fontSize: ".85em" }}>
                    {t("perfil.verMediaEn").replace("{fabricante}", f.nombre)}
                  </a>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      <div style={{ display: "flex", gap: ".6rem" }}>
        <button type="submit" disabled={guardando}>{guardando ? t("perfil.guardando") : t("perfil.guardarPerfil")}</button>
        <button
          type="button"
          className="admin-link-btn"
          onClick={() => {
            restaurarDesdePerfil(perfil);
            setMensaje(null);
            setEditando(false);
          }}
        >
          {t("tablon.cancelar")}
        </button>
      </div>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      <CambioPasswordVoluntario />
      <AvisosPush />
      <AvisosTelegram />
      <SelectorIdiomaAvisos perfil={perfil} token={token} onGuardado={setPerfil} />
      </>
    );
  }
function CambioPasswordVoluntario() {
  const { t } = useLang();
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
        setMensaje({ tipo: "error", texto: data.error || t("password.noSePudo") });
        return;
      }
      setMensaje({ tipo: "ok", texto: t("password.actualizada") });
      setPasswordActual("");
      setPasswordNueva("");
    } catch {
      setMensaje({ tipo: "error", texto: t("perfil.errorConexion") });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? t("password.ocultar") : t("password.cambiarMi")}
      </button>
      {abierto && (
        <form onSubmit={guardar} style={{ marginTop: ".8rem" }}>
          <label>
            {t("password.actual")}
            <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required />
          </label>
          <label>
            {t("password.nueva")}
            <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required minLength={6} />
          </label>
          <button type="submit" disabled={enviando}>{enviando ? t("perfil.guardando") : t("password.cambiar")}</button>
          {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
        </form>
      )}
    </div>
  );
}

// Activa/desactiva los avisos por Web Push en ESTE dispositivo (móvil u
// ordenador concreto): un socio puede tenerlos activados en varios a la
// vez, cada uno con su propia suscripción. No hace falta ningún check-in
// aparte: al pulsar "Activar", el dispositivo queda vinculado directamente
// a este jugador a través de la sesión ya iniciada.
// Deja todo listo para que el propio navegador pueda recuperar los avisos en
// segundo plano si la suscripción se pierde sola (ver
// notificaciones-se-desactivan-solas-2026-09-22.md): guarda en IndexedDB el
// token permanente de re-suscripción (el service worker no tiene acceso a
// localStorage) y registra la revisión periódica. Se llama cada vez que se
// confirma que este dispositivo tiene los avisos activos — no pasa nada si
// se repite, ambos pasos son idempotentes. Todo dentro de try/catch: si el
// navegador no soporta algo de esto (Periodic Background Sync es solo
// Chrome/Android) o falla, los avisos siguen funcionando igual, simplemente
// sin este respaldo automático.
async function asegurarRespaldoResuscripcion(registro) {
  try {
    const resToken = await fetch(`${API_URL}/api/notificaciones/push/token-resuscripcion`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("socioToken")}` },
    });
    if (resToken.ok) {
      const { token } = await resToken.json();
      await window.guardarTokenResuscripcionPush(token);
    }
  } catch {
    // Sin respaldo por esta vez; se puede volver a intentar en la próxima
    // carga de "Mi perfil".
  }

  try {
    if (!("periodicSync" in registro)) return;
    const estadoPermiso = await navigator.permissions.query({ name: "periodic-background-sync" });
    if (estadoPermiso.state !== "granted") return;
    await registro.periodicSync.register("revisar-suscripcion-push", {
      minInterval: 20 * 60 * 60 * 1000, // ~20h de orientación; el navegador decide el intervalo real
    });
  } catch {
    // API no soportada (p.ej. iPhone) o permiso denegado: sin respaldo
    // automático, queda el aviso por Telegram como red de seguridad.
  }
}

function AvisosPush() {
  const { t } = useLang();
  const [soportado, setSoportado] = useState(true);
  const [esIOSSinInstalar, setEsIOSSinInstalar] = useState(false);
  const [activadoAqui, setActivadoAqui] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSoportado(false);
      setCargando(false);
      return;
    }
    const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const enStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
    if (esIOS && !enStandalone) {
      setEsIOSSinInstalar(true);
      setCargando(false);
      return;
    }
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(async (registro) => {
        const sub = await registro.pushManager.getSubscription();
        if (sub) {
          setActivadoAqui(true);
          asegurarRespaldoResuscripcion(registro);
          return;
        }
        // La suscripción se puede perder sola con el tiempo (el navegador la
        // invalida sin avisar a la web ni al servidor — es lo que hace que
        // los avisos "se desactiven solos"). Si el permiso de notificaciones
        // del navegador sigue concedido, no hace falta pedirlo otra vez: se
        // puede volver a suscribir en silencio y re-registrar el endpoint
        // nuevo en el servidor sin que el socio tenga que tocar nada. Si el
        // propio permiso también se perdió, esto no puede hacer nada y se
        // queda como desactivado (hace falta el botón de activar).
        if (Notification.permission !== "granted") {
          setActivadoAqui(false);
          return;
        }
        try {
          const resClave = await fetch(`${API_URL}/api/notificaciones/vapid-public-key`);
          if (!resClave.ok) throw new Error("sin clave");
          const { publicKey } = await resClave.json();
          const nuevaSuscripcion = await registro.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: claveVapidABytes(publicKey),
          });
          const datos = nuevaSuscripcion.toJSON();
          const res = await fetch(`${API_URL}/api/notificaciones/push/suscribir`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("socioToken")}` },
            body: JSON.stringify({ endpoint: datos.endpoint, keys: datos.keys }),
          });
          setActivadoAqui(res.ok);
          if (res.ok) asegurarRespaldoResuscripcion(registro);
        } catch {
          setActivadoAqui(false);
        }
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function activar() {
    setProcesando(true);
    setMensaje(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setMensaje({ tipo: "error", texto: t("avisosPush.sinPermiso") });
        return;
      }
      const resClave = await fetch(`${API_URL}/api/notificaciones/vapid-public-key`);
      if (!resClave.ok) {
        setMensaje({ tipo: "error", texto: t("avisosPush.sinConfigurar") });
        return;
      }
      const { publicKey } = await resClave.json();
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: claveVapidABytes(publicKey),
      });
      const datos = suscripcion.toJSON();
      const res = await fetch(`${API_URL}/api/notificaciones/push/suscribir`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("socioToken")}` },
        body: JSON.stringify({ endpoint: datos.endpoint, keys: datos.keys }),
      });
      if (!res.ok) {
        setMensaje({ tipo: "error", texto: t("avisosPush.noActivoServidor") });
        return;
      }
      setActivadoAqui(true);
      setMensaje({ tipo: "ok", texto: t("avisosPush.activados") });
      asegurarRespaldoResuscripcion(registro);
    } catch {
      setMensaje({ tipo: "error", texto: t("avisosPush.noPudoActivar") });
    } finally {
      setProcesando(false);
    }
  }

  async function desactivar() {
    setProcesando(true);
    setMensaje(null);
    try {
      const registro = await navigator.serviceWorker.ready;
      const suscripcion = await registro.pushManager.getSubscription();
      if (suscripcion) {
        await fetch(`${API_URL}/api/notificaciones/push/suscribir`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("socioToken")}` },
          body: JSON.stringify({ endpoint: suscripcion.endpoint }),
        });
        await suscripcion.unsubscribe();
      }
      setActivadoAqui(false);
      setMensaje({ tipo: "ok", texto: t("avisosPush.desactivados") });
    } catch {
      setMensaje({ tipo: "error", texto: t("avisosPush.noPudoDesactivar") });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <strong style={{ display: "block", marginBottom: ".4rem" }}>{t("avisosPush.titulo")}</strong>
      {!soportado && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          {t("avisosPush.noSoportado")}
        </p>
      )}
      {esIOSSinInstalar && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          {t("avisosPush.iosParte1")}
          <span aria-hidden="true"> ⬆️ </span>
          {t("avisosPush.iosParte2")}
        </p>
      )}
      {soportado && !esIOSSinInstalar && !cargando && (
        <>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            {activadoAqui
              ? t("avisosPush.activadoTexto")
              : t("avisosPush.desactivadoTexto")}
          </p>
          <button type="button" className="admin-link-btn" disabled={procesando} onClick={activadoAqui ? desactivar : activar}>
            {procesando ? t("avisosPush.unMomento") : activadoAqui ? t("avisosPush.desactivarAqui") : t("avisosPush.activarAqui")}
          </button>
        </>
      )}
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </div>
  );
}

// Idioma en el que este socio quiere recibir sus avisos de partidos (Web
// Push/Telegram) — independiente del idioma de navegación de la web (ese es
// solo de UI, por localStorage). Ver Jugador.idiomaAvisos en schema.prisma.
// Solo tiene efecto en los avisos automáticos que llevan texto por idioma
// (entrada en el cuadro, partido en curso/programado, eliminado, campeón);
// los avisos de texto libre (tablón, etc.) siguen llegando en el idioma en
// el que los escribe el admin, sea cual sea.
const IDIOMAS_AVISOS = [
  { id: "es", etiqueta: "Castellano" },
  { id: "eu", etiqueta: "Euskara" },
  { id: "fr", etiqueta: "Français" },
];

function SelectorIdiomaAvisos({ perfil, token, onGuardado }) {
  const { t } = useLang();
  const [guardando, setGuardando] = useState(false);

  async function cambiar(idioma) {
    if (idioma === perfil.idiomaAvisos || guardando) return;
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/perfil`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ idiomaAvisos: idioma }),
      });
      if (res.ok) onGuardado((prev) => ({ ...prev, idiomaAvisos: idioma }));
    } catch {
      // No crítico: si falla, se queda con el idioma anterior y puede
      // volver a intentarlo.
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <strong style={{ display: "block", marginBottom: ".4rem" }}>{t("avisosIdioma.titulo")}</strong>
      <div className="nav-lang" style={{ justifyContent: "flex-start" }}>
        {IDIOMAS_AVISOS.map((op, i) => (
          <span key={op.id} style={{ display: "contents" }}>
            {i > 0 && <span>/</span>}
            <button
              type="button"
              className={(perfil.idiomaAvisos || "es") === op.id ? "nav-lang-activo" : ""}
              disabled={guardando}
              onClick={() => cambiar(op.id)}
            >
              {op.etiqueta}
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// Alternativa a los avisos del navegador (AvisosPush): activar los avisos
// por Telegram desde la propia cuenta, sin depender de que un admin genere
// el enlace a mano (eso solo estaba disponible para invitados, ver
// AdminJugadores.jsx). Sobre todo útil en iPhone, donde Safari no siempre
// puede mostrar la imagen grande de los avisos — Telegram sí la muestra
// siempre, al ser una app nativa.
function AvisosTelegram() {
  const { t } = useLang();
  const [estado, setEstado] = useState(null); // null mientras carga
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/notificaciones/telegram/estado`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("socioToken")}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setEstado)
      .catch(() => setError(true));
  }, []);

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <strong style={{ display: "block", marginBottom: ".4rem" }}>{t("avisosTelegram.titulo")}</strong>

      {error && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          {t("avisosTelegram.errorEstado")}
        </p>
      )}
      {!error && !estado && <p className="admin-hint" style={{ marginTop: 0 }}>{t("avisosTelegram.comprobando")}</p>}

      {estado?.telegramVinculado && (
        <p className="admin-msg admin-msg-ok">{t("avisosTelegram.yaActivado")}</p>
      )}

      {estado && !estado.telegramVinculado && estado.urlTelegram && (
        <>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            {t("avisosTelegram.alternativaHint")}
          </p>
          <a href={estado.urlTelegram} target="_blank" rel="noreferrer">
            <button type="button" className="admin-link-btn">{t("avisosTelegram.activar")}</button>
          </a>
        </>
      )}

      {estado && !estado.telegramVinculado && !estado.urlTelegram && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          {t("avisosTelegram.sinConfigurar")}
        </p>
      )}
    </div>
  );
}

// PIN de 4 dígitos para identificarse en la página pública de un torneo/liga
// al jugar un partido con la herramienta de marcador (dispositivo compartido
// junto a la diana) — nada que ver con la contraseña de la cuenta. El admin
// también puede ponerlo/cambiarlo desde "Jugadores del club" (ver
// AdminJugadores.jsx), por si a alguien se le olvida.
function PinPartidas({ tienePin }) {
  const { t } = useLang();
  const [editando, setEditando] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [yaPuesto, setYaPuesto] = useState(!!tienePin);
  const [mensaje, setMensaje] = useState(null);

  function cancelar() {
    setEditando(false);
    setPin("");
    setConfirmarPin("");
    setMensaje(null);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setMensaje({ tipo: "error", texto: t("pin.debeSer4") });
      return;
    }
    if (pin !== confirmarPin) {
      setMensaje({ tipo: "error", texto: t("pin.noCoinciden") });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`${API_URL}/api/perfil/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("socioToken")}` },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMensaje({ tipo: "error", texto: data.error || t("pin.noSeGuardo") });
        return;
      }
      setYaPuesto(true);
      setEditando(false);
      setPin("");
      setConfirmarPin("");
      setMensaje({ tipo: "ok", texto: t("pin.actualizado") });
    } catch {
      setMensaje({ tipo: "error", texto: t("perfil.errorConexion") });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <strong style={{ display: "block", marginBottom: ".4rem" }}>{t("pin.titulo")}</strong>
      <p className="admin-hint" style={{ marginTop: 0 }}>
        {t("pin.hint")}
      </p>
      {!editando ? (
        <button type="button" className="admin-link-btn" onClick={() => setEditando(true)}>
          {yaPuesto ? t("pin.cambiar") : t("pin.crear")}
        </button>
      ) : (
        <form onSubmit={guardar} className="admin-inline-form">
          <label>
            {t("pin.nuevoLabel")}
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
            />
          </label>
          <label>
            {t("pin.repiteLabel")}
            <input
              value={confirmarPin}
              onChange={(e) => setConfirmarPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
            />
          </label>
          <button type="submit" disabled={guardando || pin.length !== 4}>{guardando ? t("perfil.guardando") : t("pin.guardar")}</button>
          <button type="button" className="admin-link-btn" onClick={cancelar}>{t("tablon.cancelar")}</button>
        </form>
      )}
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </div>
  );
}
