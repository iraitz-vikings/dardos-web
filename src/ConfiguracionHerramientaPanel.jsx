import { useState } from "react";

// Panel de admin para activar/configurar la herramienta de marcador
// (501/Cricket) de un torneo o una liga — compartido por AdminTorneosClub.jsx
// y AdminLigasClub.jsx, que solo cambian la etiqueta ("ronda" vs "jornada")
// y el endpoint al que guardan (onGuardar). Formato de datos y validación en
// el backend: src/lib/configuracionHerramienta.js (mismo nombre, ver el plan
// guardado en el proyecto — Slice 2).
//
// Las "excepciones por ronda/jornada" son de momento un simple mapa de texto
// libre -> configuración (p.ej. "1", "2", "final"): la Slice 4 (flujo público
// de juego) es la que decide cómo hacer casar esa clave con la ronda o
// jornada real de cada partido.

const JUEGOS_HERRAMIENTA = [
  { id: "501", etiqueta: "501" },
  { id: "cricket", etiqueta: "Cricket" },
  { id: "ambos", etiqueta: "501 y Cricket (a elegir al jugar)" },
];
const MODALIDADES_501 = [
  { id: "simple", etiqueta: "Simple" },
  { id: "doble", etiqueta: "Doble" },
  { id: "master", etiqueta: "Master" },
];
const MODOS_CRICKET = [
  { id: "normal", etiqueta: "Normal" },
  { id: "cutthroat", etiqueta: "Cut-throat" },
];

function configJuegoPorDefecto() {
  return { juego: "501", alMejorDe: 3, apertura: "simple", cierre: "doble", modoCricket: "normal" };
}

