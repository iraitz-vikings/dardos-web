import { useEffect, useRef, useState } from "react";
import { useLang } from "./i18n.jsx";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

// Buscador global de la web: noticias, torneos y ligas del club a la vez
// (ver src/routes/buscar.js en el backend). Vive en la barra de navegación,
// visible en toda la web pública. Si hay un socio logueado (token en
// localStorage, mismo mecanismo que Socios.jsx), se manda también en la
// petición para que el backend incluya torneos/ligas privados en la
// búsqueda, no solo los públicos.
export default function Buscador() {
  const { t } = useLang();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) {
      setResultados(null);
      setBuscando(false);
      return;
    }
    setBuscando(true);
    const espera = setTimeout(() => {
      const token = localStorage.getItem("socioToken");
      fetch(`${API_URL}/api/buscar?q=${encodeURIComponent(consulta)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then(setResultados)
        .catch(() => setResultados(null))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(espera);
  }, [texto]);

  useEffect(() => {
    function alPulsarFuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setAbierto(false);
    }
    document.addEventListener("mousedown", alPulsarFuera);
    return () => document.removeEventListener("mousedown", alPulsarFuera);
  }, []);

  const totalResultados = resultados
    ? resultados.noticias.length + resultados.torneos.length + resultados.ligas.length
    : 0;
  const mostrarPanel = abierto && texto.trim().length >= 2;

  return (
    <div className="nav-buscador" ref={contenedorRef}>
      <input
        type="search"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        placeholder={t("nav.buscarPlaceholder")}
        className="nav-buscador-input"
        aria-label={t("nav.buscarPlaceholder")}
      />
      {mostrarPanel && (
        <div className="nav-buscador-resultados">
          {buscando && <p className="nav-buscador-estado">{t("nav.buscando")}</p>}
          {!buscando && resultados && totalResultados === 0 && (
            <p className="nav-buscador-estado">{t("nav.sinResultados")}</p>
          )}
          {!buscando && resultados?.torneos.length > 0 && (
            <div className="nav-buscador-grupo">
              <p className="nav-buscador-grupo-titulo">{t("nav.torneosDirecto")}</p>
              {resultados.torneos.map((r) => (
                <a key={r.id} href={`/torneo/${r.id}`} className="nav-buscador-item">
                  {r.nombre}
                </a>
              ))}
            </div>
          )}
          {!buscando && resultados?.ligas.length > 0 && (
            <div className="nav-buscador-grupo">
              <p className="nav-buscador-grupo-titulo">{t("nav.ligas")}</p>
              {resultados.ligas.map((r) => (
                <a key={r.id} href={`/liga/${r.id}`} className="nav-buscador-item">
                  {r.nombre}
                </a>
              ))}
            </div>
          )}
          {!buscando && resultados?.noticias.length > 0 && (
            <div className="nav-buscador-grupo">
              <p className="nav-buscador-grupo-titulo">{t("nav.cronica")}</p>
              {resultados.noticias.map((r) => (
                <a key={r.id} href={`/#noticia-${r.id}`} className="nav-buscador-item">
                  {r.titulo}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
