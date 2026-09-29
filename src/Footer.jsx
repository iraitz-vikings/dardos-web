import { useLang } from "./i18n.jsx";

// Imagen fija del mapa (captura de Google Maps con el club marcado, servida
// desde la propia web: public/mapa-club.webp) en vez del iframe de Google
// Maps: no conecta con Google hasta que el visitante pulsa, y entonces abre
// Google Maps en otra pestaña. La atribución de Google va dentro de la
// propia imagen (abajo), por eso la franja "Abrir en Google Maps" va arriba.
const MAPA_URL = "https://www.google.com/maps?q=43.310774,-1.912812";
const MAPA_IMG = "/mapa-club.webp";

export default function Footer({ simple = false }) {
  const { t } = useLang();
  if (simple) {
    return (
      <footer className="footer">
        <p className="footer-copy">© {new Date().getFullYear()} · Vikings Darts Club</p>
      </footer>
    );
  }

  return (
    <footer id="contacto" className="footer">
      <div className="footer-contact">
        <div className="footer-map">
          <a href={MAPA_URL} target="_blank" rel="noopener noreferrer" className="footer-map-enlace">
            <img src={MAPA_IMG} alt="Mapa: ubicación del club en Errenteria" loading="lazy" />
            <span className="footer-map-abrir">{t("footer.abrirMapa")}</span>
          </a>
        </div>
        <div className="footer-contact-info">
          <p className="footer-address">
            <a href={MAPA_URL} target="_blank" rel="noopener noreferrer">
              Aita Donostia Kalea, Nº 2 (trasera)<br />20100 Errenteria, Gipuzkoa
            </a>
          </p>
          <a href="mailto:vikingsdartsclub@hotmail.com" className="footer-email">vikingsdartsclub@hotmail.com</a>
        </div>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} · Vikings Darts Club</p>
    </footer>
  );
}
