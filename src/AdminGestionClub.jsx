// Gestión del club (panel de admin). De momento, una sola sección:
// Inscripciones — la "hoja" de quién se apunta a cada torneo/liga del club,
// si ha pagado (cada jugador por su lado, también en parejas), cómo y
// cuánto, y si ha confirmado que viene. Ver src/routes/inscripcionesClub.js
// en el backend. Nadie entra al torneo/liga hasta pulsar "Añadir", y solo
// si la fila está confirmada y pagada por completo. Al terminar el torneo,
// se exporta (si se quiere) y se vacía con el reset: no se guarda historial.
import { useEffect, useRef, useState } from "react";
import { API_URL } from "./config.js";
import { etiquetaJugador, coincideJugador, normalizarBusqueda } from "./buscarJugador.js";

const ETIQUETAS_PAGO = { efectivo: "Efectivo", bizum: "Bizum", transferencia: "Transferencia", tarjeta: "Tarjeta", otro: "Otro" };
const ETIQUETAS_MODALIDAD = { individual: "individual", parejas_hechas: "parejas", parejas_ciegas: "parejas ciegas" };
// Cada cuánto se recarga la hoja sola, para ver lo que apuntan otros admins
// sin tener que refrescar (solo con la pestaña visible).
const REFRESCO_MS = 15000;

const FILTROS_ESTADO = [
  { id: "todas", etiqueta: "Todas" },
  { id: "sin-pagar", etiqueta: "Pendientes de pago" },
  { id: "sin-confirmar", etiqueta: "Sin confirmar" },
  { id: "listas", etiqueta: "Listas para añadir" },
  { id: "anadidas", etiqueta: "Ya añadidas" },
];

function nombreFila(i) {
  return i.nombre2 ? `${i.nombre1} / ${i.nombre2}` : i.nombre1;
}

// Confirmada, pagada por todos sus jugadores y todavía sin añadir (misma
// regla que inscripcionLista en el backend).
function estaLista(i) {
  return !i.anadidoEn && i.confirmado && i.pagado1 && (!i.nombre2 || i.pagado2);
}

function claveCompeticion(i) {
  if (i.torneoClubId) return `t:${i.torneoClubId}`;
  if (i.ligaId) return `l:${i.ligaId}`;
  return "";
}

