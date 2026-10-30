// Botón "Traer inscritos" de la lista de jugadores disponibles (parejas) de
// un cuadrante o liga: carga en esa lista a los inscritos de la hoja de
// Gestión del club (AdminGestionClub.jsx) que ya están listos (asistencia
// confirmada y pagados). En parejas no se pueden añadir de uno en uno desde
// la hoja porque el participante es la pareja, que se forma o se sortea
// aquí; por eso, cuando eso se hace, se marcan como añadidos en la hoja con
// marcarInscritosAnadidos.
import { useState } from "react";
import { API_URL } from "./config.js";

// Marca como añadidas las inscripciones de estas entradas de la lista (las
// que vinieran de la hoja: llevan inscripcionId). Si falla, no pasa nada
// grave: solo queda la fila sin la marca en la hoja.
export function marcarInscritosAnadidos(token, entradas) {
  const ids = [...new Set(entradas.map((e) => e.inscripcionId).filter(Boolean))];
  if (ids.length === 0) return;
  fetch(`${API_URL}/api/inscripciones-club/marcar-anadidas`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": token },
    body: JSON.stringify({ ids }),
  }).catch(() => {});
}

// `filtro`: { cuadranteId } o { ligaId }. `excluir`: Set de jugadorIds que
// ya están en la lista o apuntados. `onTraer` recibe [{ jugadorId, nombre,
// inscripcionId }] con los que no estaban.
export default function TraerInscritos({ token, filtro, excluir, inscripcionesEnLista, onTraer }) {
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState(null);

  async function traer() {
    setCargando(true);
    setAviso(null);
    const query = new URLSearchParams(filtro).toString();
    const res = await fetch(`${API_URL}/api/inscripciones-club/listas?${query}`, { headers: { "x-admin-token": token } }).catch(() => null);
    setCargando(false);
    if (!res?.ok) return setAviso("No se pudieron cargar las inscripciones.");
    const filas = await res.json();
    const nuevos = [];
    for (const i of filas) {
      if (inscripcionesEnLista.has(i.id)) continue;
      const lados = [{ jugadorId: i.jugador1Id, nombre: i.nombre1 }];
      if (i.nombre2) lados.push({ jugadorId: i.jugador2Id, nombre: i.nombre2 });
      for (const l of lados) {
        if (l.jugadorId && excluir.has(l.jugadorId)) continue;
        nuevos.push({ jugadorId: l.jugadorId || null, nombre: l.nombre, inscripcionId: i.id });
      }
    }
    if (nuevos.length) onTraer(nuevos);
    setAviso(
      nuevos.length
        ? `${nuevos.length} jugador${nuevos.length === 1 ? "" : "es"} traído${nuevos.length === 1 ? "" : "s"} de las inscripciones.`
        : "No hay inscritos listos (confirmados y pagados) pendientes para aquí."
    );
  }

  return (
    <div style={{ margin: ".4rem 0 .6rem" }}>
      <button type="button" className="admin-link-btn" disabled={cargando} onClick={traer}>
        {cargando ? "Cargando…" : "📋 Traer inscritos listos (Gestión del club)"}
      </button>
      {aviso && <p className="admin-hint" style={{ margin: ".3rem 0 0" }}>{aviso}</p>}
    </div>
  );
}