function FormularioConfigJuego({ config, onCambiar }) {
  const c = { ...configJuegoPorDefecto(), ...config };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: ".8rem", alignItems: "flex-end" }}>
      <label style={{ minWidth: "10rem" }}>
        Juego
        <select value={c.juego} onChange={(e) => onCambiar({ ...c, juego: e.target.value })}>
          {JUEGOS_HERRAMIENTA.map((j) => (
            <option key={j.id} value={j.id}>{j.etiqueta}</option>
          ))}
        </select>
      </label>
      <label>
        Al mejor de (legs)
        <input
          type="number"
          min="1"
          max="15"
          value={c.alMejorDe}
          onChange={(e) => onCambiar({ ...c, alMejorDe: Number(e.target.value) })}
          style={{ width: "5rem" }}
        />
      </label>
      {(c.juego === "501" || c.juego === "ambos") && (
        <>
          <label>
            Apertura (501)
            <select value={c.apertura} onChange={(e) => onCambiar({ ...c, apertura: e.target.value })}>
              {MODALIDADES_501.map((m) => (
                <option key={m.id} value={m.id}>{m.etiqueta}</option>
              ))}
            </select>
          </label>
          <label>
            Cierre (501)
            <select value={c.cierre} onChange={(e) => onCambiar({ ...c, cierre: e.target.value })}>
              {MODALIDADES_501.map((m) => (
                <option key={m.id} value={m.id}>{m.etiqueta}</option>
              ))}
            </select>
          </label>
        </>
      )}
      {(c.juego === "cricket" || c.juego === "ambos") && (
        <label>
          Modalidad de Cricket
          <select value={c.modoCricket} onChange={(e) => onCambiar({ ...c, modoCricket: e.target.value })}>
            {MODOS_CRICKET.map((m) => (
              <option key={m.id} value={m.id}>{m.etiqueta}</option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

// `entidad` es el torneo o la liga (ambos tienen `configuracionHerramienta` en
// el mismo formato); `onGuardar(entidad, configuracionHerramienta)` hace el
// PUT correspondiente y devuelve `{ ok, error? }`.
export default function ConfiguracionHerramientaPanel({ entidad, etiquetaRonda = "ronda", onGuardar }) {
  const existente = entidad.configuracionHerramienta || {};
  const [activa, setActiva] = useState(!!existente.activa);
  const [porDefecto, setPorDefecto] = useState({ ...configJuegoPorDefecto(), ...(existente.porDefecto || {}) });
  const [porRonda, setPorRonda] = useState(
    Object.entries(existente.porRonda || {}).map(([clave, config]) => ({ clave, ...configJuegoPorDefecto(), ...config }))
  );
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  function anadirExcepcion() {
    setPorRonda((a) => [...a, { clave: "", ...configJuegoPorDefecto() }]);
  }
  function cambiarClaveExcepcion(i, clave) {
    setPorRonda((a) => a.map((f, idx) => (idx === i ? { ...f, clave } : f)));
  }
  function cambiarConfigExcepcion(i, config) {
    setPorRonda((a) => a.map((f, idx) => (idx === i ? { ...config, clave: f.clave } : f)));
  }
  function quitarExcepcion(i) {
    setPorRonda((a) => a.filter((_, idx) => idx !== i));
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    const configuracionHerramienta = {
      activa,
      porDefecto,
      porRonda: Object.fromEntries(
        porRonda
          .filter((f) => f.clave.trim())
          .map(({ clave, ...resto }) => [clave.trim(), resto])
      ),
    };
    const resultado = await onGuardar(entidad, configuracionHerramienta);
    setMensaje(
      resultado.ok
        ? { tipo: "ok", texto: "Configuración guardada." }
        : { tipo: "error", texto: resultado.error || "No se pudo guardar la configuración." }
    );
    setGuardando(false);
  }

  return (
    <div>
      <p className="admin-hint">
        Si la activas, en la página pública los jugadores podrán identificarse con su PIN y jugar su partido
        con la herramienta de marcador (diana, teclado de números o puntuación total, según prefieran). Al
        terminar, el resultado se aplica solo al partido. Sigue siendo opcional para cada partido: si alguien
        no la usa, puedes seguir metiendo el resultado a mano como hasta ahora.
      </p>
      <label style={{ flexDirection: "row", alignItems: "center", gap: ".5rem", textTransform: "none" }}>
        <input type="checkbox" checked={activa} onChange={(e) => setActiva(e.target.checked)} style={{ width: "auto" }} />
        Activar herramienta de marcador
      </label>

      {activa && (
        <>
          <h4 style={{ marginTop: "1.2rem" }}>Configuración por defecto</h4>
          <FormularioConfigJuego config={porDefecto} onCambiar={setPorDefecto} />

          <h4 style={{ marginTop: "1.2rem" }}>Excepciones por {etiquetaRonda}</h4>
          <p className="admin-hint" style={{ marginTop: 0 }}>
            Opcional: para que una {etiquetaRonda} concreta use un juego o un "al mejor de" distinto del de
            por defecto (p.ej. la final al mejor de 5). Escribe el número que identifica esa {etiquetaRonda}
            {etiquetaRonda === "ronda" ? ' tal cual (o "final" para la gran final del cuadro)' : " tal cual"}.
          </p>
          {porRonda.map((f, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", padding: ".6rem", marginBottom: ".5rem" }}>
              <label style={{ marginBottom: ".5rem" }}>
                {etiquetaRonda === "ronda" ? "Ronda" : "Jornada"}
                <input
                  value={f.clave}
                  onChange={(e) => cambiarClaveExcepcion(i, e.target.value)}
                  placeholder={etiquetaRonda === "ronda" ? "1, 2, final…" : "1, 2, 3…"}
                  style={{ width: "8rem" }}
                />
              </label>
              <FormularioConfigJuego config={f} onCambiar={(config) => cambiarConfigExcepcion(i, config)} />
              <button type="button" className="admin-link-btn" style={{ marginTop: ".5rem" }} onClick={() => quitarExcepcion(i)}>
                Quitar excepción
              </button>
            </div>
          ))}
          <button type="button" className="admin-link-btn" onClick={anadirExcepcion}>
            ＋ Añadir excepción
          </button>
        </>
      )}

      <div style={{ marginTop: "1.2rem" }}>
        <button type="button" disabled={guardando} onClick={guardar}>
          {guardando ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
      {mensaje && <p className={`admin-msg admin-msg-${mensaje.tipo}`}>{mensaje.texto}</p>}
    </div>
  );
}
