import { useState } from "react";
import { EMBLEM_DATA_URI } from "./emblem.js";
import LiveTicker from "./LiveTicker.jsx";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="nav">
        <a className="nav-brand" href="/#inicio" onClick={() => setMenuOpen(false)}>
          <img src={EMBLEM_DATA_URI} alt="Escudo Vikings" className="nav-emblem" />
          <span>Vikings <em>Darts Club</em></span>
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
          <a href="/#cronica" onClick={() => setMenuOpen(false)}>Crónica</a>
          <a href="/galeria" onClick={() => setMenuOpen(false)}>Galería</a>
          <a href="/#torneos-en-directo" onClick={() => setMenuOpen(false)}>Torneos en directo</a>
          <a href="/historico" onClick={() => setMenuOpen(false)}>Histórico</a>
          <a href="/#torneo" onClick={() => setMenuOpen(false)}>Próximo torneo</a>
          <a href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
          <a
            href="https://www.facebook.com/Vikingsdartsclub/"
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
        </nav>
      </header>
      <LiveTicker />
    </>
  );
}
