import { Fragment } from "react";
import { useLang } from "./i18n.jsx";
import { CLUB } from "./club.js";

// Imagen fija del mapa (captura de Google Maps con el club marcado, servida
// desde la propia web: public/mapa-club.webp) en vez del iframe de Google
// Maps: no conecta con Google hasta que el visitante pulsa, y entonces abre
// Google Maps en otra pestaña. La atribución de Google va dentro de la
// propia imagen (abajo), por eso la franja "Abrir en Google Maps" va arriba.
const MAPA_URL = CLUB.contacto.mapaUrl;
const MAPA_IMG = "/mapa-club.webp";

// Enlaces al aviso legal y la política de privacidad (PaginaLegal.jsx), en
// todos los pies de página.
function EnlacesLegales({ t }) {
  return (
    <p className="footer-legal">
      <a href="/aviso-legal">{t("footer.avisoLegal")}</a> · <a href="/privacidad">{t("footer.privacidad")}</a>
    </p>
  );
}

export default function Footer({ simple = false }) {
  const { t } = useLang();
  if (simple) {
    return (
      <footer className="footer">
        <p className="footer-copy">© {new Date().getFullYear()} · {t("footer.copy")}</p>
        <EnlacesLegales t={t} />
      </footer>
    );
  }

  return (
    <footer id="contacto" className="footer">
      <div className="footer-contact">
        <div className="footer-map">
          <a href={MAPA_URL} target="_blank" rel="noopener noreferrer" className="footer-map-enlace">
            <img src={MAPA_IMG} alt={CLUB.contacto.mapaAlt} loading="lazy" />
            <span className="footer-map-abrir">{t("footer.abrirMapa")}</span>
          </a>
        </div>
        <div className="footer-contact-info">
          <p className="footer-address">
            <a href={MAPA_URL} target="_blank" rel="noopener noreferrer">
              {CLUB.contacto.direccion.map((linea, i) => (
                <Fragment key={i}>{i > 0 && <br />}{linea}</Fragment>
              ))}
            </a>
          </p>
          <a href={`mailto:${CLUB.contacto.email}`} className="footer-email">{CLUB.contacto.email}</a>
        </div>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} · {t("footer.copy")}</p>
      <EnlacesLegales t={t} />
    </footer>
  );
}
