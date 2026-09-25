import { useCallback, useEffect, useState } from "react";
import { CabeceraPartida, CuadroJugador, fmtProm } from "./CuadroJugador.jsx";
import { apiFetch } from "./apiHerramienta.js";
import { ConexionRival, VideoStream } from "./CamarasPartida.jsx";
import {
  NUMEROS_CRICKET,
  calcularPuntosCricket,
  calcularPuntosCricketCutThroat,
  construirUnidades,
  marcasVacias,
  promedio3Dardos,
  sumarEstadisticas501,
  sumarEstadisticasCricket,
} from "./dardosLogica.js";

// Marcador en directo, de solo lectura, de un partido de torneo/liga que se
// está jugando con la herramienta (JuegoHerramienta.jsx) — ventanita que se
// abre desde la página pública del torneo/liga (cuadro, "por máquina" o
// calendario de jornadas). El dispositivo de la diana manda el estado del leg
// dardo a dardo (useEnvioDirecto en JuegoHerramienta.jsx) y aquí se lee con
// polling de GET /api/partidas-herramienta/:id/directo. Si en la diana
// tienen las cámaras encendidas, se puede ver además la de la diana
// (CamaraPublica, más abajo).

const INTERVALO_MS = 3000;

// Un partido de la página pública (CuadroPartido o PartidoLiga, con su
// partidaHerramienta incluida por el backend) se está jugando ahora mismo
// con la herramienta.
export function esPartidoEnDirecto(partido) {
  return !!(partido?.partidaHerramienta && !partido.partidaHerramienta.finalizada && !partido.ganador);
}

export function BotonDirecto({ partido, onVer }) {
  if (!onVer || !esPartidoEnDirecto(partido)) return null;
  return (
    <button
      type="button"
      className="directo-boton"
      onClick={(e) => {
        e.stopPropagation();
        onVer(partido);
      }}
    >
      <span className="directo-punto" aria-hidden="true" /> En directo
    </button>
  );
}

function simboloMarcas(n) {
  if (n <= 0) return "—";
  if (n === 1) return "／";
  if (n === 2) return "✕";
  return "⊗";
}

// Estado del leg en curso: el que ha mandado la diana o, si todavía no ha
// llegado nada de este leg, el inicial (mismo reparto que
// construirUnidadesPartida/nuevaLeg* en JuegoHerramienta.jsx).
function estadoLeg(partida) {
  const v = partida.visitaEnCurso;
  if (v && Array.isArray(v.unidades)) {
    return {
      unidades: v.unidades,
      turnoIdx: v.turnoIdx ?? 0,
      tiradas: v.tiradas || [],
      estadisticas: v.estadisticas || {},
      ultimaVisitaLado: v.ultimaVisitaLado || [null, null],
      inicioTurnoIdx: v.inicioTurnoIdx ?? null,
    };
  }
  const individual = partida.jugadoresId1.length === 1 && partida.jugadoresId2.length === 1;
  const base = individual
    ? construirUnidades({ modo: "individual", jugadores: [partida.nombres1[0], partida.nombres2[0]] })
    : construirUnidades({
        modo: "parejas",
        equipos: [
          { nombre: partida.etiqueta1, integrantes: partida.nombres1 },
          { nombre: partida.etiqueta2, integrantes: partida.nombres2 },
        ],
        marcadorCompartido: true,
      });
  const unidades = base.map((u) => (partida.juego === "cricket" ? { ...u, marcas: marcasVacias() } : { ...u, restante: 501 }));
  const turnoIdx = partida.legs.length % unidades.length;
  return { unidades, turnoIdx, tiradas: [], estadisticas: {}, ultimaVisitaLado: [null, null], inicioTurnoIdx: turnoIdx };
}

