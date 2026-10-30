import { useState } from "react";
import { useLang } from "./i18n.jsx";
import MarcadorPartida from "./MarcadorPartida.jsx";
import { construirUnidades } from "./dardosLogica.js";

// Partida libre del VikingsCounter (pestaña "Local"), para cuando se juega
// en una diana sin contador electrónico: aquí solo se eligen jugadores y
// reglas; el marcador es el mismo que el de los partidos de torneo, liga y
// amistosos (MarcadorPartida.jsx). Sin persistencia (calculadora de apoyo,
// no se guarda nada al terminar la partida) y hasta 6 jugadores/parejas. La
// geometría de la diana y el buscador de cierres viven en dardosLogica.js.

const ESTILO_BOTON_PRIMARIO = {
  background: "var(--blood)",
  color: "var(--bone)",
  border: "none",
  padding: ".7rem 1rem",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

function etiquetaModalidad(modalidad, t) {
  if (modalidad === "doble") return t("marcador.doble");
  if (modalidad === "master") return t("marcador.master");
  return t("marcador.simple");
}

// --- Selector de jugadores/parejas, compartido por 501 y Cricket ---------

// Botones ↑ ↓ para cambiar el orden de tiro (pedido de Iraitz, 2026-10-30):
// el primero de la lista empieza el leg 1, el segundo el leg 2…
function BotonesOrden({ pos, total, onMover }) {
  const { t } = useLang();
  return (
    <span style={{ display: "inline-flex", gap: ".2rem" }}>
      <button type="button" className="admin-link-btn" disabled={pos === 0} onClick={() => onMover(pos, -1)} aria-label={t("marcador.subir")}>↑</button>
      <button type="button" className="admin-link-btn" disabled={pos === total - 1} onClick={() => onMover(pos, 1)} aria-label={t("marcador.bajar")}>↓</button>
    </span>
  );
}

function intercambiar(lista, pos, delta) {
  const copia = [...lista];
  [copia[pos], copia[pos + delta]] = [copia[pos + delta], copia[pos]];
  return copia;
}

function SelectorModoJugadores({ onListo }) {
  const { t } = useLang();
  const [modo, setModo] = useState("individual");
  const [cantidadIndividual, setCantidadIndividual] = useState(2);
  const [nombresIndividual, setNombresIndividual] = useState([`${t("marcador.jugadorDefault")} 1`, `${t("marcador.jugadorDefault")} 2`]);
  const [cantidadEquipos, setCantidadEquipos] = useState(2);
  const [equipos, setEquipos] = useState([
    { nombre: `${t("marcador.equipoDefault")} 1`, integrantes: [`${t("marcador.jugadorDefault")} 1`, `${t("marcador.jugadorDefault")} 2`] },
    { nombre: `${t("marcador.equipoDefault")} 2`, integrantes: [`${t("marcador.jugadorDefault")} 3`, `${t("marcador.jugadorDefault")} 4`] },
  ]);
  const [marcadorCompartido, setMarcadorCompartido] = useState(true);

  function cambiarCantidadIndividual(n) {
    setCantidadIndividual(n);
    setNombresIndividual((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) copia.push(`${t("marcador.jugadorDefault")} ${copia.length + 1}`);
      return copia;
    });
  }

  function cambiarCantidadEquipos(n) {
    setCantidadEquipos(n);
    setEquipos((actual) => {
      const copia = actual.slice(0, n);
      while (copia.length < n) {
        const idx = copia.length;
        copia.push({ nombre: `${t("marcador.equipoDefault")} ${idx + 1}`, integrantes: [`${t("marcador.jugadorDefault")} ${idx * 2 + 1}`, `${t("marcador.jugadorDefault")} ${idx * 2 + 2}`] });
      }
      return copia;
    });
  }

  function continuar() {
    if (modo === "individual") {
      onListo({ modo, jugadores: nombresIndividual.map((n) => (n.trim() ? n.trim() : n)) });
    } else {
      onListo({
        modo,
        equipos: equipos.map((eq) => ({
          nombre: eq.nombre.trim() || eq.nombre,
          integrantes: eq.integrantes.map((n) => (n.trim() ? n.trim() : n)),
        })),
        marcadorCompartido,
      });
    }
  }

  return (
    <div className="admin-form" style={{ maxWidth: 460 }}>
      <label>
        {t("marcador.modo")}
        <div className="live-tournament-toggle">
          <button type="button" className={modo === "individual" ? "active" : ""} onClick={() => setModo("individual")}>
            {t("marcador.individual")}
          </button>
          <button type="button" className={modo === "parejas" ? "active" : ""} onClick={() => setModo("parejas")}>
            {t("marcador.parejas")}
          </button>
        </div>
      </label>

      {modo === "individual" ? (
        <>
          <label>
            {t("marcador.jugadores")}
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              {[2, 3, 4, 5, 6].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`admin-tab ${cantidadIndividual === n ? "admin-tab-active" : ""}`}
                  onClick={() => cambiarCantidadIndividual(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          <p className="chronicle-status" style={{ margin: 0 }}>{t("marcador.ordenTiro")}</p>
          {nombresIndividual.map((nombre, i) => (
            <label key={i}>
              {t("marcador.nombreN").replace("{n}", i + 1)}
              <span style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                <input
                  type="text"
                  value={nombre}
                  maxLength={20}
                  onChange={(e) => setNombresIndividual((a) => a.map((x, idx) => (idx === i ? e.target.value : x)))}
                />
                <BotonesOrden pos={i} total={nombresIndividual.length} onMover={(pos, d) => setNombresIndividual((a) => intercambiar(a, pos, d))} />
              </span>
            </label>
          ))}
        </>
      ) : (
        <>
          <label>
            {t("marcador.parejas")}
            <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
              {[2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`admin-tab ${cantidadEquipos === n ? "admin-tab-active" : ""}`}
                  onClick={() => cambiarCantidadEquipos(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          <p className="chronicle-status" style={{ margin: 0 }}>{t("marcador.ordenTiro")}</p>
          {equipos.map((eq, i) => (
            <div key={i} style={{ border: "1px solid var(--line)", padding: ".7rem", display: "flex", flexDirection: "column", gap: ".5rem" }}>
              <label>
                {t("marcador.nombreEquipo")}
                <span style={{ display: "flex", gap: ".4rem", alignItems: "center" }}>
                  <input
                    type="text"
                    value={eq.nombre}
                    maxLength={24}
                    onChange={(e) => setEquipos((a) => a.map((x, idx) => (idx === i ? { ...x, nombre: e.target.value } : x)))}
                  />
                  <BotonesOrden pos={i} total={equipos.length} onMover={(pos, d) => setEquipos((a) => intercambiar(a, pos, d))} />
                </span>
              </label>
              {eq.integrantes.map((nombre, j) => (
                <label key={j}>
                  {t("marcador.integranteN").replace("{n}", j + 1)}
                  <input
                    type="text"
                    value={nombre}
                    maxLength={20}
                    onChange={(e) =>
                      setEquipos((a) =>
                        a.map((x, idx) => (idx === i ? { ...x, integrantes: x.integrantes.map((n, jj) => (jj === j ? e.target.value : n)) } : x))
                      )
                    }
                  />
                </label>
              ))}
            </div>
          ))}
          <label style={{ flexDirection: "row", alignItems: "center", gap: ".5rem", textTransform: "none" }}>
            <input type="checkbox" checked={marcadorCompartido} onChange={(e) => setMarcadorCompartido(e.target.checked)} style={{ width: "auto" }} />
            {t("marcador.marcadorCompartido")}
          </label>
        </>
      )}

      <button type="button" onClick={continuar} style={ESTILO_BOTON_PRIMARIO}>
        {t("marcador.continuar")}
      </button>
    </div>
  );
}

// --- Selector de "al mejor de", compartido por 501 y Cricket --------------

const OPCIONES_AL_MEJOR_DE = [1, 3, 5, 7, 9];

function SelectorAlMejorDe({ valor, onCambiar }) {
  return (
    <label>
      Al mejor de
      <div className="live-tournament-toggle">
        {OPCIONES_AL_MEJOR_DE.map((n) => (
          <button key={n} type="button" className={valor === n ? "active" : ""} onClick={() => onCambiar(n)}>
            {n}
          </button>
        ))}
      </div>
    </label>
  );
}

// --- Partida libre ---------------------------------------------------

// La partida libre usa el mismo marcador que los partidos de torneo, liga y
// amistosos (MarcadorPartida.jsx, unificado el 2026-10-30): aquí solo se
// arma una "partida" en memoria con la misma forma que una del backend (un
// lado por jugador o pareja, ids inventados para las estadísticas) y, al
// acabar cada leg, se cuenta aquí mismo en vez de mandarlo a ningún sitio.
// No se guarda nada: se pierde al recargar la página, como siempre.
function crearPartidaLibre(juego, configBase, reglas) {
  const lados = construirUnidades(configBase).map((u) => ({
    etiqueta: u.etiqueta,
    jugadoresId: u.integrantes.map((_, k) => `${u.id}-${k}`),
    nombres: u.integrantes,
  }));
  return {
    id: null,
    juego,
    alMejorDe: reglas.alMejorDe,
    apertura: reglas.apertura || null,
    cierre: reglas.cierre || null,
    modoCricket: reglas.modoCricket || null,
    lados,
    legs: [],
    legsGanadosLados: lados.map(() => 0),
    ordenLados: [],
    finalizada: false,
    visitaEnCurso: null,
  };
}

function PartidaLibre({ juego, configBase, reglas, onNuevaPartida }) {
  const { t } = useLang();
  const [partida, setPartida] = useState(() => crearPartidaLibre(juego, configBase, reglas));

  function terminarLeg(ladoIdx, estadisticas) {
    const legsGanadosLados = partida.legsGanadosLados.map((n, i) => n + (i === ladoIdx ? 1 : 0));
    const legsParaGanar = Math.floor(partida.alMejorDe / 2) + 1;
    return {
      ...partida,
      legs: [...partida.legs, { numero: partida.legs.length + 1, ladoGanador: ladoIdx + 1, estadisticas }],
      legsGanadosLados,
      finalizada: legsGanadosLados.some((n) => n >= legsParaGanar),
    };
  }

  if (partida.finalizada) {
    const legsParaGanar = Math.floor(partida.alMejorDe / 2) + 1;
    const ganador = partida.lados[partida.legsGanadosLados.findIndex((n) => n >= legsParaGanar)];
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          {t("marcador.ganaPartido").replace("{etiqueta}", ganador.etiqueta).replace("{resultado}", partida.legsGanadosLados.join(" - "))}
        </p>
        <button type="button" onClick={onNuevaPartida}>{t("marcador.nuevaPartida")}</button>
      </div>
    );
  }

  return (
    <MarcadorPartida
      key={partida.legs.length}
      partida={partida}
      esRemota={false}
      onLegTerminado={terminarLeg}
      onActualizada={setPartida}
      onSalir={onNuevaPartida}
      textoSalir={t("marcador.nuevaPartida")}
    />
  );
}

function Marcador501() {
  const { t } = useLang();
  const [fase, setFase] = useState("jugadores"); // "jugadores" | "reglas" | "jugando"
  const [configBase, setConfigBase] = useState(null);
  const [apertura, setApertura] = useState("simple");
  const [cierre, setCierre] = useState("doble");
  const [alMejorDe, setAlMejorDe] = useState(5);

  if (fase === "jugadores") {
    return <SelectorModoJugadores onListo={(c) => { setConfigBase(c); setFase("reglas"); }} />;
  }

  if (fase === "reglas") {
    return (
      <div className="admin-form" style={{ maxWidth: 420 }}>
        <label>
          {t("marcador.apertura")}
          <div className="live-tournament-toggle">
            {["simple", "doble", "master"].map((op) => (
              <button key={op} type="button" className={apertura === op ? "active" : ""} onClick={() => setApertura(op)}>
                {etiquetaModalidad(op, t)}
              </button>
            ))}
          </div>
        </label>
        <label>
          {t("marcador.cierre")}
          <div className="live-tournament-toggle">
            {["simple", "doble", "master"].map((op) => (
              <button key={op} type="button" className={cierre === op ? "active" : ""} onClick={() => setCierre(op)}>
                {etiquetaModalidad(op, t)}
              </button>
            ))}
          </div>
        </label>
        <SelectorAlMejorDe valor={alMejorDe} onCambiar={setAlMejorDe} />
        <button type="button" onClick={() => setFase("jugando")} style={ESTILO_BOTON_PRIMARIO}>
          {t("marcador.empezarPartida")}
        </button>
      </div>
    );
  }

  return (
    <PartidaLibre
      juego="501"
      configBase={configBase}
      reglas={{ apertura, cierre, alMejorDe }}
      onNuevaPartida={() => setFase("jugadores")}
    />
  );
}

// --- Cricket -----------------------------------------------------------

function MarcadorCricket() {
  const { t } = useLang();
  const [fase, setFase] = useState("jugadores"); // "jugadores" | "reglas" | "jugando"
  const [configBase, setConfigBase] = useState(null);
  const [modoCricket, setModoCricket] = useState("normal"); // "normal" | "cutthroat"
  const [alMejorDe, setAlMejorDe] = useState(5);

  if (fase === "jugadores") {
    return <SelectorModoJugadores onListo={(c) => { setConfigBase(c); setFase("reglas"); }} />;
  }

  if (fase === "reglas") {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <label>
          {t("marcador.modalidad")}
          <div className="live-tournament-toggle">
            <button type="button" className={modoCricket === "normal" ? "active" : ""} onClick={() => setModoCricket("normal")}>
              {t("marcador.normal")}
            </button>
            <button type="button" className={modoCricket === "cutthroat" ? "active" : ""} onClick={() => setModoCricket("cutthroat")}>
              Cut-throat
            </button>
          </div>
        </label>
        <p className="chronicle-status">
          {modoCricket === "cutthroat"
            ? t("marcador.cutthroatExplicacion")
            : t("marcador.normalExplicacion")}
        </p>
        <SelectorAlMejorDe valor={alMejorDe} onCambiar={setAlMejorDe} />
        <button type="button" onClick={() => setFase("jugando")} style={ESTILO_BOTON_PRIMARIO}>
          {t("marcador.empezarPartida")}
        </button>
      </div>
    );
  }

  return (
    <PartidaLibre
      juego="cricket"
      configBase={configBase}
      reglas={{ modoCricket, alMejorDe }}
      onNuevaPartida={() => setFase("jugadores")}
    />
  );
}

// --- Componente principal ----------------------------------------------

export default function Marcadores() {
  const { t } = useLang();
  const [juego, setJuego] = useState("501");

  return (
    <div>
      <h3>{t("marcador.titulo")}</h3>
      <p className="chronicle-status" style={{ marginBottom: ".8rem" }}>
        {t("marcador.intro")}
      </p>

      <div className="live-tournament-toggle">
        <button type="button" className={juego === "501" ? "active" : ""} onClick={() => setJuego("501")}>
          501
        </button>
        <button type="button" className={juego === "cricket" ? "active" : ""} onClick={() => setJuego("cricket")}>
          Cricket
        </button>
      </div>

      {juego === "501" ? <Marcador501 key="501" /> : <MarcadorCricket key="cricket" />}
    </div>
  );
}
