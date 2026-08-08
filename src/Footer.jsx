export default function Footer() {
  return (
    <footer id="contacto" className="footer">
      <div className="footer-contact">
        <div className="footer-map">
          <iframe
            title="Ubicación del club"
            src="https://www.google.com/maps?q=Aita+Donostia+Kalea+2,+20100+Errenteria,+Gipuzkoa&output=embed"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="footer-contact-info">
          <p className="footer-address">Aita Donostia Kalea, Nº 2 (trasera)<br />20100 Errenteria, Gipuzkoa</p>
          <a href="mailto:vikingsdartsclub@hotmail.com" className="footer-email">vikingsdartsclub@hotmail.com</a>
        </div>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} · Vikings Darts Club</p>
    </footer>
  );
}