function Tablero({ partida }) {
  const { unidades, turnoIdx, tiradas, estadisticas, ultimaVisitaLado, inicioTurnoIdx } = estadoLeg(partida);
  const esCricket = partida.juego === "cricket";
  const puntos = esCricket
    ? partida.modoCricket === "cutthroat"
      ? calcularPuntosCricketCutThroat(unidades)
      : calcularPuntosCricket(unidades)
    : null;

  return (
    <>
      <CabeceraPartida alMejorDe={partida.alMejorDe} numeroLeg={partida.legs.length + 1} />
      <div className="marcador-jugadores">
        {unidades.map((u, i) => {
          const idsLado = i === 0 ? partida.jugadoresId1 : partida.jugadoresId2;
          const activo = turnoIdx === i;
          let slides;
          if (esCricket) {
            const leg = sumarEstadisticasCricket(...idsLado.map((id) => estadisticas[id]));
            slides = [
              {
                titulo: "Este leg",
                filas: [
                  ["Marcas/visita", fmtProm(leg.visitas ? leg.marcas / leg.visitas : null)],
                  ["Última", ultimaVisitaLado[i] ?? "—"],
                  ["Visitas", leg.visitas || 0],
                ],
              },
            ];
          } else {
            const leg = sumarEstadisticas501(...idsLado.map((id) => estadisticas[id]));
            slides = [
              {
                titulo: "Este leg",
                filas: [
                  ["Promedio", fmtProm(promedio3Dardos(leg.puntos, leg.dardos))],
                  ["Última", ultimaVisitaLado[i] ?? "—"],
                  ["Dardos", leg.dardos || 0],
                ],
              },
            ];
          }
          return (
            <CuadroJugador
              key={u.id ?? i}
              unidad={u}
              esInicioLeg={i === inicioTurnoIdx}
              activo={activo}
              ganador={false}
              legsGanados={i === 0 ? partida.legsGanados1 : partida.legsGanados2}
              valorPrincipal={esCricket ? puntos[i] : u.restante}
              dardoInfo={activo ? `Dardo ${Math.min(tiradas.length + 1, 3)} de 3` : null}
              slides={slides}
            />
          );
        })}
      </div>

      <p className="marcador-tiradas-visita">Esta visita: {tiradas.length ? tiradas.join(", ") : "—"}</p>

      {esCricket && (
        <div className="marcador-tabla-scroll">
          <table className="marcador-tabla">
            <thead>
              <tr>
                <th></th>
                {unidades.map((u, i) => (
                  <th key={u.id ?? i}>{u.etiqueta}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {NUMEROS_CRICKET.map((num) => (
                <tr key={num.clave}>
                  <th scope="row">{num.etiqueta}</th>
                  {unidades.map((u, i) => (
                    <td key={u.id ?? i} className={u.marcas?.[num.clave] >= 3 ? "marcador-celda-cerrada" : ""}>
                      {simboloMarcas(u.marcas?.[num.clave] || 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// Cámara de la diana en directo (fase 2): se conecta por WebRTC al
// dispositivo de la diana como espectador del público (ConexionRival con
// publico, ver CamarasPartida.jsx) — solo mientras esta ventanita está
// abierta y el visitante ha pulsado "Ver cámara". El backend limita cuántos
// espectadores del público puede haber a la vez; si está completo se avisa.
function CamaraPublica({ partidaId }) {
  const [emisorId, setEmisorId] = useState(null);
  const [sinCamara, setSinCamara] = useState(false);
  const [datos, setDatos] = useState({ estado: "conectando" });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    apiFetch(`/api/partidas-herramienta/${partidaId}/camara/estado`)
      .then((d) => {
        if (!vivo) return;
        if (d.emisores && d.emisores.length > 0) setEmisorId(d.emisores[0]);
        else setSinCamara(true);
      })
      .catch(() => vivo && setSinCamara(true));
    return () => {
      vivo = false;
    };
  }, [partidaId, intento]);

  const onEstado = useCallback((_id, d) => {
    if (d) setDatos(d);
  }, []);
  const reintentar = useCallback(() => {
    setDatos({ estado: "conectando" });
    setIntento((n) => n + 1);
  }, []);

  // Si en 25s no ha conectado (p.ej. el dispositivo de la diana se cerró de
  // golpe sin apagar las cámaras y nadie está emitiendo de verdad), se deja
  // de esperar y se ofrece reintentar.
  useEffect(() => {
    if (datos.estado !== "conectando") return undefined;
    const plazo = setTimeout(() => setDatos((d) => (d.estado === "conectando" ? { ...d, estado: "error" } : d)), 25000);
    return () => clearTimeout(plazo);
  }, [datos.estado, intento]);

  if (sinCamara) return <p className="chronicle-status">La cámara no está disponible ahora mismo.</p>;
  if (!emisorId) return <p className="chronicle-status">Conectando con la cámara…</p>;

  return (
    <div className="directo-camara">
      <ConexionRival key={`${emisorId}-${intento}`} partidaId={partidaId} emisorId={emisorId} publico onEstado={onEstado} onCaducado={reintentar} />
      {datos.estado === "completo" ? (
        <p className="chronicle-status">{datos.detalle || "La cámara está completa ahora mismo. Prueba otra vez en un rato."}</p>
      ) : datos.estado === "error" ? (
        <p className="chronicle-status">
          No se ha podido conectar con la cámara (puede que no esté emitiendo o que tu red lo impida).{" "}
          <button type="button" className="admin-link-btn" onClick={reintentar}>
            Reintentar
          </button>
        </p>
      ) : (
        <>
          <div className="camaras-partida-videos directo-camara-videos">
            <VideoStream stream={datos.diana} etiqueta="Diana" />
          </div>
          {datos.estado !== "conectado" && <p className="chronicle-status">Conectando con la cámara…</p>}
        </>
      )}
    </div>
  );
}

export default function DirectoPartida({ partidaId, titulo, onCerrar }) {
  const [partida, setPartida] = useState(null);
  const [error, setError] = useState(null);
  const [verCamara, setVerCamara] = useState(false);

  useEffect(() => {
    let vivo = true;
    const cargar = () =>
      apiFetch(`/api/partidas-herramienta/${partidaId}/directo`)
        .then((d) => {
          if (!vivo) return;
          setPartida(d);
          setError(null);
        })
        .catch((err) => {
          if (vivo) setError(err.message || "No se ha podido cargar el marcador.");
        });
    cargar();
    const intervalo = setInterval(cargar, INTERVALO_MS);
    return () => {
      vivo = false;
      clearInterval(intervalo);
    };
  }, [partidaId]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCerrar]);

  return (
    <div className="perfil-jugador-modal" onClick={onCerrar}>
      <div className="perfil-jugador-panel directo-partida-panel" role="dialog" aria-label="Marcador en directo" onClick={(e) => e.stopPropagation()}>
        <div className="admin-partido-panel-header">
          <h4>
            <span className="directo-punto" aria-hidden="true" /> {titulo || "En directo"}
          </h4>
          <button type="button" className="admin-link-btn" onClick={onCerrar}>
            Cerrar ✕
          </button>
        </div>

        {!partida && !error && <p className="chronicle-status">Cargando marcador…</p>}
        {!partida && error && <p className="chronicle-status">{error}</p>}
        {partida && partida.finalizada && (
          <p className="chronicle-status">
            Partido terminado: {partida.etiqueta1} {partida.legsGanados1} – {partida.legsGanados2} {partida.etiqueta2}
          </p>
        )}
        {partida && !partida.finalizada && partida.camarasActivas && !verCamara && (
          <button type="button" className="directo-boton" style={{ margin: "0 0 .8rem" }} onClick={() => setVerCamara(true)}>
            🎥 Ver cámara
          </button>
        )}
        {partida && !partida.finalizada && partida.camarasActivas && verCamara && (
          <>
            <CamaraPublica partidaId={partidaId} />
            <button type="button" className="admin-link-btn" style={{ margin: ".3rem 0 .8rem" }} onClick={() => setVerCamara(false)}>
              Ocultar cámara
            </button>
          </>
        )}
        {partida && !partida.finalizada && <Tablero partida={partida} />}
        {partida && !partida.finalizada && error && (
          <p className="admin-hint">Sin conexión ahora mismo, reintentando…</p>
        )}
      </div>
    </div>
  );
}
