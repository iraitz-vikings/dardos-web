import { useEffect, useMemo, useState } from "react";
import Diana from "./Diana.jsx";
import TecladoNumeros from "./TecladoNumeros.jsx";
import TecladoPuntuacion from "./TecladoPuntuacion.jsx";
import {
  buscarCierre,
  calcularPuntosCricket,
  calcularPuntosCricketCutThroat,
  construirUnidades,
  cumpleModalidad,
  jugadorHaCerradoTodo,
  marcasDelDardo,
  marcasVacias,
  NUMEROS_CRICKET,
  tiradorActual,
} from "./dardosLogica.js";

// Flujo público de juego con la herramienta de marcador, para partidos de
// torneo/liga con la herramienta activada (ver ConfiguracionHerramientaPanel.jsx
// en el admin y el plan "herramienta-marcador-torneos-ligas" guardado en el
// proyecto — Slice 3+4). A diferencia de Marcadores.jsx (calculadora suelta,
// sin guardar nada), aquí los jugadores/reglas vienen del partido real y,
// leg a leg, el resultado se manda al backend — que en cuanto se alcanza "al
// mejor de N" lo aplica solo al partido (ver src/routes/partidasHerramienta.js).
//
// Simplificaciones de esta primera fase (dispositivo compartido junto a la
// diana, ver decisión en el plan):
// - El modo "puntuación total" no sabe cuántos dardos ha usado realmente el
//   jugador en la visita: para la media se cuenta como 3 dardos siempre
//   (igual que se ha hecho al añadir este modo a Marcadores.jsx).
// - Quién empieza cada leg se alterna automáticamente (leg 1: etiqueta1,
//   leg 2: etiqueta2, ...), no hay forma de fijarlo a mano.

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";
const clonar = (x) => JSON.parse(JSON.stringify(x));

function etiquetaModalidad(modalidad) {
  if (modalidad === "doble") return "Doble";
  if (modalidad === "master") return "Master (doble o triple)";
  return "Simple (cualquier dardo)";
}

