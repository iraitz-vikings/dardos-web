import { useState } from "react";
import { propsCabeceraDesplegable } from "./cabeceraDesplegable.js";
import { useLang } from "./i18n.jsx";

// Calendario de partidos de un equipo en una competición externa, agrupado
// en desplegables por jornada — igual que las jornadas de las ligas del club
// (LigaPage.jsx / AdminLigasClub.jsx). La jornada la rellena la
// sincronización automática (hoy Connection Darts); los partidos creados a
// mano no tienen jornada y van en un bloque aparte al final. Si ningún
// partido tiene jornada (Radikal, Phoenix, partidos manuales) se muestra la
// lista de siempre, sin desplegables.
//
// Por defecto solo se abre la próxima jornada sin terminar; las demás se
// abren/cierran pulsando su cabecera.
//
// renderPartido(p) debe devolver un <li> (cada pantalla pinta el partido a
// su manera: fila editable del capitán, fila del admin, fila de solo
// lectura...).

// Un partido externo está terminado cuando ya tiene resultado.
function estadoJornada(partidos) {
  const conResultado = partidos.filter((p) => !!p.resultado).length;
  if (conResultado === partidos.length) return "terminada";
  return conResultado > 0 ? "en_curso" : "pendiente";
}

function etiquetaEstado(t, estado) {
  if (estado === "terminada") return t("ligaPage.estadoTerminada");
  if (estado === "en_curso") return t("ligaPage.estadoEnCurso");
  return t("ligaPage.estadoPendiente");
}

export default function CalendarioJornadas({ partidos, renderPartido, vacio }) {
  const { t, lang } = useLang();
  const [manual, setManual] = useState({});

  if (partidos.length === 0) {
    return (
      <ul>
        <li className="chronicle-status" style={{ fontSize: ".85em" }}>{vacio}</li>
      </ul>
    );
  }

  const porJornada = {};
  const sinJornada = [];
  for (const p of partidos) {
    if (p.jornada == null) {
      sinJornada.push(p);
      continue;
    }
    if (!porJornada[p.jornada]) porJornada[p.jornada] = [];
    porJornada[p.jornada].push(p);
  }
  const jornadas = Object.keys(porJornada).map(Number).sort((a, b) => a - b);

  if (jornadas.length === 0) return <ul>{partidos.map(renderPartido)}</ul>;

  const proxima = jornadas.find((j) => estadoJornada(porJornada[j]) !== "terminada");
  const fechaCorta = (iso) =>
    new Date(iso).toLocaleDateString(lang === "eu" ? "eu-ES" : "es-ES", { day: "2-digit", month: "2-digit" });

  const bloque = (clave, titulo, lista, estado, abiertaPorDefecto) => {
    const abierta = manual[clave] !== undefined ? manual[clave] : abiertaPorDefecto;
    return (
      <div key={clave} className="admin-cuadro-maquina">
        <h4 className="admin-ronda-header" {...propsCabeceraDesplegable(abierta, () => setManual((prev) => ({ ...prev, [clave]: !abierta })))}>
          <span>
            {titulo}
            {estado && <> <span className={`admin-ronda-estado admin-ronda-estado-${estado}`}>{etiquetaEstado(t, estado)}</span></>}
          </span>
          <span className="admin-ronda-toggle">{abierta ? t("ligaPage.ocultar") : t("ligaPage.ver")}</span>
        </h4>
        {abierta && <ul>{lista.map(renderPartido)}</ul>}
      </div>
    );
  };

  return (
    <div style={{ marginTop: ".4rem" }}>
      {jornadas.map((j) => {
        const lista = porJornada[j];
        return bloque(
          `j-${j}`,
          `${t("ligaPage.jornada").replace("{n}", j)} · ${fechaCorta(lista[0].fecha)}`,
          lista,
          estadoJornada(lista),
          j === proxima
        );
      })}
      {sinJornada.length > 0 && bloque("otros", t("competiciones.otrosPartidos"), sinJornada, null, false)}
    </div>
  );
}
