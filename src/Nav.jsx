import { useState } from "react";
import LiveTicker from "./LiveTicker.jsx";
import Buscador from "./Buscador.jsx";
import { useLang } from "./i18n.jsx";
import { CLUB } from "./club.js";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { lang, setLang, t } = useLang();

  return (
    <>
      <header className="nav">
        <a className="nav-brand" href="/#inicio" onClick={() => setMenuOpen(false)}>
          <img src={CLUB.imagenes.logo} alt={`Escudo ${CLUB.nombreCorto}`} className="nav-emblem" />
          <span>{CLUB.marcaNav.principal} <em>{CLUB.marcaNav.secundario}</em></span>
        </a>

        <button
          className={`nav-toggle ${menuOpen ? "nav-toggle-open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`nav-links ${menuOpen ? "nav-links-open" : ""}`}>
          <Buscador />
          <a href="/#cronica" onClick={() => setMenuOpen(false)}>{t("nav.cronica")}</a>
          <a href="/galeria" onClick={() => setMenuOpen(false)}>{t("nav.galeria")}</a>
          <a href="/#torneos-en-directo" onClick={() => setMenuOpen(false)}>{t("nav.torneosDirecto")}</a>
          <a href="/historico" onClick={() => setMenuOpen(false)}>{t("nav.historico")}</a>
          <a href="/socios" onClick={() => setMenuOpen(false)}>{t("nav.socios")}</a>
          <a href="/torneos" onClick={() => setMenuOpen(false)}>{t("nav.torneos")}</a>
          <a href="/#torneo" onClick={() => setMenuOpen(false)}>{t("nav.proximoTorneo")}</a>
          <a href="/#contacto" onClick={() => setMenuOpen(false)}>{t("nav.contacto")}</a>
          <div className="nav-lang">
            <button type="button" className={lang === "es" ? "nav-lang-activo" : ""} onClick={() => setLang("es")}>ES</button>
            <span>/</span>
            <button type="button" className={lang === "eu" ? "nav-lang-activo" : ""} onClick={() => setLang("eu")}>EU</button>
            <span>/</span>
            <button type="button" className={lang === "fr" ? "nav-lang-activo" : ""} onClick={() => setLang("fr")}>FR</button>
          </div>
          {CLUB.redes?.facebook && (
            <a
              href={CLUB.redes.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="nav-social"
              aria-label="Facebook del club"
              onClick={() => setMenuOpen(false)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M13.5 21v-7.5h2.5l.4-3H13.5V8.5c0-.87.24-1.46 1.49-1.46H16.5V4.36C16.24 4.32 15.36 4.25 14.33 4.25c-2.15 0-3.62 1.31-3.62 3.72V10.5H8.2v3h2.51V21h2.79z" />
              </svg>
            </a>
          )}
        </nav>
      </header>
      <LiveTicker />
    </>
  );
}