function euros(n) {
  return (n || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

function cantidadTexto(n) {
  return n == null ? "" : String(n).replace(".", ",");
}

// Jugadores de una fila como lista [{ n, nombre, jugadorId, pagado, modoPago, cantidad }].
function ladosDe(i) {
  const lados = [{ n: 1, nombre: i.nombre1, jugadorId: i.jugador1Id, pagado: i.pagado1, modoPago: i.modoPago1, cantidad: i.cantidad1 }];
  if (i.nombre2) lados.push({ n: 2, nombre: i.nombre2, jugadorId: i.jugador2Id, pagado: i.pagado2, modoPago: i.modoPago2, cantidad: i.cantidad2 });
  return lados;
}

export default function AdminGestionClub({ token, salir }) {
  return (
    <div className="gestion-club">
      <h2 className="gestion-club-titulo">Inscripciones a torneos y ligas</h2>
      <InscripcionesClub token={token} salir={salir} />
    </div>
  );
}

function InscripcionesClub({ token, salir }) {
  const [datos, setDatos] = useState(null); // { inscripciones, torneos, ligas, modosPago }
  const [jugadores, setJugadores] = useState([]);
  const [filtroComp, setFiltroComp] = useState(""); // "" = todas, "sin" = sin asignar, "t:id", "l:id"
  const [filtroEstado, setFiltroEstado] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  async function api(ruta, { method = "GET", body } = {}) {
    const res = await fetch(`${API_URL}/api/inscripciones-club${ruta}`, {
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
    const { data } = await api("");
    if (data) setDatos(data);
  }

  function cargarJugadores() {
    fetch(`${API_URL}/api/jugadores`, { headers: { "x-admin-token": token } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {});
  }

  useEffect(() => {
    cargar();
    cargarJugadores();
    const refrescar = () => document.visibilityState === "visible" && cargar();
    const intervalo = setInterval(refrescar, REFRESCO_MS);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, []);

  function reemplazarFila(fila) {
    setDatos((d) => ({ ...d, inscripciones: d.inscripciones.map((i) => (i.id === fila.id ? fila : i)) }));
  }

  // Guardado celda a celda: se pinta el cambio al momento y se corrige con
  // lo que devuelva el servidor (o se recarga si falla).
  async function guardar(id, cambios) {
    setDatos((d) => ({ ...d, inscripciones: d.inscripciones.map((i) => (i.id === id ? { ...i, ...cambios } : i)) }));
    const { data, error } = await api(`/${id}`, { method: "PUT", body: cambios });
    if (error) {
      setMensaje({ tipo: "error", texto: error });
      cargar();
    } else reemplazarFila(data);
  }

  async function crear(body) {
    setMensaje(null);
    const { data, error } = await api("", { method: "POST", body });
    if (error) return error;
    setDatos((d) => ({ ...d, inscripciones: [...d.inscripciones, data] }));
    if (body.ficha1 || body.ficha2) cargarJugadores();
    return null;
  }

  async function borrar(i) {
    if (!confirm(`¿Borrar la inscripción de "${nombreFila(i)}"?${i.anadidoEn ? " (No se quita del torneo/liga.)" : ""}`)) return;
    setDatos((d) => ({ ...d, inscripciones: d.inscripciones.filter((x) => x.id !== i.id) }));
    const { error } = await api(`/${i.id}`, { method: "DELETE" });
    if (error) setMensaje({ tipo: "error", texto: error });
  }

  async function crearFicha(i, lado, tipo) {
    const { data, error } = await api(`/${i.id}/ficha`, { method: "POST", body: { lado, tipo } });
    if (error) return setMensaje({ tipo: "error", texto: error });
    reemplazarFila(data);
    cargarJugadores();
  }

  async function anadir(i) {
    setMensaje(null);
    const { data, error } = await api(`/${i.id}/anadir`, { method: "POST" });
    if (error) return setMensaje({ tipo: "error", texto: `${nombreFila(i)}: ${error}` });
    reemplazarFila(data);
    setMensaje({ tipo: "ok", texto: `"${nombreFila(i)}" añadido a ${data.torneoClub?.nombre || data.liga?.nombre}.` });
  }

  async function desmarcarAnadida(i) {
    if (!confirm(`¿Quitar la marca de "añadida" a "${nombreFila(i)}"? No lo quita del torneo/liga: hazlo solo si ya lo has quitado de allí a mano y quieres poder volver a añadirlo.`)) return;
    guardar(i.id, { anadido: false, anadidoEn: null });
  }

  const competicionFiltrada = filtroComp.startsWith("t:") || filtroComp.startsWith("l:") ? filtroComp : null;
  const nombreCompeticion = (clave) => {
    if (!datos || !clave) return "";
    const [tipo, id] = clave.split(":");
    const lista = tipo === "t" ? datos.torneos : datos.ligas;
    const c = lista.find((x) => x.id === id);
    if (c) return c.nombre;
    const i = datos.inscripciones.find((x) => claveCompeticion(x) === clave);
    return (tipo === "t" ? i?.torneoClub?.nombre : i?.liga?.nombre) || "";
  };

  async function anadirListas() {
    const ambito = competicionFiltrada ? `de "${nombreCompeticion(competicionFiltrada)}"` : "de todos los torneos y ligas";
    if (!confirm(`¿Añadir todas las inscripciones listas (confirmadas y pagadas) ${ambito}?`)) return;
    setOcupado(true);
    setMensaje(null);
    const body = competicionFiltrada
      ? { [competicionFiltrada.startsWith("t:") ? "torneoClubId" : "ligaId"]: competicionFiltrada.slice(2) }
      : {};
    const { data, error } = await api("/anadir-listas", { method: "POST", body });
    setOcupado(false);
    await cargar();
    if (error) return setMensaje({ tipo: "error", texto: error });
    const partes = [`${data.anadidas} añadida${data.anadidas === 1 ? "" : "s"}.`];
    if (data.errores.length) partes.push(`No se pudieron añadir: ${data.errores.map((e) => `${e.nombre} (${e.error})`).join("; ")}`);
    setMensaje({ tipo: data.errores.length ? "error" : "ok", texto: partes.join(" ") });
  }

  async function vaciar(todo) {
    const nombre = competicionFiltrada ? nombreCompeticion(competicionFiltrada) : "";
    const pregunta = todo
      ? "¿Vaciar TODAS las inscripciones de todos los torneos y ligas?"
      : `¿Vaciar las inscripciones de "${nombre}"?`;
    if (!confirm(`${pregunta}\n\nSolo se borra esta hoja: los jugadores ya añadidos al torneo/liga y las fichas creadas se quedan. No se puede deshacer.`)) return;
    if (confirm("¿Quieres descargar antes una copia (CSV para Excel)?")) {
      exportarCsv(todo ? datos.inscripciones : datos.inscripciones.filter((i) => claveCompeticion(i) === competicionFiltrada));
    }
    if (todo && (prompt('Para confirmar, escribe RESET') || "").trim().toUpperCase() !== "RESET") return;
    setOcupado(true);
    const query = todo
      ? "?todo=1"
      : `?${competicionFiltrada.startsWith("t:") ? "torneoClubId" : "ligaId"}=${encodeURIComponent(competicionFiltrada.slice(2))}`;
    const { data, error } = await api(query, { method: "DELETE" });
    setOcupado(false);
    await cargar();
    setMensaje(error ? { tipo: "error", texto: error } : { tipo: "ok", texto: `Hoja vaciada (${data.borradas} inscripciones borradas).` });
  }

  // Una línea por jugador (el pago es por jugador), con su pareja al lado.
  function exportarCsv(filas) {
    const cabecera = ["Jugador", "Pareja", "Torneo/Liga", "Cuadrante/Grupo", "Pagado", "Modo de pago", "Cantidad", "Confirmado", "Añadido", "Notas"];
    const lineas = [cabecera];
    for (const i of filas) {
      for (const l of ladosDe(i)) {
        lineas.push([
          l.nombre,
          l.n === 1 ? i.nombre2 || "" : i.nombre1,
          i.torneoClub?.nombre || i.liga?.nombre || "",
          i.cuadrante?.nombre || (i.grupo ? `Grupo ${i.grupo}` : ""),
          l.pagado ? "Sí" : "No",
          ETIQUETAS_PAGO[l.modoPago] || "",
          cantidadTexto(l.cantidad),
          i.confirmado ? "Sí" : "No",
          i.anadidoEn ? "Sí" : "No",
          i.notas || "",
        ]);
      }
    }
    // ";" y BOM: es lo que abre bien Excel en castellano (coma decimal).
    const csv = lineas.map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscripciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!datos) return <p className="chronicle-status">Cargando inscripciones…</p>;

  const filtradas = datos.inscripciones.filter((i) => {
    if (filtroComp === "sin" && claveCompeticion(i)) return false;
    if (competicionFiltrada && claveCompeticion(i) !== competicionFiltrada) return false;
    if (filtroEstado === "sin-pagar" && ladosDe(i).every((l) => l.pagado)) return false;
    if (filtroEstado === "sin-confirmar" && i.confirmado) return false;
    if (filtroEstado === "listas" && !estaLista(i)) return false;
    if (filtroEstado === "anadidas" && !i.anadidoEn) return false;
    const t = normalizarBusqueda(busqueda);
    if (t && ![i.nombre1, i.nombre2, i.notas].some((x) => normalizarBusqueda(x).includes(t))) return false;
    return true;
  });

  // Competiciones que salen en el filtro: las activas y las que tengan
  // alguna inscripción (aunque ya estén terminadas).
  const opcionesCompeticion = [
    ...datos.torneos.map((t) => ({ clave: `t:${t.id}`, nombre: t.nombre, tipo: "t" })),
    ...datos.ligas.map((l) => ({ clave: `l:${l.id}`, nombre: l.nombre, tipo: "l" })),
  ];
  for (const i of datos.inscripciones) {
    const clave = claveCompeticion(i);
    if (clave && !opcionesCompeticion.some((o) => o.clave === clave)) {
      opcionesCompeticion.push({ clave, nombre: nombreCompeticion(clave), tipo: clave[0] });
    }
  }

  return (
    <>
      <NuevaInscripcion
        datos={datos}
        jugadores={jugadores}
        competicionInicial={competicionFiltrada || ""}
        onCrear={crear}
      />

      <div className="insc-barra">
        <select value={filtroComp} onChange={(e) => setFiltroComp(e.target.value)} aria-label="Filtrar por torneo o liga">
          <option value="">Todos los torneos y ligas</option>
          <option value="sin">Sin asignar</option>
          <SelectOpcionesCompeticion opciones={opcionesCompeticion} />
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} aria-label="Filtrar por estado">
          {FILTROS_ESTADO.map((f) => <option key={f.id} value={f.id}>{f.etiqueta}</option>)}
        </select>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Buscar nombre o nota…" />
      </div>

      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}

      {filtradas.length === 0 ? (
        <p className="chronicle-status">
          {datos.inscripciones.length === 0 ? "Todavía no hay inscripciones." : "Ninguna inscripción coincide con el filtro."}
        </p>
      ) : (
        <div className="insc-tabla-scroll">
          <table className="insc-tabla">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Torneo / Liga</th>
                <th>Cuadrante / Grupo</th>
                <th>Pagado</th>
                <th>Modo de pago</th>
                <th>Cantidad (€)</th>
                <th>Confirmado</th>
                <th>Notas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((i) => (
                <FilaInscripcion
                  key={i.id}
                  i={i}
                  datos={datos}
                  opcionesCompeticion={opcionesCompeticion}
                  onGuardar={(cambios) => guardar(i.id, cambios)}
                  onBorrar={() => borrar(i)}
                  onAnadir={() => anadir(i)}
                  onDesmarcar={() => desmarcarAnadida(i)}
                  onCrearFicha={(lado, tipo) => crearFicha(i, lado, tipo)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Totales filas={filtradas} />

      <div className="insc-acciones">
        <button type="button" className="admin-link-btn" disabled={ocupado} onClick={anadirListas}>
          ✓ Añadir todas las listas{competicionFiltrada ? ` de "${nombreCompeticion(competicionFiltrada)}"` : ""}
        </button>
        <button type="button" className="admin-link-btn" disabled={filtradas.length === 0} onClick={() => exportarCsv(filtradas)}>
          ⬇ Exportar CSV (Excel)
        </button>
        {competicionFiltrada && (
          <button type="button" className="admin-link-btn insc-peligro" disabled={ocupado} onClick={() => vaciar(false)}>
            Vaciar "{nombreCompeticion(competicionFiltrada)}"
          </button>
        )}
        <button type="button" className="admin-link-btn insc-peligro" disabled={ocupado || datos.inscripciones.length === 0} onClick={() => vaciar(true)}>
          Reset: vaciar todo
        </button>
      </div>
      <p className="admin-hint-bloque">
        "Añadir" mete al jugador (o pareja) en el cuadrante/liga elegido. Solo se puede con la asistencia confirmada y todos sus
        jugadores pagados. En torneos/ligas de parejas ciegas se cargan desde la lista del sorteo, con el botón "Traer inscritos".
        La hoja se recarga sola cada pocos segundos.
      </p>
    </>
  );
}

function SelectOpcionesCompeticion({ opciones }) {
  const torneos = opciones.filter((o) => o.tipo === "t");
  const ligas = opciones.filter((o) => o.tipo === "l");
  return (
    <>
      {torneos.length > 0 && (
        <optgroup label="Torneos">
          {torneos.map((o) => <option key={o.clave} value={o.clave}>{o.nombre}</option>)}
        </optgroup>
      )}
      {ligas.length > 0 && (
        <optgroup label="Ligas">
          {ligas.map((o) => <option key={o.clave} value={o.clave}>{o.nombre}</option>)}
        </optgroup>
      )}
    </>
  );
}

// Torneo o liga activos a partir de su clave ("t:id" / "l:id").
function competicionActiva(datos, clave) {
  if (!clave) return null;
  const [tipo, id] = clave.split(":");
  const c = (tipo === "t" ? datos.torneos : datos.ligas).find((x) => x.id === id);
  return c ? { ...c, tipo } : null;
}

// Cambios a mandar al elegir torneo/liga en un desplegable.
function cambiosCompeticion(clave) {
  if (clave.startsWith("t:")) return { torneoClubId: clave.slice(2), cuadranteId: null, ligaId: null, grupo: null };
  if (clave.startsWith("l:")) return { ligaId: clave.slice(2), grupo: null, torneoClubId: null, cuadranteId: null };
  return { torneoClubId: null, cuadranteId: null, ligaId: null, grupo: null };
}

// Desplegable de cuadrante (torneo) o grupo (liga con grupos).
function SelectSubdivision({ competicion, valor, onCambio, disabled }) {
  if (!competicion) return <span className="insc-vacio">—</span>;
  const opciones =
    competicion.tipo === "t"
      ? competicion.cuadrantes.map((c) => ({ value: c.id, label: c.nombre }))
      : competicion.grupos.map((g) => ({ value: g, label: `Grupo ${g}` }));
  if (opciones.length === 0) {
    return <span className="insc-vacio">{competicion.tipo === "t" ? "Sin cuadrantes" : "Sin grupos"}</span>;
  }
  return (
    <select value={valor || ""} onChange={(e) => onCambio(e.target.value || null)} disabled={disabled} aria-label="Cuadrante o grupo">
      <option value="">{competicion.tipo === "t" ? "— Cuadrante —" : "— Grupo —"}</option>
      {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// Texto que se guarda al salir del campo (o con Intro), no a cada tecla.
// Mientras se está escribiendo no lo pisa el refresco automático.
function CeldaTexto({ valor, onGuardar, placeholder, decimal, etiqueta }) {
  const [texto, setTexto] = useState(valor ?? "");
  const enfocado = useRef(false);
  useEffect(() => {
    if (!enfocado.current) setTexto(valor ?? "");
  }, [valor]);
  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : undefined}
      className={decimal ? "insc-cantidad" : undefined}
      value={texto}
      placeholder={placeholder}
      aria-label={etiqueta}
      onFocus={() => (enfocado.current = true)}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        enfocado.current = false;
        if (texto.trim() !== (valor ?? "")) onGuardar(texto.trim());
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}

function FilaInscripcion({ i, datos, opcionesCompeticion, onGuardar, onBorrar, onAnadir, onDesmarcar, onCrearFicha }) {
  const clave = claveCompeticion(i);
  const competicion = competicionActiva(datos, clave);
  const modalidad = competicion?.modalidad || i.torneoClub?.modalidad || i.liga?.modalidad;
  const lados = ladosDe(i);
  const anadida = !!i.anadidoEn;
  const lista = estaLista(i);

  let pendiente = null;
  if (!anadida && !lista) {
    if (!lados.every((l) => l.pagado)) pendiente = "Falta pago";
    else if (!i.confirmado) pendiente = "Falta confirmar";
  }
  const faltaDestino = !clave || (i.torneoClubId && !i.cuadranteId);

  return (
    <tr className={anadida ? "insc-fila-anadida" : lista ? "insc-fila-lista" : undefined}>
      <td data-label="Jugador">
        {lados.map((l) => (
          <div key={l.n} className="insc-sub insc-jugador">
            <span>{l.nombre}</span>
            {!l.jugadorId && (
              <select
                className="insc-ficha"
                value=""
                onChange={(e) => e.target.value && onCrearFicha(l.n, e.target.value)}
                aria-label={`Crear ficha para ${l.nombre}`}
                title="Este nombre se escribió a mano y no tiene ficha de jugador"
              >
                <option value="">sin ficha ▾</option>
                <option value="club">Crear ficha de jugador del club</option>
                <option value="invitado">Crear ficha de invitado (oculta)</option>
              </select>
            )}
          </div>
        ))}
      </td>
      <td data-label="Torneo / Liga">
        <select value={clave} onChange={(e) => onGuardar(cambiosCompeticion(e.target.value))} disabled={anadida} aria-label="Torneo o liga">
          <option value="">— Sin asignar —</option>
          <SelectOpcionesCompeticion opciones={opcionesCompeticion} />
        </select>
        {modalidad && <span className="insc-modalidad">{ETIQUETAS_MODALIDAD[modalidad]}</span>}
      </td>
      <td data-label="Cuadrante / Grupo">
        <SelectSubdivision
          competicion={competicion}
          valor={competicion?.tipo === "t" ? i.cuadranteId : i.grupo}
          disabled={anadida}
          onCambio={(v) => onGuardar(competicion.tipo === "t" ? { cuadranteId: v } : { grupo: v })}
        />
      </td>
      <td data-label="Pagado">
        {lados.map((l) => (
          <label key={l.n} className="insc-sub insc-check">
            <input type="checkbox" checked={l.pagado} onChange={(e) => onGuardar({ [`pagado${l.n}`]: e.target.checked })} />
            {lados.length > 1 && <span>{l.nombre}</span>}
          </label>
        ))}
      </td>
      <td data-label="Modo de pago">
        {lados.map((l) => (
          <div key={l.n} className="insc-sub">
            <select value={l.modoPago || ""} onChange={(e) => onGuardar({ [`modoPago${l.n}`]: e.target.value || null })} aria-label={`Modo de pago de ${l.nombre}`}>
              <option value="">—</option>
              {datos.modosPago.map((m) => <option key={m} value={m}>{ETIQUETAS_PAGO[m] || m}</option>)}
            </select>
          </div>
        ))}
      </td>
      <td data-label="Cantidad (€)">
        {lados.map((l) => (
          <div key={l.n} className="insc-sub">
            <CeldaTexto
              decimal
              valor={cantidadTexto(l.cantidad)}
              placeholder="0,00"
              etiqueta={`Cantidad de ${l.nombre}`}
              onGuardar={(v) => onGuardar({ [`cantidad${l.n}`]: v })}
            />
          </div>
        ))}
      </td>
      <td data-label="Confirmado">
        <label className="insc-check">
          <input type="checkbox" checked={i.confirmado} onChange={(e) => onGuardar({ confirmado: e.target.checked })} />
          <span className="insc-solo-movil">Asistencia confirmada</span>
        </label>
      </td>
      <td data-label="Notas">
        <CeldaTexto valor={i.notas || ""} placeholder="—" etiqueta="Notas" onGuardar={(v) => onGuardar({ notas: v })} />
      </td>
      <td data-label="Estado">
        <div className="insc-estado">
          {anadida ? (
            <>
              <span className="insc-ok">✓ Añadida</span>
              <button type="button" className="admin-link-btn" onClick={onDesmarcar} title="Quitar la marca de añadida">↺</button>
            </>
          ) : lista && modalidad === "parejas_ciegas" ? (
            <span className="insc-vacio">Lista · se carga desde el sorteo</span>
          ) : lista ? (
            <button type="button" className="insc-anadir" disabled={faltaDestino} onClick={onAnadir}
              title={faltaDestino ? "Elige antes el torneo/liga y el cuadrante" : undefined}>
              ＋ Añadir
            </button>
          ) : (
            <span className="insc-vacio">{pendiente}</span>
          )}
          <button type="button" className="admin-link-btn" onClick={onBorrar} aria-label={`Borrar inscripción de ${nombreFila(i)}`}>🗑</button>
        </div>
      </td>
    </tr>
  );
}

function Totales({ filas }) {
  let jugadores = 0;
  let recaudado = 0;
  let pendiente = 0;
  let sinPagar = 0;
  const porModo = {};
  for (const i of filas) {
    for (const l of ladosDe(i)) {
      jugadores++;
      if (l.pagado) {
        recaudado += l.cantidad || 0;
        const modo = ETIQUETAS_PAGO[l.modoPago] || "Sin indicar";
        porModo[modo] = (porModo[modo] || 0) + (l.cantidad || 0);
      } else {
        sinPagar++;
        pendiente += l.cantidad || 0;
      }
    }
  }
  const confirmadas = filas.filter((i) => i.confirmado).length;
  const listas = filas.filter(estaLista).length;
  const anadidas = filas.filter((i) => i.anadidoEn).length;
  return (
    <div className="insc-totales">
      <span><strong>{filas.length}</strong> inscripciones · <strong>{jugadores}</strong> jugadores</span>
      <span><strong>{confirmadas}</strong> confirmadas · <strong>{listas}</strong> listas · <strong>{anadidas}</strong> añadidas</span>
      <span>Recaudado: <strong>{euros(recaudado)}</strong></span>
      <span>Pendiente: <strong>{euros(pendiente)}</strong> ({sinPagar} sin pagar)</span>
      {Object.keys(porModo).length > 0 && (
        <span>{Object.entries(porModo).map(([m, c]) => `${m}: ${euros(c)}`).join(" · ")}</span>
      )}
    </div>
  );
}

// Campo de jugador del alta: se elige de la lista (con buscador del propio
// navegador) o se escribe a mano. Si es a mano, hay que decir si se le crea
// ficha (normal, de invitado oculta, o ninguna) — y si el nombre se parece
// a alguien de la lista, se sugiere, para no duplicar fichas.
function CampoJugador({ etiqueta, idLista, jugadores, valor, onCambio }) {
  const porEtiqueta = new Map(jugadores.map((j) => [etiquetaJugador(j), j]));
  const manual = valor.texto.trim() && !valor.jugadorId;
  const sugerencias = manual ? jugadores.filter((j) => coincideJugador(j, valor.texto)).slice(0, 4) : [];

  function escribir(texto) {
    const j = porEtiqueta.get(texto);
    onCambio({ texto, jugadorId: j?.id || null, ficha: j ? null : valor.ficha });
  }

  return (
    <div className="insc-campo-jugador">
      <label>
        {etiqueta}
        <input list={idLista} value={valor.texto} onChange={(e) => escribir(e.target.value)} placeholder="Elige de la lista o escribe un nombre" />
      </label>
      <datalist id={idLista}>
        {jugadores.map((j) => <option key={j.id} value={etiquetaJugador(j)} />)}
      </datalist>
      {valor.jugadorId && <span className="insc-ok">✓ Jugador del club</span>}
      {manual && (
        <div className="insc-manual">
          {sugerencias.length > 0 && (
            <p className="admin-hint" style={{ margin: 0 }}>
              ¿Querías decir…?{" "}
              {sugerencias.map((j) => (
                <button key={j.id} type="button" className="admin-link-btn" onClick={() => escribir(etiquetaJugador(j))}>
                  {etiquetaJugador(j)}
                </button>
              ))}
            </p>
          )}
          <fieldset className="insc-ficha-opciones">
            <legend>No está en la lista. ¿Crear ficha?</legend>
            {[
              ["no", "No, solo el nombre"],
              ["club", "Sí, jugador del club"],
              ["invitado", "Sí, invitado (ficha oculta)"],
            ].map(([v, texto]) => (
              <label key={v}>
                <input type="radio" name={`${idLista}-ficha`} checked={valor.ficha === v} onChange={() => onCambio({ ...valor, ficha: v })} />
                {texto}
              </label>
            ))}
          </fieldset>
        </div>
      )}
    </div>
  );
}

const JUGADOR_VACIO = { texto: "", jugadorId: null, ficha: null };

function NuevaInscripcion({ datos, jugadores, competicionInicial, onCrear }) {
  const [abierta, setAbierta] = useState(false);
  const [clave, setClave] = useState(competicionInicial);
  const [subdivision, setSubdivision] = useState("");
  const [esPareja, setEsPareja] = useState(false);
  const [j1, setJ1] = useState(JUGADOR_VACIO);
  const [j2, setJ2] = useState(JUGADOR_VACIO);
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierta) setClave(competicionInicial);
  }, [competicionInicial, abierta]);

  const competicion = competicionActiva(datos, clave);
  // Parejas ya formadas: siempre dos jugadores. Individual y parejas ciegas
  // (se sortean luego): uno. Sin torneo elegido: lo que diga el check.
  const conPareja = competicion ? competicion.modalidad === "parejas_hechas" : esPareja;
  const opciones = [
    ...datos.torneos.map((t) => ({ clave: `t:${t.id}`, nombre: t.nombre, tipo: "t" })),
    ...datos.ligas.map((l) => ({ clave: `l:${l.id}`, nombre: l.nombre, tipo: "l" })),
  ];

  function datosLado(j, n) {
    if (j.jugadorId) return { [`jugador${n}Id`]: j.jugadorId };
    return { [`nombre${n}`]: j.texto.trim(), ...(j.ficha && j.ficha !== "no" ? { [`ficha${n}`]: j.ficha } : {}) };
  }

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    const lados = conPareja ? [j1, j2] : [j1];
    if (lados.some((j) => !j.texto.trim())) return setError(conPareja ? "Faltan los dos jugadores de la pareja." : "Falta el jugador.");
    if (lados.some((j) => !j.jugadorId && !j.ficha)) return setError('Indica si quieres crear ficha para los nombres escritos a mano.');
    if (conPareja && j1.jugadorId && j1.jugadorId === j2.jugadorId) return setError("Los dos jugadores de la pareja son el mismo.");

    const body = { ...datosLado(j1, 1), ...(conPareja ? datosLado(j2, 2) : {}), notas, ...cambiosCompeticion(clave) };
    if (competicion?.tipo === "t") body.cuadranteId = subdivision || null;
    if (competicion?.tipo === "l") body.grupo = subdivision || null;

    setEnviando(true);
    const err = await onCrear(body);
    setEnviando(false);
    if (err) return setError(err);
    setJ1(JUGADOR_VACIO);
    setJ2(JUGADOR_VACIO);
    setNotas("");
  }

  if (!abierta) {
    return (
      <button type="button" className="insc-nueva-btn" onClick={() => setAbierta(true)}>
        ＋ Nueva inscripción
      </button>
    );
  }

  return (
    <form onSubmit={enviar} className="admin-form insc-form">
      <div className="insc-form-fila">
        <label>
          Torneo / Liga
          <select value={clave} onChange={(e) => { setClave(e.target.value); setSubdivision(""); }}>
            <option value="">— Sin asignar todavía —</option>
            <SelectOpcionesCompeticion opciones={opciones} />
          </select>
        </label>
        {competicion && (
          <label>
            {competicion.tipo === "t" ? "Cuadrante" : "Grupo"}
            <SelectSubdivision competicion={competicion} valor={subdivision} onCambio={(v) => setSubdivision(v || "")} />
          </label>
        )}
      </div>
      {competicion ? (
        <p className="admin-hint">Modalidad: {ETIQUETAS_MODALIDAD[competicion.modalidad]}{competicion.modalidad === "parejas_ciegas" ? " — cada jugador se inscribe por separado; las parejas se sortean luego." : ""}</p>
      ) : (
        <label className="insc-check">
          <input type="checkbox" checked={esPareja} onChange={(e) => setEsPareja(e.target.checked)} />
          Es una pareja
        </label>
      )}
      <div className="insc-form-fila">
        <CampoJugador etiqueta={conPareja ? "Jugador 1" : "Jugador"} idLista="insc-jugadores-1" jugadores={jugadores} valor={j1} onCambio={setJ1} />
        {conPareja && <CampoJugador etiqueta="Jugador 2" idLista="insc-jugadores-2" jugadores={jugadores} valor={j2} onCambio={setJ2} />}
      </div>
      <label>
        Notas (opcional)
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="p.ej. paga el viernes" />
      </label>
      <p className="admin-hint">El pago (por jugador), el modo, la cantidad y la confirmación se rellenan luego en la tabla.</p>
      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      <div className="insc-form-botones">
        <button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Añadir a la hoja"}</button>
        <button type="button" className="admin-link-btn" onClick={() => setAbierta(false)}>Cerrar</button>
      </div>
    </form>
  );
}
