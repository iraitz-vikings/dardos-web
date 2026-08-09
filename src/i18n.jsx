import { createContext, useContext, useEffect, useState } from "react";

const dic = {
  es: {
    "nav.cronica": "Crónica",
    "nav.galeria": "Galería",
    "nav.torneosDirecto": "Torneos en directo",
    "nav.historico": "Histórico",
    "nav.proximoTorneo": "Próximo torneo",
    "nav.contacto": "Contacto",

    "hero.eyebrow": "Vikings · Club de dardos",
    "hero.title1": "La incursión",
    "hero.title2": "ya ha comenzado",
    "hero.subtitle": "Noticias, fotos de eventos y crónicas del club. Un solo lugar para seguir todo lo que pasa dentro y fuera de la diana.",

    "torneo.eyebrow": "Próximo evento",
    "torneo.title": "Próximo torneo",

    "video.eyebrow": "Vikings TV",
    "video.title": "Con esto empieza todo",
    "video.play": "▶ Reproducir vídeo",

    "live.eyebrow": "En directo",
    "live.title": "Torneos en directo",
    "live.none": "Ahora mismo no hay ningún torneo en directo.",
    "live.byMachine": "Por máquina",
    "live.byBracket": "Por cuadrante",
    "live.noActiveMatch": "Sin enfrentamiento en curso",
    "live.viewFull": "Ver torneo completo →",
    "live.searchPlaceholder": "Buscar participante…",
    "live.notPublished": "El cuadro todavía no está publicado.",

    "cronica.eyebrow": "Crónica del club",
    "cronica.title": "Últimas noticias",

    "galeria.eyebrow": "Galería",
    "galeria.title": "Fotos y vídeos del club",
    "galeria.teaser": "Revive los mejores momentos del club: fotos de eventos y vídeos de partidas.",
    "galeria.cta": "Ver galería completa →",
    "galeria.none": "Todavía no hay nada en la galería. Se irá llenando con cada noticia y foto o vídeo que se publique.",
    "galeria.playSound": "🔊 Reproducir sonido",
    "galeria.mute": "🔊 Silenciar",
    "galeria.muted": "🔇 Sonido silenciado",

    "historico.eyebrow": "Histórico",
    "historico.title": "Torneos finalizados",
    "historico.loading": "Cargando…",
    "historico.none": "Todavía no hay torneos finalizados.",

    "torneoPage.eyebrow": "Torneo del club",
    "torneoPage.loading": "Cargando el torneo…",
    "torneoPage.notfound": "No hemos encontrado este torneo, o ya no es público.",
    "torneoPage.share": "Compartir / código QR",

    "patrocinadores.eyebrow": "Con la ayuda de",

    "footer.copy": "Vikings Darts Club",
  },
  eu: {
    "nav.cronica": "Kronika",
    "nav.galeria": "Galeria",
    "nav.torneosDirecto": "Zuzeneko txapelketak",
    "nav.historico": "Historikoa",
    "nav.proximoTorneo": "Hurrengo txapelketa",
    "nav.contacto": "Kontaktua",

    "hero.eyebrow": "Vikings · Dardo kluba",
    "hero.title1": "Erasoaldia",
    "hero.title2": "hasi da",
    "hero.subtitle": "Berriak, ekitaldien argazkiak eta klubaren kronikak. Diana barruan zein kanpoan gertatzen den guztia jarraitzeko toki bakarra.",

    "torneo.eyebrow": "Hurrengo ekitaldia",
    "torneo.title": "Hurrengo txapelketa",

    "video.eyebrow": "Vikings TV",
    "video.title": "Honela hasten da dena",
    "video.play": "▶ Bideoa erreproduzitu",

    "live.eyebrow": "Zuzenean",
    "live.title": "Zuzeneko txapelketak",
    "live.none": "Une honetan ez dago zuzeneko txapelketarik.",
    "live.byMachine": "Makinaka",
    "live.byBracket": "Koadroka",
    "live.noActiveMatch": "Ez dago partidarik jokatzen orain",
    "live.viewFull": "Txapelketa osoa ikusi →",
    "live.searchPlaceholder": "Parte-hartzailea bilatu…",
    "live.notPublished": "Koadroa oraindik ez da argitaratu.",

    "cronica.eyebrow": "Klubaren kronika",
    "cronica.title": "Azken berriak",

    "galeria.eyebrow": "Galeria",
    "galeria.title": "Klubaren argazkiak eta bideoak",
    "galeria.teaser": "Berrikusi klubaren momenturik onenak: ekitaldien argazkiak eta partiden bideoak.",
    "galeria.cta": "Galeria osoa ikusi →",
    "galeria.none": "Oraindik ez dago ezer galerian. Argitaratzen den albiste, argazki edo bideo bakoitzarekin beteko da.",
    "galeria.playSound": "🔊 Soinua erreproduzitu",
    "galeria.mute": "🔊 Isilarazi",
    "galeria.muted": "🔇 Soinua isilarazita",

    "historico.eyebrow": "Historikoa",
    "historico.title": "Amaitutako txapelketak",
    "historico.loading": "Kargatzen…",
    "historico.none": "Oraindik ez dago amaitutako txapelketarik.",

    "torneoPage.eyebrow": "Klubaren txapelketa",
    "torneoPage.loading": "Txapelketa kargatzen…",
    "torneoPage.notfound": "Ez dugu txapelketa hau aurkitu, edo jada ez da publikoa.",
    "torneoPage.share": "Partekatu / QR kodea",

    "patrocinadores.eyebrow": "Hauen laguntzarekin",

    "footer.copy": "Vikings Darts Club",
  },
};

const LanguageContext = createContext({ lang: "es", setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("idioma") || "es");

  useEffect(() => {
    localStorage.setItem("idioma", lang);
  }, [lang]);

  const t = (clave) => dic[lang]?.[clave] ?? dic.es[clave] ?? clave;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  return useContext(LanguageContext);
}
