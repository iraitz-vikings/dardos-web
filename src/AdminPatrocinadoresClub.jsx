// Gestión del club → Patrocinadores: lista interna con lo que aporta cada
// patrocinador, si ya ha pagado y su logo. Es aparte de la pestaña
// "Patrocinadores" del admin (los logos que se publican en la web): aquí
// nada sale fuera del panel. Ver src/routes/patrocinadoresClub.js en el
// backend. Mismo estilo que la hoja de inscripciones: cada patrocinador es
// un desplegable con el nombre en rojo (sin pagar) o verde (pagado).
import { useEffect, useState } from "react";
import { API_URL } from "./config.js";
import useEstadoRecordado from "./useEstadoRecordado.js";
import { propsCabeceraDesplegable } from "./cabeceraDesplegable.js";
import SelectorImagen from "./SelectorImagen.jsx";
import CeldaTexto from "./CeldaTexto.jsx";

function euros(n) {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function cantidadTexto(n) {
  return n == null ? "" : String(n).replace(".", ",");
}

// Logo pequeño para la cabecera (versión reducida de Cloudinary).
function miniaturaLogo(url) {
  return url.includes("/upload/") ? url.replace("/upload/", "/upload/w_80,h_80,c_fit,q_auto,f_auto/") : url;
}

export default function AdminPatrocinadoresClub({ token, salir }) {
  const [lista, setLista] = useState(null);
  const [mensaje, setMensaje] = useState(null);
  const [abiertos, setAbiertos] = useEstadoRecordado("patrocinadores-club-abiertos", {});

  async function api(ruta, { method = "GET", body } = {}) {
    const res = await fetch(`${API_URL}/api/patrocinadores-club${ruta}`, {
      method,
      headers: { "x-admin-token": token, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      salir();
      return { error: "Contraseña incorrecta. Vuelve a entrar." };
    }
    const data = res.status === 204 ? null : await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.error || "No se pudo guardar." };
    return { data };
  }

  async function cargar() {
    const { data, error } = await api("");
    if (error) setMensaje({ tipo: "error", texto: error });
    else setLista(data);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function crear(body) {
    setMensaje(null);
    const { data, error } = await api("", { method: "POST", body });
    if (error) return error;
    setLista((l) => [...l, data]);
    setAbiertos((prev) => ({ ...prev, [data.id]: true }));
    return null;
  }

  async function guardar(id, cambios) {
    setLista((l) => l.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
    const { data, error } = await api(`/${id}`, { method: "PUT", body: cambios });
    if (error) {
      setMensaje({ tipo: "error", texto: error });
      cargar();
    } else setLista((l) => l.map((p) => (p.id === id ? data : p)));
  }

  async function borrar(p) {
    if (!confirm(`¿Borrar el patrocinador "${p.nombre}"?`)) return;
    setLista((l) => l.filter((x) => x.id !== p.id));
    const { error } = await api(`/${p.id}`, { method: "DELETE" });
    if (error) setMensaje({ tipo: "error", texto: error });
  }

  if (!lista) return <p className="chronicle-status">Cargando patrocinadores…</p>;

  const total = lista.reduce((s, p) => s + (p.cantidad || 0), 0);
  const cobrado = lista.filter((p) => p.pagado).reduce((s, p) => s + (p.cantidad || 0), 0);
  const sinPagar = lista.filter((p) => !p.pagado).length;

  return (
    <>
      <NuevoPatrocinador token={token} onCrear={crear} />

      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {lista.length === 0 ? (
        <p className="chronicle-status">Todavía no hay patrocinadores.</p>
      ) : (
        <div className="insc-grupo">
          <div className="insc-lista">
            {lista.map((p) => (
              <FilaPatrocinador
                key={p.id}
                p={p}
                token={token}
                abierto={!!abiertos[p.id]}
                onAlternar={() => setAbiertos((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                onGuardar={(cambios) => guardar(p.id, cambios)}
                onBorrar={() => borrar(p)}
                onError={(texto) => setMensaje({ tipo: "error", texto })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="insc-totales">
        <span><strong>{lista.length}</strong> patrocinador{lista.length === 1 ? "" : "es"}</span>
        <span>Total: <strong>{euros(total)}</strong></span>
        <span>Cobrado: <strong>{euros(cobrado)}</strong></span>
        <span>Pendiente: <strong>{euros(total - cobrado)}</strong> ({sinPagar} sin pagar)</span>
      </div>
      <p className="admin-hint-bloque">
        Lista interna: no se publica en la web. Los logos que salen en la web se gestionan en la pestaña "Patrocinadores" del panel.
      </p>
    </>
  );
}

function FilaPatrocinador({ p, token, abierto, onAlternar, onGuardar, onBorrar, onError }) {
  return (
    <div className="insc-item">
      <div className="insc-item-cabecera" {...propsCabeceraDesplegable(abierto, onAlternar)}>
        <span className="insc-item-nombres">
          <span aria-hidden="true">{abierto ? "▾" : "▸"}</span>
          {p.logoUrl && <img className="patro-club-mini" src={miniaturaLogo(p.logoUrl)} alt="" />}
          <span className={p.pagado ? "insc-nombre-pagado" : "insc-nombre-pendiente"} title={p.pagado ? "Ha pagado" : "Pendiente de pago"}>
            {p.nombre}
          </span>
        </span>
        <span className="insc-item-resumen">
          {p.cantidad != null && <span>{euros(p.cantidad)}</span>}
          {p.pagado ? <span className="insc-ok">Pagado</span> : <span className="insc-vacio">Sin pagar</span>}
        </span>
      </div>

      {abierto && (
        <div className="insc-detalle">
          <div className="insc-campos">
            <label className="insc-campo">
              <span>Nombre</span>
              <CeldaTexto valor={p.nombre} etiqueta="Nombre" onGuardar={(v) => v && onGuardar({ nombre: v })} />
            </label>
            <label className="insc-campo">
              <span>Cantidad (€)</span>
              <CeldaTexto decimal valor={cantidadTexto(p.cantidad)} placeholder="0,00" etiqueta="Cantidad" onGuardar={(v) => onGuardar({ cantidad: v })} />
            </label>
            <label className="insc-campo insc-check">
              <input type="checkbox" checked={p.pagado} onChange={(e) => onGuardar({ pagado: e.target.checked })} />
              Pagado
            </label>
          </div>
          <div className="patro-club-logo">
            <span className="insc-campo-titulo">Logo</span>
            <SelectorImagen token={token} valor={p.logoUrl || ""} onCambiar={(url) => onGuardar({ logoUrl: url || null })} onError={onError} etiqueta={`Logo de ${p.nombre}`} />
          </div>
          <div className="insc-estado">
            <button type="button" className="admin-link-btn insc-peligro" onClick={onBorrar}>🗑 Borrar patrocinador</button>
          </div>
        </div>
      )}
    </div>
  );
}

function NuevoPatrocinador({ token, onCrear }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [pagado, setPagado] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(e) {
    e.preventDefault();
    if (!nombre.trim()) return setError("Falta el nombre del patrocinador.");
    setEnviando(true);
    setError(null);
    const err = await onCrear({ nombre: nombre.trim(), cantidad, pagado, logoUrl: logoUrl || null });
    setEnviando(false);
    if (err) return setError(err);
    setNombre("");
    setCantidad("");
    setPagado(false);
    setLogoUrl("");
  }

  if (!abierto) {
    return (
      <button type="button" className="insc-nueva-btn" onClick={() => setAbierto(true)}>
        ＋ Nuevo patrocinador
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="admin-form insc-form">
      <div className="insc-form-fila">
        <label>
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="p.ej. Bar Txoko" />
        </label>
        <label>
          Cantidad (€)
          <input inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="0,00" />
        </label>
      </div>
      <label className="insc-check">
        <input type="checkbox" checked={pagado} onChange={(e) => setPagado(e.target.checked)} />
        Pagado
      </label>
      <div className="patro-club-logo">
        <span className="insc-campo-titulo">Logo (opcional)</span>
        <SelectorImagen token={token} valor={logoUrl} onCambiar={setLogoUrl} onError={setError} etiqueta="Logo del patrocinador" />
      </div>
      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      <div className="insc-form-botones">
        <button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Añadir patrocinador"}</button>
        <button type="button" className="admin-link-btn" onClick={() => setAbierto(false)}>Cerrar</button>
      </div>
    </form>
  );
}