async function apiFetch(path, { token, ...opciones } = {}) {
  const resp = await fetch(`${API_URL}${path}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opciones.headers || {}),
    },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const error = new Error(data.error || "Error de red");
    error.status = resp.status;
    throw error;
  }
  return data;
}

// --- Paso 1: identificación con PIN ---------------------------------------

function LoginPin({ onEntrar }) {
  const [jugadores, setJugadores] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [jugadorId, setJugadorId] = useState("");
  const [pin, setPin] = useState("");
  const [pinRepetido, setPinRepetido] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiFetch("/api/partidas-herramienta/jugadores")
      .then(setJugadores)
      .catch(() => setError("No se ha podido cargar la lista de jugadores."));
  }, []);

  const filtrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return jugadores;
    return jugadores.filter((j) => (j.apodo || j.nombre).toLowerCase().includes(q));
  }, [jugadores, filtro]);

  const jugador = jugadores.find((j) => j.id === jugadorId) || null;

  function elegirJugador(j) {
    setJugadorId(j.id);
    setPin("");
    setPinRepetido("");
    setError("");
  }

  // Si el jugador todavía no tiene PIN de partidas puesto (primera vez que
  // usa la herramienta), se lo pone él mismo aquí mismo en vez de tener que
  // pasar antes por el admin o por su perfil de socio.
  async function crearPinYEntrar() {
    if (!/^\d{4}$/.test(pin)) {
      setError("Elige un PIN de 4 dígitos.");
      return;
    }
    if (pin !== pinRepetido) {
      setError("Los dos PIN no coinciden.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const data = await apiFetch("/api/partidas-herramienta/pin", {
        method: "POST",
        body: JSON.stringify({ jugadorId, pin }),
      });
      onEntrar(data);
    } catch (err) {
      setError(err.message || "No se ha podido crear el PIN.");
    } finally {
      setEnviando(false);
    }
  }

  async function entrar() {
    if (!jugadorId || !/^\d{4}$/.test(pin)) {
      setError("Elige quién eres y escribe tu PIN de 4 dígitos.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const data = await apiFetch("/api/partidas-herramienta/login", {
        method: "POST",
        body: JSON.stringify({ jugadorId, pin }),
      });
      onEntrar(data);
    } catch (err) {
      setError(err.message || "PIN incorrecto");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="admin-form" style={{ maxWidth: 380 }}>
      <label>
        ¿Quién eres?
        <input type="text" placeholder="Buscar tu nombre…" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
      </label>
      <div className="marcador-lista-jugadores" style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: ".3rem" }}>
        {filtrados.map((j) => (
          <button
            key={j.id}
            type="button"
            className={`admin-tab ${jugadorId === j.id ? "admin-tab-active" : ""}`}
            onClick={() => elegirJugador(j)}
          >
            {j.apodo || j.nombre}
            {!j.tienePinPartidas && <small style={{ opacity: 0.7 }}> · sin PIN todavía</small>}
          </button>
        ))}
        {filtrados.length === 0 && <p className="chronicle-status">Nadie con ese nombre.</p>}
      </div>

      {jugador && !jugador.tienePinPartidas ? (
        <>
          <p className="chronicle-status" style={{ margin: 0 }}>
            Es la primera vez que {jugador.apodo || jugador.nombre} usa la herramienta: elige un PIN de 4 dígitos para
            identificarte las próximas veces.
          </p>
          <label>
            Elige tu PIN
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          <label>
            Repite el PIN
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinRepetido}
              onChange={(e) => setPinRepetido(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          {error && <p className="admin-msg admin-msg-error">{error}</p>}
          <button type="button" disabled={enviando} onClick={crearPinYEntrar}>
            {enviando ? "Creando…" : "Crear PIN y entrar"}
          </button>
        </>
      ) : (
        <>
          <label>
            Tu PIN
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
          {error && <p className="admin-msg admin-msg-error">{error}</p>}
          <button type="button" disabled={enviando} onClick={entrar}>
            {enviando ? "Comprobando…" : "Entrar"}
          </button>
        </>
      )}
    </div>
  );
}

// --- Paso 2: elegir el partido pendiente -----------------------------------

function SelectorPartidoPendiente({ token, entidadTipo, entidadId, onElegido, onSalir }) {
  const [pendientes, setPendientes] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/api/partidas-herramienta/pendientes?entidadTipo=${entidadTipo}&entidadId=${entidadId}`, { token })
      .then(setPendientes)
      .catch((err) => setError(err.message || "No se han podido cargar tus partidos."));
  }, [token, entidadTipo, entidadId]);

  return (
    <div className="admin-form" style={{ maxWidth: 460 }}>
      <p className="chronicle-status" style={{ margin: 0 }}>Elige el partido que vas a jugar:</p>
      {error && <p className="admin-msg admin-msg-error">{error}</p>}
      {pendientes && pendientes.length === 0 && (
        <p className="chronicle-status">No tienes ningún partido pendiente aquí con la herramienta activada.</p>
      )}
      {pendientes && pendientes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: ".5rem" }}>
          {pendientes.map((p) => (
            <button key={p.partidoId} type="button" className="admin-tab" style={{ textAlign: "left" }} onClick={() => onElegido(p)}>
              {p.etiquetaPropia} vs {p.etiquetaRival}
              <br />
              <small>
                {p.tipo === "jornada" ? `Jornada ${p.jornada}` : p.rama === "final" ? "Final" : `Ronda ${p.ronda}`} ·{" "}
                {p.juegoConfigurado === "ambos" ? "501 o Cricket" : p.juegoConfigurado} · al mejor de {p.alMejorDe}
              </small>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="admin-link-btn" onClick={onSalir}>
        ← Salir
      </button>
    </div>
  );
}

function SelectorJuegoAmbos({ onElegido, onSalir }) {
  return (
    <div className="admin-form" style={{ maxWidth: 380 }}>
      <p className="chronicle-status" style={{ margin: 0 }}>¿A qué vais a jugar este partido?</p>
      <div className="live-tournament-toggle">
        <button type="button" onClick={() => onElegido("501")}>501</button>
        <button type="button" onClick={() => onElegido("cricket")}>Cricket</button>
      </div>
      <button type="button" className="admin-link-btn" onClick={onSalir}>
        ← Salir
      </button>
    </div>
  );
}

// --- Construcción de unidades a partir de la PartidaHerramienta ------------

function construirUnidadesPartida(partida) {
  const individual = partida.jugadoresId1.length === 1 && partida.jugadoresId2.length === 1;
  if (individual) {
    return construirUnidades({ modo: "individual", jugadores: [partida.nombres1[0], partida.nombres2[0]] });
  }
  return construirUnidades({
    modo: "parejas",
    equipos: [
      { nombre: partida.etiqueta1, integrantes: partida.nombres1 },
      { nombre: partida.etiqueta2, integrantes: partida.nombres2 },
    ],
    marcadorCompartido: true,
  });
}

function idJugadorTirador(partida, ladoIdx, unidad) {
  const ids = ladoIdx === 0 ? partida.jugadoresId1 : partida.jugadoresId2;
  return ids[unidad.siguienteIntegranteIdx];
}

// --- Resumen de marcador de la partida (legs ganados) ----------------------

function MarcadorLegs({ partida, numeroLeg }) {
  return (
    <p className="marcador-tiradas-visita" style={{ fontSize: "1.1rem" }}>
      <strong>{partida.etiqueta1}</strong> {partida.legsGanados1} — {partida.legsGanados2} <strong>{partida.etiqueta2}</strong>
      {" "}(al mejor de {partida.alMejorDe}) · Leg {numeroLeg}
    </p>
  );
}

// --- Marcador 501 -----------------------------------------------------------

function nuevaLeg501(partida, numeroLeg) {
  const base = construirUnidadesPartida(partida).map((u) => ({ ...u, restante: 501, abierto: partida.apertura === "simple" }));
  return { unidades: base, turnoIdx: (numeroLeg - 1) % base.length };
}

function MarcadorPartida501({ partida, token, onActualizada, onSalir }) {
  const inicio = useMemo(() => nuevaLeg501(partida, partida.legs.length + 1), [partida.id, partida.legs.length]);
  const [unidades, setUnidades] = useState(inicio.unidades);
  const [turnoIdx, setTurnoIdx] = useState(inicio.turnoIdx);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [restanteInicioVisita, setRestanteInicioVisita] = useState(501);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [modoEntrada, setModoEntrada] = useState("diana");
  const [finVisita, setFinVisita] = useState(false);
  const [estadisticas, setEstadisticas] = useState({});
  const [fase, setFase] = useState("jugando"); // jugando | enviando | error
  const [errorEnvio, setErrorEnvio] = useState("");

  function registrarVisita(jugadorId, dardos, puntos, esCheckout) {
    setEstadisticas((prev) => {
      const actual = prev[jugadorId] || { dardos: 0, puntos: 0, visitas100: 0, visitas140: 0, visitas180: 0 };
      const actualizado = {
        ...actual,
        dardos: actual.dardos + dardos,
        puntos: actual.puntos + puntos,
        visitas100: actual.visitas100 + (puntos >= 100 && puntos < 140 ? 1 : 0),
        visitas140: actual.visitas140 + (puntos >= 140 && puntos < 180 ? 1 : 0),
        visitas180: actual.visitas180 + (puntos >= 180 ? 1 : 0),
      };
      if (esCheckout) actualizado.checkout = puntos;
      return { ...prev, [jugadorId]: actualizado };
    });
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null || finVisita) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas })]);

    const unidad = unidades[turnoIdx];
    const yaAbierto = unidad.abierto;
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;

    if (!yaAbierto && !cumpleModalidad(resultado, partida.apertura)) {
      nuevoMensaje = `No cuenta: falta abrir a ${etiquetaModalidad(partida.apertura).toLowerCase()}.`;
    } else {
      const abreEsteDardo = !yaAbierto;
      const nuevoRestante = unidad.restante - resultado.valor;
      if (nuevoRestante < 0 || nuevoRestante === 1) {
        bust = true;
        nuevoMensaje = `Bust: la tirada no cuenta, sigue con ${restanteInicioVisita}.`;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
      } else if (nuevoRestante === 0) {
        if (cumpleModalidad(resultado, partida.cierre)) {
          gana = true;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
        } else {
          bust = true;
          nuevoMensaje = `Bust: llegas a 0 pero ese dardo no vale para cerrar (hace falta ${etiquetaModalidad(partida.cierre).toLowerCase()}).`;
          nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: u.abierto || abreEsteDardo } : u));
        }
      } else {
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: nuevoRestante, abierto: true } : u));
      }
    }

    const nuevasTiradas = [...tiradasVisita, { resultado, pos }];
    setUnidades(nuevasUnidades);
    setTiradasVisita(nuevasTiradas);
    setMensaje(nuevoMensaje);

    const jugadorId = idJugadorTirador(partida, turnoIdx, unidad);

    if (gana) {
      const puntosVisita = nuevasTiradas.reduce((s, t) => s + t.resultado.valor, 0);
      registrarVisita(jugadorId, nuevasTiradas.length, puntosVisita, true);
      setGanadorIdx(turnoIdx);
      return;
    }
    if (bust) {
      registrarVisita(jugadorId, nuevasTiradas.length, 0, false);
      setFinVisita(true);
      return;
    }
    if (nuevasTiradas.length >= 3) {
      const puntosVisita = nuevasTiradas.reduce((s, t) => s + t.resultado.valor, 0);
      registrarVisita(jugadorId, 3, puntosVisita, false);
      setFinVisita(true);
    }
  }

  function tirarVisitaTotal(valorTotal, { cierreValido }) {
    if (ganadorIdx !== null || finVisita) return;
    if (!Number.isFinite(valorTotal) || valorTotal < 0 || valorTotal > 180) {
      setMensaje("La puntuación de una visita tiene que estar entre 0 y 180.");
      return;
    }
    const unidad = unidades[turnoIdx];
    if (!unidad.abierto && partida.apertura !== "simple") {
      setMensaje(
        `Con este modo no se puede abrir a ${etiquetaModalidad(partida.apertura).toLowerCase()}: usa la diana o el teclado de números para el dardo de apertura.`
      );
      return;
    }
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, restanteInicioVisita, ganadorIdx, mensaje, finVisita, estadisticas })]);

    const resultado = { etiqueta: `${valorTotal} (visita)`, numero: null, multiplicador: null, valor: valorTotal, esDoble: false, esTriple: false, esBull: false };
    let nuevoMensaje = "";
    let nuevasUnidades = unidades;
    let bust = false;
    let gana = false;
    const cierreOk = partida.cierre === "simple" || cierreValido;

    const nuevoRestante = unidad.restante - valorTotal;
    if (nuevoRestante < 0 || nuevoRestante === 1) {
      bust = true;
      nuevoMensaje = `Bust: la visita no cuenta, sigue con ${restanteInicioVisita}.`;
      nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: true } : u));
    } else if (nuevoRestante === 0) {
      if (cierreOk) {
        gana = true;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: 0, abierto: true } : u));
      } else {
        bust = true;
        nuevoMensaje = `Bust: llegas a 0 pero hace falta marcar la casilla de cierre (${etiquetaModalidad(partida.cierre).toLowerCase()}) para que cuente.`;
        nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: restanteInicioVisita, abierto: true } : u));
      }
    } else {
      nuevasUnidades = unidades.map((u, i) => (i === turnoIdx ? { ...u, restante: nuevoRestante, abierto: true } : u));
    }

    const jugadorId = idJugadorTirador(partida, turnoIdx, unidad);
    registrarVisita(jugadorId, 3, bust ? 0 : valorTotal, gana);

    if (gana) {
      setUnidades(nuevasUnidades);
      setTiradasVisita([{ resultado, pos: undefined }]);
      setMensaje(nuevoMensaje);
      setGanadorIdx(turnoIdx);
      return;
    }

    // En este modo cada envío ya es la visita entera (a diferencia de
    // diana/números, donde una visita puede quedar a medias antes de los 3
    // dardos): se pasa directamente al siguiente jugador sin esperar un
    // segundo clic en "Siguiente jugador" — pedido de Iraitz, 2026-09-09.
    const conIntegranteActualizado = nuevasUnidades.map((u, i) =>
      i === turnoIdx && u.integrantes.length > 1
        ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length }
        : u
    );
    const siguienteIdx = (turnoIdx + 1) % conIntegranteActualizado.length;
    setUnidades(conIntegranteActualizado);
    setTurnoIdx(siguienteIdx);
    setTiradasVisita([]);
    setRestanteInicioVisita(conIntegranteActualizado[siguienteIdx].restante);
    // El mensaje de bust se descarta al pasar de turno (iría pegado al
    // jugador equivocado); el marcador ya deja ver que no se ha movido.
    setMensaje("");
    setFinVisita(false);
  }

  function deshacer() {
    if (historial.length === 0) return;
    const previo = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setUnidades(previo.unidades);
    setTurnoIdx(previo.turnoIdx);
    setTiradasVisita(previo.tiradasVisita);
    setRestanteInicioVisita(previo.restanteInicioVisita);
    setGanadorIdx(previo.ganadorIdx);
    setMensaje(previo.mensaje);
    setFinVisita(previo.finVisita);
    setEstadisticas(previo.estadisticas);
  }

  function finalizarVisita(unidadesActualizadas, turnoQueTiro) {
    const conIntegranteActualizado = unidadesActualizadas.map((u, i) =>
      i === turnoQueTiro && u.integrantes.length > 1 ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length } : u
    );
    const siguienteIdx = (turnoQueTiro + 1) % conIntegranteActualizado.length;
    setUnidades(conIntegranteActualizado);
    setTurnoIdx(siguienteIdx);
    setTiradasVisita([]);
    setRestanteInicioVisita(conIntegranteActualizado[siguienteIdx].restante);
    setMensaje("");
    setFinVisita(false);
  }

  useEffect(() => {
    if (ganadorIdx === null || fase !== "jugando") return;
    setFase("enviando");
    apiFetch(`/api/partidas-herramienta/${partida.id}/legs`, {
      token,
      method: "POST",
      body: JSON.stringify({ ladoGanador: ganadorIdx + 1, estadisticas }),
    })
      .then((actualizada) => {
        onActualizada(actualizada);
      })
      .catch((err) => {
        setErrorEnvio(err.message || "No se ha podido guardar el resultado del leg.");
        setFase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx]);

  const unidadActual = unidades[turnoIdx];
  const sugerencia = useMemo(() => {
    if (!unidadActual || ganadorIdx !== null || finVisita || !unidadActual.abierto) return null;
    const dardosDisponibles = 3 - tiradasVisita.length;
    if (dardosDisponibles <= 0) return null;
    return buscarCierre(unidadActual.restante, dardosDisponibles, partida.cierre);
  }, [unidadActual, tiradasVisita.length, partida.cierre, ganadorIdx, finVisita]);

  return (
    <div>
      <MarcadorLegs partida={partida} numeroLeg={partida.legs.length + 1} />
      <div className="marcador-jugadores">
        {unidades.map((u, i) => (
          <div key={u.id} className={`marcador-jugador ${turnoIdx === i && ganadorIdx === null ? "marcador-jugador-activo" : ""} ${ganadorIdx === i ? "marcador-jugador-ganador" : ""}`}>
            <strong>
              {i === inicio.turnoIdx && <span className="marcador-punto-inicio" title="Ha empezado este leg">●</span>}
              {u.etiqueta}
            </strong>
            {u.integrantes.length > 1 && <span style={{ fontSize: ".7em", color: "var(--steel)" }}>Tira: {tiradorActual(u)}</span>}
            <span className="marcador-restante">{u.restante}</span>
          </div>
        ))}
      </div>

      {fase === "enviando" && <p className="chronicle-status">Guardando el resultado del leg…</p>}
      {fase === "error" && (
        <>
          <p className="admin-msg admin-msg-error">{errorEnvio}</p>
          <button type="button" onClick={() => setFase("jugando")}>Reintentar</button>
        </>
      )}

      {fase === "jugando" && ganadorIdx === null && (
        <>
          <p>
            Turno de <strong>{tiradorActual(unidades[turnoIdx])}</strong>
            {modoEntrada === "total" ? " — introduce el total de la visita" : ` — dardo ${Math.min(tiradasVisita.length + 1, 3)} de 3`}
          </p>
          <div className="live-tournament-toggle">
            <button type="button" className={modoEntrada === "diana" ? "active" : ""} onClick={() => setModoEntrada("diana")}>Diana</button>
            <button type="button" className={modoEntrada === "numeros" ? "active" : ""} onClick={() => setModoEntrada("numeros")}>Números</button>
            <button type="button" className={modoEntrada === "total" ? "active" : ""} onClick={() => setModoEntrada("total")}>Puntuación total</button>
          </div>
          {modoEntrada === "diana" && <Diana onTirada={tirar} marcas={tiradasVisita.map((t) => t.pos).filter(Boolean)} deshabilitada={finVisita} />}
          {modoEntrada === "numeros" && <TecladoNumeros onTirada={tirar} deshabilitada={finVisita} />}
          {modoEntrada === "total" && <TecladoPuntuacion cierre={partida.cierre} onEnviar={tirarVisitaTotal} deshabilitada={finVisita} />}
          <p className="marcador-tiradas-visita">
            Esta visita: {tiradasVisita.length ? tiradasVisita.map((t) => t.resultado.etiqueta).join(", ") : "—"}
          </p>
          {sugerencia && <p className="admin-msg admin-msg-ok">Sugerencia de cierre: {sugerencia.join(" → ")}</p>}
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
            {/* En modo "total" cada envío ya avanza solo al siguiente jugador (ver
                tirarVisitaTotal), así que este botón se oculta salvo que finVisita
                se haya quedado a true de antes de cambiar a este modo a medio turno
                — caso raro, pero si pasara no queremos dejar el teclado bloqueado
                sin forma de continuar. */}
            {(modoEntrada !== "total" || finVisita) && (
              <button
                type="button"
                className={finVisita ? "admin-link-btn marcador-boton-destacado" : "admin-link-btn"}
                onClick={() => finalizarVisita(unidades, turnoIdx)}
              >
                {finVisita ? "Siguiente jugador →" : "Terminar turno ahora"}
              </button>
            )}
            <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
              Deshacer {modoEntrada === "total" ? "última visita" : "último dardo"}
            </button>
          </div>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        ← Salir de la herramienta
      </button>
    </div>
  );
}

// --- Marcador Cricket --------------------------------------------------

function simboloMarcas(n) {
  if (n <= 0) return "—";
  if (n === 1) return "／";
  if (n === 2) return "✕";
  return "⊗";
}

function nuevaLegCricket(partida, numeroLeg) {
  const base = construirUnidadesPartida(partida).map((u) => ({ ...u, marcas: marcasVacias() }));
  return { unidades: base, turnoIdx: (numeroLeg - 1) % base.length };
}

function MarcadorPartidaCricket({ partida, token, onActualizada, onSalir }) {
  const inicio = useMemo(() => nuevaLegCricket(partida, partida.legs.length + 1), [partida.id, partida.legs.length]);
  const [unidades, setUnidades] = useState(inicio.unidades);
  const [turnoIdx, setTurnoIdx] = useState(inicio.turnoIdx);
  const [tiradasVisita, setTiradasVisita] = useState([]);
  const [ganadorIdx, setGanadorIdx] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const [historial, setHistorial] = useState([]);
  const [finVisita, setFinVisita] = useState(false);
  const [modoEntrada, setModoEntrada] = useState("diana");
  const [estadisticas, setEstadisticas] = useState({});
  const [fase, setFase] = useState("jugando");
  const [errorEnvio, setErrorEnvio] = useState("");

  const puntos = useMemo(
    () => (partida.modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(unidades) : calcularPuntosCricket(unidades)),
    [unidades, partida.modoCricket]
  );

  function registrarVisita(jugadorId, marcas) {
    setEstadisticas((prev) => {
      const actual = prev[jugadorId] || { visitas: 0, marcas: 0 };
      return { ...prev, [jugadorId]: { visitas: actual.visitas + 1, marcas: actual.marcas + marcas } };
    });
  }

  function tirar(resultado, pos) {
    if (ganadorIdx !== null || finVisita) return;
    setHistorial((h) => [...h, clonar({ unidades, turnoIdx, tiradasVisita, ganadorIdx, mensaje, finVisita, estadisticas })]);

    const info = marcasDelDardo(resultado);
    let nuevasUnidades = unidades;
    let nuevoMensaje = "";
    if (info) {
      nuevasUnidades = unidades.map((u, i) =>
        i === turnoIdx ? { ...u, marcas: { ...u.marcas, [info.clave]: u.marcas[info.clave] + info.marcas } } : u
      );
    } else {
      nuevoMensaje = resultado.etiqueta === "Fuera" ? "Fuera de la diana, no cuenta." : `${resultado.etiqueta}: no juega en cricket, sin efecto.`;
    }

    const nuevasTiradas = [...tiradasVisita, { resultado, pos }];
    setUnidades(nuevasUnidades);
    setTiradasVisita(nuevasTiradas);
    setMensaje(nuevoMensaje);

    const puntosNuevos = partida.modoCricket === "cutthroat" ? calcularPuntosCricketCutThroat(nuevasUnidades) : calcularPuntosCricket(nuevasUnidades);
    const unidadQueTiro = nuevasUnidades[turnoIdx];
    const jugadorId = idJugadorTirador(partida, turnoIdx, unidades[turnoIdx]);
    const marcasVisita = nuevasTiradas.reduce((s, t) => s + (marcasDelDardo(t.resultado)?.marcas || 0), 0);

    if (jugadorHaCerradoTodo(unidadQueTiro)) {
      const mejor = partida.modoCricket === "cutthroat" ? Math.min(...puntosNuevos) : Math.max(...puntosNuevos);
      const cumpleCondicion = partida.modoCricket === "cutthroat" ? puntosNuevos[turnoIdx] <= mejor : puntosNuevos[turnoIdx] >= mejor;
      if (cumpleCondicion) {
        registrarVisita(jugadorId, marcasVisita);
        setGanadorIdx(turnoIdx);
        return;
      }
    }

    if (nuevasTiradas.length >= 3) {
      registrarVisita(jugadorId, marcasVisita);
      setFinVisita(true);
    }
  }

  function deshacer() {
    if (historial.length === 0) return;
    const previo = historial[historial.length - 1];
    setHistorial((h) => h.slice(0, -1));
    setUnidades(previo.unidades);
    setTurnoIdx(previo.turnoIdx);
    setTiradasVisita(previo.tiradasVisita);
    setGanadorIdx(previo.ganadorIdx);
    setMensaje(previo.mensaje);
    setFinVisita(previo.finVisita);
    setEstadisticas(previo.estadisticas);
  }

  function finalizarVisita(unidadesActualizadas, turnoQueTiro) {
    const conIntegranteActualizado = unidadesActualizadas.map((u, i) =>
      i === turnoQueTiro && u.integrantes.length > 1 ? { ...u, siguienteIntegranteIdx: (u.siguienteIntegranteIdx + 1) % u.integrantes.length } : u
    );
    const siguienteIdx = (turnoQueTiro + 1) % conIntegranteActualizado.length;
    setUnidades(conIntegranteActualizado);
    setTurnoIdx(siguienteIdx);
    setTiradasVisita([]);
    setMensaje("");
    setFinVisita(false);
  }

  useEffect(() => {
    if (ganadorIdx === null || fase !== "jugando") return;
    setFase("enviando");
    apiFetch(`/api/partidas-herramienta/${partida.id}/legs`, {
      token,
      method: "POST",
      body: JSON.stringify({ ladoGanador: ganadorIdx + 1, estadisticas }),
    })
      .then((actualizada) => onActualizada(actualizada))
      .catch((err) => {
        setErrorEnvio(err.message || "No se ha podido guardar el resultado del leg.");
        setFase("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ganadorIdx]);

  return (
    <div>
      <MarcadorLegs partida={partida} numeroLeg={partida.legs.length + 1} />
      <div className="marcador-jugadores">
        {unidades.map((u, i) => (
          <div key={u.id} className={`marcador-jugador ${turnoIdx === i && ganadorIdx === null ? "marcador-jugador-activo" : ""} ${ganadorIdx === i ? "marcador-jugador-ganador" : ""}`}>
            <strong>
              {i === inicio.turnoIdx && <span className="marcador-punto-inicio" title="Ha empezado este leg">●</span>}
              {u.etiqueta}
            </strong>
            {u.integrantes.length > 1 && <span style={{ fontSize: ".7em", color: "var(--steel)" }}>Tira: {tiradorActual(u)}</span>}
            <span className="marcador-restante">{puntos[i]}</span>
          </div>
        ))}
      </div>

      <div className="marcador-tabla-scroll">
        <table className="marcador-tabla">
          <thead>
            <tr>
              <th></th>
              {unidades.map((u, i) => (
                <th key={u.id} className={ganadorIdx === i ? "marcador-jugador-ganador" : ""}>{u.etiqueta}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {NUMEROS_CRICKET.map((num) => (
              <tr key={num.clave}>
                <th scope="row">{num.etiqueta}</th>
                {unidades.map((u, i) => (
                  <td key={u.id} className={u.marcas[num.clave] >= 3 ? "marcador-celda-cerrada" : ""}>{simboloMarcas(u.marcas[num.clave])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fase === "enviando" && <p className="chronicle-status">Guardando el resultado del leg…</p>}
      {fase === "error" && (
        <>
          <p className="admin-msg admin-msg-error">{errorEnvio}</p>
          <button type="button" onClick={() => setFase("jugando")}>Reintentar</button>
        </>
      )}

      {fase === "jugando" && ganadorIdx === null && (
        <>
          <p style={{ marginTop: "1rem" }}>
            Turno de <strong>{tiradorActual(unidades[turnoIdx])}</strong> — dardo {Math.min(tiradasVisita.length + 1, 3)} de 3
          </p>
          <div className="live-tournament-toggle">
            <button type="button" className={modoEntrada === "diana" ? "active" : ""} onClick={() => setModoEntrada("diana")}>Diana</button>
            <button type="button" className={modoEntrada === "numeros" ? "active" : ""} onClick={() => setModoEntrada("numeros")}>Números</button>
          </div>
          {modoEntrada === "diana" ? (
            <Diana onTirada={tirar} marcas={tiradasVisita.map((t) => t.pos).filter(Boolean)} deshabilitada={finVisita} />
          ) : (
            <TecladoNumeros onTirada={tirar} deshabilitada={finVisita} />
          )}
          <p className="marcador-tiradas-visita">
            Esta visita: {tiradasVisita.length ? tiradasVisita.map((t) => t.resultado.etiqueta).join(", ") : "—"}
          </p>
          {mensaje && <p className="admin-msg admin-msg-error">{mensaje}</p>}
          <div style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", marginTop: ".6rem" }}>
            <button
              type="button"
              className={finVisita ? "admin-link-btn marcador-boton-destacado" : "admin-link-btn"}
              onClick={() => finalizarVisita(unidades, turnoIdx)}
            >
              {finVisita ? "Siguiente jugador →" : "Terminar turno ahora"}
            </button>
            <button type="button" className="admin-link-btn" onClick={deshacer} disabled={historial.length === 0}>
              Deshacer último dardo
            </button>
          </div>
        </>
      )}

      <button type="button" className="admin-link-btn" style={{ marginTop: "1rem" }} onClick={onSalir}>
        ← Salir de la herramienta
      </button>
    </div>
  );
}

// --- Envoltorio: partida completa (varios legs hasta terminar) ------------

function PartidaCompleta({ partida, token, onSalir }) {
  const [partidaActual, setPartidaActual] = useState(partida);

  if (partidaActual.finalizada) {
    return (
      <div className="admin-form" style={{ maxWidth: 460 }}>
        <p className="admin-msg admin-msg-ok" style={{ fontSize: "1rem" }}>
          🏆 Partido terminado: {partidaActual.etiqueta1} {partidaActual.legsGanados1} — {partidaActual.legsGanados2} {partidaActual.etiqueta2}
        </p>
        <p className="chronicle-status">El resultado ya se ha aplicado al partido.</p>
        <button type="button" onClick={onSalir}>Volver a mis partidos</button>
      </div>
    );
  }

  // key=legs.length fuerza que el marcador se remonte entero al empezar cada
  // leg nuevo (nuevas unidades a 501/marcas vacías, turno según toque) — si
  // no, el estado interno (unidades, turno, historial…) del leg anterior se
  // quedaría colgado al recibir la partida actualizada del backend.
  if (partidaActual.juego === "cricket") {
    return (
      <MarcadorPartidaCricket
        key={partidaActual.legs.length}
        partida={partidaActual}
        token={token}
        onActualizada={setPartidaActual}
        onSalir={onSalir}
      />
    );
  }
  return (
    <MarcadorPartida501
      key={partidaActual.legs.length}
      partida={partidaActual}
      token={token}
      onActualizada={setPartidaActual}
      onSalir={onSalir}
    />
  );
}

// --- Componente principal ---------------------------------------------------

const CLAVE_TOKEN = "herramientaPartidasToken";
const CLAVE_JUGADOR = "herramientaPartidasJugador";

export default function AccesoHerramienta({ activa, entidadTipo, entidadId, entidadNombre }) {
  const [mostrar, setMostrar] = useState(false);
  const [token, setToken] = useState(() => {
    try { return sessionStorage.getItem(CLAVE_TOKEN) || ""; } catch { return ""; }
  });
  const [jugador, setJugador] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(CLAVE_JUGADOR) || "null"); } catch { return null; }
  });
  const [pendienteElegido, setPendienteElegido] = useState(null);
  const [partida, setPartida] = useState(null);
  const [errorIniciar, setErrorIniciar] = useState("");

  function salirDeSesion() {
    try {
      sessionStorage.removeItem(CLAVE_TOKEN);
      sessionStorage.removeItem(CLAVE_JUGADOR);
    } catch { /* almacenamiento no disponible, no pasa nada */ }
    setToken("");
    setJugador(null);
    setPendienteElegido(null);
    setPartida(null);
  }

  function alEntrar({ token: nuevoToken, jugador: nuevoJugador }) {
    try {
      sessionStorage.setItem(CLAVE_TOKEN, nuevoToken);
      sessionStorage.setItem(CLAVE_JUGADOR, JSON.stringify(nuevoJugador));
    } catch { /* almacenamiento no disponible, se queda solo en memoria */ }
    setToken(nuevoToken);
    setJugador(nuevoJugador);
  }

  async function iniciarPartido(pendiente, juegoElegido) {
    setErrorIniciar("");
    try {
      const data = await apiFetch("/api/partidas-herramienta/iniciar", {
        token,
        method: "POST",
        body: JSON.stringify({ tipo: pendiente.tipo, partidoId: pendiente.partidoId, juegoElegido }),
      });
      setPartida(data);
    } catch (err) {
      if (err.status === 401) {
        salirDeSesion();
        return;
      }
      setErrorIniciar(err.message || "No se ha podido empezar la partida.");
      setPendienteElegido(null);
    }
  }

  if (!activa) return null;

  if (!mostrar) {
    return (
      <div style={{ marginTop: "1.5rem" }}>
        <button type="button" onClick={() => setMostrar(true)}>
          🎯 Jugar con la herramienta de marcador
        </button>
      </div>
    );
  }

  return (
    <div className="marcador-herramienta-publica" style={{ marginTop: "1.5rem", border: "1px solid var(--line)", padding: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>Herramienta de marcador — {entidadNombre}</h3>

      {!token && <LoginPin onEntrar={alEntrar} />}

      {token && !partida && (
        <>
          <p className="chronicle-status">
            Sesión: <strong>{jugador?.nombre}</strong>{" "}
            <button type="button" className="admin-link-btn" onClick={salirDeSesion}>(cambiar de jugador)</button>
          </p>
          {errorIniciar && <p className="admin-msg admin-msg-error">{errorIniciar}</p>}
          {!pendienteElegido && (
            <SelectorPartidoPendiente
              token={token}
              entidadTipo={entidadTipo}
              entidadId={entidadId}
              onElegido={(p) => {
                if (p.juegoConfigurado === "ambos") {
                  setPendienteElegido(p);
                } else {
                  iniciarPartido(p);
                }
              }}
              onSalir={() => setMostrar(false)}
            />
          )}
          {pendienteElegido && (
            <SelectorJuegoAmbos
              onElegido={(juego) => iniciarPartido(pendienteElegido, juego)}
              onSalir={() => setPendienteElegido(null)}
            />
          )}
        </>
      )}

      {token && partida && (
        <PartidaCompleta
          partida={partida}
          token={token}
          onSalir={() => {
            setPartida(null);
            setPendienteElegido(null);
          }}
        />
      )}
    </div>
  );
}
