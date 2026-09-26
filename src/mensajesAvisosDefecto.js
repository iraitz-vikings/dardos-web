// Textos por defecto de los avisos automáticos, tal cual están escritos en
// el backend (resolverMensaje en src/routes/torneosClub.js, ligasClub.js y
// src/lib/avisoTemporizadorPartidos.js). Se muestran como ejemplo en los
// paneles "Mensajes de avisos" de torneos y de ligas. Antes cada panel
// tenía su propia copia (auditoría 2026-09-26): si cambia un texto por
// defecto en el backend, cambiarlo aquí, en un solo sitio.

export const IDIOMAS_MENSAJE_AVISO = [
  { id: "es", etiqueta: "Castellano" },
  { id: "eu", etiqueta: "Euskera" },
  { id: "fr", etiqueta: "Francés" },
];

export const DEFECTOS_MENSAJE_AVISO = {
  bienvenida: {
    titulo: {
      es: "¡Ya estás en el cuadro! · {competicion}",
      eu: "Jada koadroan zaude! · {competicion}",
      fr: "Tu es dans le tableau ! · {competicion}",
    },
    cuerpo: {
      es: "Se ha hecho el sorteo y ya tienes tu sitio en el cuadro. ¡Mucha suerte!",
      eu: "Zozketa egin da eta jada baduzu zure lekua koadroan. Zorte on!",
      fr: "Le tirage au sort a eu lieu et tu as déjà ta place dans le tableau. Bonne chance !",
    },
  },
  // {minutos} se sustituye (solo con el temporizador activo) por p.ej.
  // " Tienes 5 min para empezar. Si no empezáis antes de que se acabe el
  // tiempo, el partido se dará por perdido." — ver torneosClub.js.
  enCurso: {
    titulo: {
      es: "¡Tu partido empieza ahora! · {competicion}",
      eu: "Zure partida orain hasten da! · {competicion}",
      fr: "Ton match commence maintenant ! · {competicion}",
    },
    cuerpo: {
      es: "{enfrentamiento} en {maquina}.{minutos}",
      eu: "{enfrentamiento} ({maquina} makinan).{minutos}",
      fr: "{enfrentamiento} sur {maquina}.{minutos}",
    },
  },
  programado: {
    titulo: {
      es: "Partido programado: {competicion}",
      eu: "Partida programatuta: {competicion}",
      fr: "Match programmé : {competicion}",
    },
    cuerpo: {
      es: "{enfrentamiento} el {fecha} en {maquina}.",
      eu: "{enfrentamiento} ({fecha}) — {maquina} makina.",
      fr: "{enfrentamiento} le {fecha} sur {maquina}.",
    },
  },
  eliminado: {
    titulo: {
      es: "Eliminado: {competicion}",
      eu: "Kanporatuta: {competicion}",
      fr: "Éliminé : {competicion}",
    },
    cuerpo: {
      es: "Has quedado eliminado del cuadrante. ¡Gracias por participar!",
      eu: "Koadrotik kanporatuta zaude. Eskerrik asko parte hartzeagatik!",
      fr: "Tu as été éliminé du tableau. Merci d'avoir participé !",
    },
  },
  campeon: {
    titulo: {
      es: "¡Campeón! · {competicion}",
      eu: "Txapelduna! · {competicion}",
      fr: "Champion ! · {competicion}",
    },
    cuerpo: {
      es: "¡Enhorabuena, has ganado el cuadrante!",
      eu: "Zorionak, koadroa irabazi duzu!",
      fr: "Félicitations, tu as remporté le tableau !",
    },
  },
  // Solo se envía si el torneo tiene el temporizador activo (ver
  // src/lib/avisoTemporizadorPartidos.js en el backend).
  unMinuto: {
    titulo: {
      es: "¡Falta 1 minuto! · {competicion}",
      eu: "Minutu bat falta da! · {competicion}",
      fr: "Plus qu'une minute ! · {competicion}",
    },
    cuerpo: {
      es: "{enfrentamiento}: queda 1 minuto para presentaros a jugar. Si no empezáis antes de que se acabe el tiempo, el partido se dará por perdido.",
      eu: "{enfrentamiento}: minutu bat geratzen da jokatzera aurkezteko. Denbora amaitu aurretik hasten ez bazarete, partida galdutzat emango da.",
      fr: "{enfrentamiento} : il reste 1 minute pour vous présenter. Si vous ne commencez pas avant la fin du temps, le match sera déclaré perdu.",
    },
  },
};

// Las ligas no tienen temporizador: sin {minutos} ni "falta 1 minuto".
export const DEFECTOS_MENSAJE_AVISO_LIGA = (() => {
  const { unMinuto, ...resto } = DEFECTOS_MENSAJE_AVISO; // eslint-disable-line no-unused-vars
  return {
    ...resto,
    enCurso: {
      ...resto.enCurso,
      cuerpo: Object.fromEntries(Object.entries(resto.enCurso.cuerpo).map(([k, v]) => [k, v.replace("{minutos}", "")])),
    },
  };
})();
