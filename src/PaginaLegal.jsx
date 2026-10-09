import Nav from "./Nav.jsx";
import Footer from "./Footer.jsx";
import { useLang } from "./i18n.jsx";
import { textosLegales } from "./textosLegales.js";

// /aviso-legal y /privacidad (2026-10-08): mismas páginas en los tres
// idiomas de la web, con el idioma elegido en el selector. El contenido
// está en textosLegales.js.
export default function PaginaLegal({ tipo }) {
  const { lang } = useLang();
  const pagina = (textosLegales[lang] || textosLegales.es)[tipo];

  return (
    <>
      <Nav />
      <main>
        <section className="gallery gallery-page pagina-legal">
          <h2 className="chronicle-title">{pagina.titulo}</h2>
          {pagina.secciones.map((s) => (
            <div key={s.titulo}>
              <h3>{s.titulo}</h3>
              {(s.parrafos || []).map((p, i) => <p key={i}>{p}</p>)}
              {s.lista && (
                <ul>
                  {s.lista.map((l, i) => <li key={i}>{l}</li>)}
                </ul>
              )}
            </div>
          ))}
        </section>
      </main>
      <Footer simple />
    </>
  );
}
