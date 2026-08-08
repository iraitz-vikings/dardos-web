import { useState } from "react";
import { EMBLEM_DATA_URI } from "./emblem.js";

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
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
        <a href="/#torneo" onClick={() => setMenuOpen(false)}>Próximo torneo</a>
        <a href="/#contacto" onClick={() => setMenuOpen(false)}>Contacto</a>
      </nav>
    </header>
  );
}
