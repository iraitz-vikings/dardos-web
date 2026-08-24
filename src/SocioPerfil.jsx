import { useEffect, useState } from "react";
import MediasFabricante from "./MediasFabricante.jsx";

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
        setMensaje({ tipo: "error", texto: data.error || "No se pudo subir la foto." });
        return;
      }
      const data = await res.json();
      setAvatarUrl(data.url);
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión al subir la foto." });
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
        setMensaje({ tipo: "error", texto: "No se pudo guardar el perfil." });
        return;
      }
      setMensaje({ tipo: "ok", texto: "Perfil actualizado." });
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
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) return <p className="chronicle-status">Cargando tu perfil…</p>;

  if (!editando) {
    return (
      <div className="perfil-resumen">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Tu foto de perfil"
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
              Editar perfil
            </button>
          </div>
        </div>
        <MediasFabricante idsFabricantes={perfil.idsFabricantes} />
        <AvisosPush />
      </div>
    );
  }

  return (
    <>
    <form onSubmit={guardar}>
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt="Tu foto de perfil"
          style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", marginBottom: "1rem" }}
        />
      )}
      <label>
        Nombre
        <input value={perfil.nombre} disabled />
      </label>
      <label>
        Email
        <input value={perfil.email} disabled />
      </label>
      <label>
        Rol
        <input value={perfil.rol} disabled />
      </label>
      <label>
        Apodo (como quieres que te vean en torneos y ligas)
        <input value={apodo} onChange={(e) => setApodo(e.target.value)} placeholder="Ej: El Certero" />
      </label>
      <label>
        Foto de perfil
        <input type="file" accept="image/*" onChange={subirAvatar} disabled={subiendo} />
        {subiendo && <span className="admin-uploading">Subiendo…</span>}
      </label>
      <label>
        Sobre ti (opcional)
        <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Una frase, tu récord favorito, lo que quieras..." />
      </label>

      {fabricantes.length > 0 && (
        <fieldset style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1rem" }}>
          <legend style={{ padding: "0 .4rem" }}>Alias de fabricante</legend>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Si juegas en dianas de estos fabricantes, indica tu alias de jugador en cada una para poder
            consultar más adelante tu media en su web.
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
                  placeholder={`Tu alias en ${f.nombre}`}
                />
                {/* Radikal Darts no tiene buscador general de jugadores: hace falta
                    además el nombre de un torneo/liga/campeonato en el que hayas
                    participado, para poder localizarte en su clasificación (ver
                    notaBusqueda) y entrar en tu ficha de jugador a leer tu media real. */}
                {esRadikal && (
                  <input
                    value={notasFabricantes[f.id] || ""}
                    onChange={(e) => cambiarNotaFabricante(f.id, e.target.value)}
                    placeholder='Nombre de un torneo, liga o campeonato en el que hayas jugado (ej: "EL-033 Julio")'
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
                      placeholder="Tu MPR en Radikal Darts"
                    />
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={mediasFabricantes[f.id]?.ppd ?? ""}
                      onChange={(e) => cambiarMediaFabricante(f.id, "ppd", e.target.value)}
                      placeholder="Tu PPD en Radikal Darts"
                    />
                  </span>
                )}
                {esRadikal && (
                  <span style={{ display: "block", fontSize: ".75em", opacity: 0.7, marginTop: ".2rem" }}>
                    De momento Radikal Darts no se actualiza sola (su web bloquea el
                    login automático): escribe aquí tu MPR/PPD tal como aparece en tu
                    perfil de radikalplayers.com.
                  </span>
                )}
                {/* Bullshooter no tiene scraping automático: aquí solo tiene sentido el
                    enlace de salida, no un MPR/PPD que nunca se va a rellenar solo.
                    Radikal ya tiene sus propios inputs editables arriba, así que este
                    resumen de solo lectura sería redundante para él. */}
                {guardado && !esBullshooter && !esConnection && !esRadikal && (
                  <span style={{ display: "block", fontSize: ".8em", opacity: .85 }}>
                    MPR {Number(guardado.mpr ?? 0).toFixed(2)} · PPD {Number(guardado.ppd ?? 0).toFixed(2)}
                  </span>
                )}
                {/* Connection distingue media Virtual y Presencial, cada una con su
                    propio MPR/PPD. */}
                {guardado && esConnection && (
                  <span style={{ display: "block", fontSize: ".8em", opacity: .85 }}>
                    Virtual: MPR {Number(guardado.mprVirtual ?? 0).toFixed(2)} · PPD {Number(guardado.ppdVirtual ?? 0).toFixed(2)}
                    <br />
                    Presencial: MPR {Number(guardado.mprPresencial ?? 0).toFixed(2)} · PPD {Number(guardado.ppdPresencial ?? 0).toFixed(2)}
                  </span>
                )}
                {enlace && (
                  <a href={enlace} target="_blank" rel="noreferrer" style={{ fontSize: ".85em" }}>
                    Ver mi media en {f.nombre} ↗
                  </a>
                )}
              </label>
            );
          })}
        </fieldset>
      )}

      <div style={{ display: "flex", gap: ".6rem" }}>
        <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar perfil"}</button>
        <button
          type="button"
          className="admin-link-btn"
          onClick={() => {
            restaurarDesdePerfil(perfil);
            setMensaje(null);
            setEditando(false);
          }}
        >
          Cancelar
        </button>
      </div>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
      </form>

      <CambioPasswordVoluntario />
      <AvisosPush />
      </>
    );
  }
