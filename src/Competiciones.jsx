import { useEffect, useState } from "react";
import { TablaClasificacion } from "./AdminCompeticionesExternas.jsx";
import { useLang } from "./i18n.jsx";
import { API_URL } from "./config.js";


function formatFecha(iso, lang) {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

// Convierte un ISO a formato apto para <input type="datetime-local">, en
// hora local (no UTC, que es lo que da toISOString y desplaza la hora).
function paraInputFecha(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Competiciones({ usuario }) {
  const { t, lang } = useLang();
  const [plataformas, setPlataformas] = useState([]);
  const [torneosExternos, setTorneosExternos] = useState([]);
  const [torneosVikings, setTorneosVikings] = useState([]);
  const [ligasVikings, setLigasVikings] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [pestana, setPestana] = useState("vikings");
  const [cargando, setCargando] = useState(true);
  const [competicionesAbiertas, setCompeticionesAbiertas] = useState({});
  const [equiposAbiertos, setEquiposAbiertos] = useState({});

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

  async function crearPartido(equipoId, fecha, rival) {
    if (!fecha) return;
    await fetch(`${API_URL}/api/competiciones-externas/equipos/${equipoId}/partidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ fecha, rival }),
    });
    cargarTorneos();
  }

  if (cargando) return <p className="chronicle-status">{t("competiciones.cargando")}</p>;

  const pestanas = [{ id: "vikings", nombre: "Vikings" }, ...plataformas.map((p) => ({ id: p.id, nombre: p.nombre }))];

  return (
    <div>
      <h3>{t("competiciones.titulo")}</h3>
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
            <p className="chronicle-status">{t("competiciones.sinInternas")}</p>
          )}
          {torneosVikings.map((tv) => (
            <div key={`t-${tv.id}`} className="admin-list-item">
              <div>
                <a href={`/torneo/${tv.id}`} target="_blank" rel="noopener noreferrer"><strong>{tv.nombre}</strong></a>
                <time style={{ display: "block", fontSize: ".8em" }}>{formatFecha(tv.fechaInicio, lang)} – {formatFecha(tv.fechaFin, lang)} · {t("competiciones.torneo")}</time>
              </div>
            </div>
          ))}
          {ligasVikings.map((l) => (
            <div key={`l-${l.id}`} className="admin-list-item">
              <div>
                <a href={`/liga/${l.id}`} target="_blank" rel="noopener noreferrer"><strong>{l.nombre}</strong></a>
                <time style={{ display: "block", fontSize: ".8em" }}>{formatFecha(l.fechaInicio, lang)} – {formatFecha(l.fechaFin, lang)} · {t("competiciones.liga")}</time>
              </div>
            </div>
          ))}
        </div>
      )}

      {pestana !== "vikings" && (
        <div>
          {torneosExternos.filter((tx) => tx.plataformaId === pestana).length === 0 && (
            <p className="chronicle-status">{t("competiciones.sinExternos")}</p>
          )}
          {torneosExternos.filter((tx) => tx.plataformaId === pestana).map((tx) => {
            const abierta = !!competicionesAbiertas[tx.id];
            return (
              <div key={tx.id} className="admin-cuadrante" style={{ marginBottom: "1rem" }}>
                <h4
                  className="admin-ronda-header"
                  style={{ margin: 0 }}
                  onClick={() => setCompeticionesAbiertas((prev) => ({ ...prev, [tx.id]: !abierta }))}
                >
                  <span>
                    {tx.nombre}
                    {tx.nivel && <span style={{ color: "var(--steel)" }}> — {tx.nivel}</span>}
                    {tx.temporada && <span style={{ fontSize: ".8em" }}> · {tx.temporada}</span>}
                  </span>
                  <span className="admin-ronda-toggle">{abierta ? "Ocultar ▲" : "Ver ▼"}</span>
                </h4>

                {abierta && (
                  <div style={{ marginTop: ".8rem" }}>
                    {tx.clasificacion?.length > 0 && <TablaClasificacion filas={tx.clasificacion} />}
                    {tx.equipos.map((eq) => {
                      // El capitán "real" es el de la plantilla del equipo del club
                      // (eq.equipoClub.capitan); el de la inscripción concreta
                      // (eq.capitan) casi nunca se usa, pero se comprueban los dos.
                      const capitan = eq.equipoClub?.capitan || eq.capitan;
                      const esCapitan = usuario && capitan?.usuarioId === usuario.id;
                      const eqAbierto = !!equiposAbiertos[eq.id];
                      return (
                        <div key={eq.id} style={{ marginTop: ".8rem", paddingLeft: ".6rem", borderLeft: "2px solid var(--line)" }}>
                          <h4
                            className="admin-ronda-header"
                            style={{ margin: 0, fontSize: ".85em", textTransform: "none" }}
                            onClick={() => setEquiposAbiertos((prev) => ({ ...prev, [eq.id]: !eqAbierto }))}
                          >
                            <span>
                              {eq.equipoClub?.nombre || eq.nombreEquipo || "Vikings"}
                              {capitan ? ` — ${t("competiciones.capitan")} ${capitan.apodo || capitan.nombre}` : ""}
                            </span>
                            <span className="admin-ronda-toggle">{eqAbierto ? "Ocultar ▲" : "Ver ▼"}</span>
                          </h4>

                          {eqAbierto && (
                            <div style={{ marginTop: ".6rem" }}>
                              {eq.clasificacion?.length > 0 && <TablaClasificacion filas={eq.clasificacion} />}
                              {esCapitan && (
                                <NuevoPartidoCapitanForm onCrear={(fecha, rival) => crearPartido(eq.id, fecha, rival)} t={t} />
                              )}
                              <ul>
                                {eq.partidos.map((p) => (
                                  esCapitan ? (
                                    <PartidoCapitanRow key={p.id} p={p} maquinas={maquinas} onActualizar={(datos) => actualizarPartido(p.id, datos)} t={t} lang={lang} />
                                  ) : (
                                    <li key={p.id} style={{ fontSize: ".85em" }}>
                                      {formatFecha(p.fecha, lang)} — {t("partido.vs")} {p.rival || "?"}
                                      {p.resultado ? ` — ${p.resultado}` : p.fijado ? ` — ${t("competiciones.confirmado")}` : ` — ${t("competiciones.sinConfirmar")}`}
                                      {p.maquina ? ` (${p.maquina.nombre})` : ""}
                                    </li>
                                  )
                                ))}
                                {eq.partidos.length === 0 && <li style={{ fontSize: ".85em", opacity: 0.7 }}>{t("competiciones.sinPartidos")}</li>}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Formulario para que el capitán dé de alta un partido nuevo (fecha +
// rival), acordado normalmente por él mismo con el equipo rival. Solo se
// muestra al capitán del equipo (comprobado también en el backend).
function NuevoPartidoCapitanForm({ onCrear, t }) {
  const [fecha, setFecha] = useState("");
  const [rival, setRival] = useState("");

  return (
    <div className="admin-inline-form" style={{ marginTop: ".4rem" }}>
      <label>
        {t("competiciones.fechaHora")}
        <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label>
        {t("competiciones.rivalOpcional")}
        <input value={rival} onChange={(e) => setRival(e.target.value)} />
      </label>
      <button
        type="button"
        disabled={!fecha}
        onClick={() => {
          onCrear(new Date(fecha).toISOString(), rival);
          setFecha("");
          setRival("");
        }}
      >
        {t("competiciones.anadirPartido")}
      </button>
    </div>
  );
}

// Fila de partido editable para el capitán del equipo: puede fijar fecha,
// rival, máquina, resultado y una nota, y confirmar/desconfirmar el
// partido. Solo se muestra cuando el socio logueado es el capitán de este
// equipo concreto (comprobado también en el backend).
function PartidoCapitanRow({ p, maquinas, onActualizar, t, lang }) {
  const [nota, setNota] = useState(p.notaCapitan || "");

  return (
    <li className="admin-list-item" style={{ flexWrap: "wrap", fontSize: ".85em" }}>
      <div>
        <strong>{formatFecha(p.fecha, lang)}</strong> — {t("partido.vs")} {p.rival || "?"}
        {p.fijado ? ` · ${t("competiciones.confirmado")}` : ` · ${t("competiciones.sinConfirmar")}`}
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
          placeholder={t("competiciones.rivalPlaceholder")}
          onBlur={(e) => e.target.value !== (p.rival || "") && onActualizar({ rival: e.target.value })}
          style={{ width: "110px" }}
        />
        <select defaultValue={p.maquinaId || ""} onChange={(e) => onActualizar({ maquinaId: e.target.value || null })}>
          <option value="">{t("competiciones.sinMaquina")}</option>
          {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <input
          defaultValue={p.resultado || ""}
          placeholder={t("competiciones.resultadoPlaceholder")}
          onBlur={(e) => e.target.value !== (p.resultado || "") && onActualizar({ resultado: e.target.value })}
          style={{ width: "90px" }}
        />
        <input
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={(e) => e.target.value !== (p.notaCapitan || "") && onActualizar({ notaCapitan: e.target.value })}
          placeholder={t("competiciones.notaPlaceholder")}
          style={{ width: "140px" }}
        />
        <button type="button" className="admin-link-btn" onClick={() => onActualizar({ fijado: !p.fijado })}>
          {p.fijado ? t("competiciones.desconfirmar") : t("competiciones.confirmar")}
        </button>
      </div>
    </li>
  );
}
