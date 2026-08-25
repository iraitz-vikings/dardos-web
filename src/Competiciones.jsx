import { useEffect, useState } from "react";
import { TablaClasificacion } from "./AdminCompeticionesExternas.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

function formatFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// Convierte un ISO a formato apto para <input type="datetime-local">, en
// hora local (no UTC, que es lo que da toISOString y desplaza la hora).
function paraInputFecha(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Competiciones({ usuario }) {
  const [plataformas, setPlataformas] = useState([]);
  const [torneosExternos, setTorneosExternos] = useState([]);
  const [torneosVikings, setTorneosVikings] = useState([]);
  const [ligasVikings, setLigasVikings] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [pestana, setPestana] = useState("vikings");
  const [cargando, setCargando] = useState(true);

  const token = () => localStorage.getItem("socioToken");

  const cargarTorneos = () => {
    const auth = { Authorization: `Bearer ${token()}` };
    return fetch(`${API_URL}/api/competiciones-externas/torneos`, { headers: auth })
      .then((r) => (r.ok ? r.json() : []))
      .then(setTorneosExternos)
      .catch(() => {});
  };

  useEffect(() => {
    const auth = { Authorization: `Bearer ${token()}` };
    Promise.all([
      fetch(`${API_URL}/api/competiciones-externas/plataformas`).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/competiciones-externas/torneos`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/torneos-club/activos`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/ligas-club/activos`, { headers: auth }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_URL}/api/maquinas`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([p, t, tv, lv, m]) => {
        setPlataformas(p);
        setTorneosExternos(t);
        setTorneosVikings(tv);
        setLigasVikings(lv);
        setMaquinas(m);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function actualizarPartido(id, datos) {
    await fetch(`${API_URL}/api/competiciones-externas/partidos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(datos),
    });
    cargarTorneos();
  }

  if (cargando) return <p className="chronicle-status">Cargando competiciones…</p>;

  const pestanas = [{ id: "vikings", nombre: "Vikings" }, ...plataformas.map((p) => ({ id: p.id, nombre: p.nombre }))];

  return (
    <div>
      <h3>Competiciones activas</h3>
      <div className="admin-tabs" style={{ marginBottom: "1rem" }}>
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`admin-tab ${pestana === p.id ? "admin-tab-active" : ""}`}
            onClick={() => setPestana(p.id)}
          >
            {p.nombre}
          </button>
        ))}
      </div>

      {pestana === "vikings" && (
        <div>
          {torneosVikings.length === 0 && ligasVikings.length === 0 && (
            <p className="chronicle-status">No hay competiciones internas activas ahora mismo.</p>
          )}
          {torneosVikings.map((t) => (
            <div key={`t-${t.id}`} className="admin-list-item">
              <div>
                <a href={`/torneo/${t.id}`} target="_blank" rel="noopener noreferrer"><strong>{t.nombre}</strong></a>
                <time style={{ display: "block", fontSize: ".8em" }}>{formatFecha(t.fechaInicio)} – {formatFecha(t.fechaFin)} · Torneo</time>
              </div>
            </div>
          ))}
          {ligasVikings.map((l) => (
            <div key={`l-${l.id}`} className="admin-list-item">
              <div>
                <a href={`/liga/${l.id}`} target="_blank" rel="noopener noreferrer"><strong>{l.nombre}</strong></a>
                <time style={{ display: "block", fontSize: ".8em" }}>{formatFecha(l.fechaInicio)} – {formatFecha(l.fechaFin)} · Liga</time>
              </div>
            </div>
          ))}
        </div>
      )}

      {pestana !== "vikings" && (
        <div>
          {torneosExternos.filter((t) => t.plataformaId === pestana).length === 0 && (
            <p className="chronicle-status">No hay torneos de esta plataforma todavía.</p>
          )}
          {torneosExternos.filter((t) => t.plataformaId === pestana).map((t) => (
            <div key={t.id} className="admin-form" style={{ marginBottom: "1rem", padding: "1rem" }}>
              <strong>{t.nombre}</strong>
              {t.nivel && <span style={{ color: "var(--steel)" }}> — {t.nivel}</span>}
              {t.temporada && <span style={{ display: "block", fontSize: ".8em" }}>{t.temporada}</span>}
              {t.clasificacion?.length > 0 && <TablaClasificacion filas={t.clasificacion} />}
              {t.equipos.map((eq) => {
                // El capitán "real" es el de la plantilla del equipo del club
                // (eq.equipoClub.capitan); el de la inscripción concreta
                // (eq.capitan) casi nunca se usa, pero se comprueban los dos.
                const capitan = eq.equipoClub?.capitan || eq.capitan;
                const esCapitan = usuario && capitan?.usuarioId === usuario.id;
                return (
                  <div key={eq.id} style={{ marginTop: ".6rem" }}>
                    <em>{eq.equipoClub?.nombre || eq.nombreEquipo || "Vikings"}{capitan ? ` — Capitán: ${capitan.apodo || capitan.nombre}` : ""}</em>
                    {eq.clasificacion?.length > 0 && <TablaClasificacion filas={eq.clasificacion} />}
                    <ul>
                      {eq.partidos.map((p) => (
                        esCapitan ? (
                          <PartidoCapitanRow key={p.id} p={p} maquinas={maquinas} onActualizar={(datos) => actualizarPartido(p.id, datos)} />
                        ) : (
                          <li key={p.id} style={{ fontSize: ".85em" }}>
                            {formatFecha(p.fecha)} — vs {p.rival || "?"}
                            {p.resultado ? ` — ${p.resultado}` : p.fijado ? " — confirmado" : " — sin confirmar"}
                            {p.maquina ? ` (${p.maquina.nombre})` : ""}
                          </li>
                        )
                      ))}
                      {eq.partidos.length === 0 && <li style={{ fontSize: ".85em", opacity: 0.7 }}>Sin partidos todavía.</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Fila de partido editable para el capitán del equipo: puede fijar fecha,
// rival, máquina, resultado y una nota, y confirmar/desconfirmar el
// partido. Solo se muestra cuando el socio logueado es el capitán de este
// equipo concreto (comprobado también en el backend).
function PartidoCapitanRow({ p, maquinas, onActualizar }) {
  const [nota, setNota] = useState(p.notaCapitan || "");

  return (
    <li className="admin-list-item" style={{ flexWrap: "wrap", fontSize: ".85em" }}>
      <div>
        <strong>{formatFecha(p.fecha)}</strong> — vs {p.rival || "?"}
        {p.fijado ? " · confirmado" : " · sin confirmar"}
        {p.maquina ? ` · ${p.maquina.nombre}` : ""}
        {p.resultado ? ` · ${p.resultado}` : ""}
      </div>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap", marginTop: ".3rem" }}>
        <input
          type="datetime-local"
          defaultValue={paraInputFecha(p.fecha)}
          onBlur={(e) => e.target.value && onActualizar({ fecha: new Date(e.target.value).toISOString() })}
        />
        <input
          defaultValue={p.rival || ""}
          placeholder="Rival"
          onBlur={(e) => e.target.value !== (p.rival || "") && onActualizar({ rival: e.target.value })}
          style={{ width: "110px" }}
        />
        <select defaultValue={p.maquinaId || ""} onChange={(e) => onActualizar({ maquinaId: e.target.value || null })}>
          <option value="">Sin máquina</option>
          {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <input
          defaultValue={p.resultado || ""}
          placeholder="Resultado"
          onBlur={(e) => e.target.value !== (p.resultado || "") && onActualizar({ resultado: e.target.value })}
          style={{ width: "90px" }}
        />
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={(e) => e.target.value !== (p.notaCapitan || "") && onActualizar({ notaCapitan: e.target.value })}
          placeholder="Nota (opcional)"
          style={{ width: "140px" }}
        />
        <button type="button" className="admin-link-btn" onClick={() => onActualizar({ fijado: !p.fijado })}>
          {p.fijado ? "Desconfirmar" : "Confirmar"}
        </button>
      </div>
    </li>
  );
}