function CambioPasswordVoluntario() {
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
        setMensaje({ tipo: "error", texto: data.error || "No se pudo cambiar la contraseña." });
        return;
      }
      setMensaje({ tipo: "ok", texto: "Contraseña actualizada." });
      setPasswordActual("");
      setPasswordNueva("");
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <button type="button" className="admin-link-btn" onClick={() => setAbierto((a) => !a)}>
        {abierto ? "Ocultar" : "Cambiar mi contraseña"}
      </button>
      {abierto && (
        <form onSubmit={guardar} style={{ marginTop: ".8rem" }}>
          <label>
            Contraseña actual
            <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} required />
          </label>
          <label>
            Contraseña nueva
            <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} required minLength={6} />
          </label>
          <button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Cambiar contraseña"}</button>
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
function AvisosPush() {
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
      .then((registro) => registro.pushManager.getSubscription())
      .then((sub) => setActivadoAqui(!!sub))
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function activar() {
    setProcesando(true);
    setMensaje(null);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setMensaje({ tipo: "error", texto: "No has dado permiso para las notificaciones en el navegador." });
        return;
      }
      const resClave = await fetch(`${API_URL}/api/notificaciones/vapid-public-key`);
      if (!resClave.ok) {
        setMensaje({ tipo: "error", texto: "Los avisos todavía no están configurados en el servidor." });
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
        setMensaje({ tipo: "error", texto: "No se pudo activar el aviso en el servidor." });
        return;
      }
      setActivadoAqui(true);
      setMensaje({ tipo: "ok", texto: "Avisos activados en este dispositivo." });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron activar los avisos." });
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
      setMensaje({ tipo: "ok", texto: "Avisos desactivados en este dispositivo." });
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudieron desactivar los avisos." });
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <strong style={{ display: "block", marginBottom: ".4rem" }}>Avisos en este dispositivo</strong>
      {!soportado && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          Este navegador no admite notificaciones. Prueba desde Chrome, Firefox o Safari en tu móvil u ordenador.
        </p>
      )}
      {esIOSSinInstalar && (
        <p className="admin-hint" style={{ marginTop: 0 }}>
          En iPhone hay que instalar la web antes de poder activar los avisos: pulsa Compartir
          <span aria-hidden="true"> ⬆️ </span>
          y luego "Añadir a pantalla de inicio". Después vuelve aquí desde el icono que se crea.
        </p>
      )}
      {soportado && !esIOSSinInstalar && !cargando && (
        <>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            {activadoAqui
              ? "Recibirás aquí un aviso cuando tu capitán fije un partido, o cuando el club publique un anuncio con avisos."
              : "Actívalos para recibir un aviso cuando tu capitán fije un partido, o cuando el club publique un anuncio con avisos."}
          </p>
          <button type="button" className="admin-link-btn" disabled={procesando} onClick={activadoAqui ? desactivar : activar}>
            {procesando ? "Un momento…" : activadoAqui ? "Desactivar avisos aquí" : "Activar avisos en este dispositivo"}
          </button>
        </>
      )}
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </div>
  );
}
