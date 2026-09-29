import CargaExterna from "./CargaExterna.jsx";
import { useLang } from "./i18n.jsx";

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
          <CargaExterna servicio="Google Maps" boton={t("externo.verMapa")}>
            {() => (
              <iframe
                title="Ubicación del club"
                src="https://www.google.com/maps?q=43.310774,-1.912812&z=17&output=embed"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </CargaExterna>
        </div>
        <div className="footer-contact-info">
          <p className="footer-address">
            <a href="https://www.google.com/maps?q=43.310774,-1.912812" target="_blank" rel="noopener noreferrer">
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
