import { useLang } from "./i18n.jsx";

// Imagen fija del mapa (teselas de OpenStreetMap unidas y recortadas en
// Cloudinary, centradas en el club) en vez del iframe de Google Maps: no
// conecta con Google hasta que el visitante pulsa, y entonces abre Google
// Maps en otra pestaña. La licencia de OpenStreetMap (ODbL) obliga a
// mostrar la atribución. El marcador va en CSS, justo en el centro.
const MAPA_URL = "https://www.google.com/maps?q=43.310774,-1.912812";
const MAPA_IMG = "https://res.cloudinary.com/lodi1y1k/image/upload/f_auto,q_auto/v1790689431/vikings-mapa-club.png";

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
            <span className="footer-map-pin" aria-hidden="true" />
            <span className="footer-map-abrir">{t("footer.abrirMapa")}</span>
          </a>
          <span className="footer-map-atribucion">© OpenStreetMap</span>
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
