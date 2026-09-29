import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import Galeria from "./Galeria.jsx";
import TorneoPage from "./TorneoPage.jsx";
import LigaPage from "./LigaPage.jsx";
import Historico from "./Historico.jsx";
import Socios from "./Socios.jsx";
import AvisoCheckIn from "./AvisoCheckIn.jsx";
import PaginaPartidas from "./PaginaPartidas.jsx";
import PaginaTorneos from "./PaginaTorneos.jsx";
import Carga from "./Carga.jsx";
import { LanguageProvider } from "./i18n.jsx";
import { CLUB } from "./club.js";
// Fuentes servidas desde la propia web (paquetes @fontsource, empaquetados
// por Vite) en vez de Google Fonts: cargarlas de fonts.googleapis.com manda
// la IP de cada visitante a Google sin consentimiento, algo que el RGPD no
// permite (revisión de normativa 2026-09-29).
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/700.css";
import "@fontsource/cinzel/900.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./club.css";
import "./styles.css";

// Logos EN VERSIÓN TRANSPARENTE (no los iconos cuadrados opacos del
// manifest) para la pantalla de carga inicial (pedido 2026-09-19) — cada
// app con el suyo, los mismos que la portada (App.jsx) y el admin (Admin.jsx).
const LOGO_TRANSPARENTE_PRINCIPAL = CLUB.imagenes.logo;
const LOGO_TRANSPARENTE_ADMIN = CLUB.imagenes.logoAdmin;

const path = window.location.pathname;
const isAdmin = path.startsWith("/admin");

// Instalar la web general y el admin como dos apps separadas (pedido de
// Iraitz, 2026-09-18): index.html trae puesto el manifest general
// (manifest.json, scope "/"). En /admin lo cambiamos por uno propio
// (manifest-admin.json, scope "/admin", con su propio icono/nombre) ANTES
// de montar React — así "Instalar aplicación" (Chrome/Android) o "Añadir a
// pantalla de inicio" (iOS) desde /admin registra una app distinta de la
// web general, aunque sea el mismo dominio: cada manifest.json es una
// identidad de instalación aparte, no hace falta tocar el servidor ni el
// build para tener dos "apps". Ambos manifests los genera vite.config.js a
// partir de club.config.js.
if (isAdmin) {
  document.querySelector('link[rel="manifest"]')?.setAttribute("href", "/manifest-admin.json");
  document.title = CLUB.admin.nombre;
  // Icono propio del admin (pedido 2026-09-18: misma imagen para instalar
  // el admin y para la pestaña/favicon mientras se navega por /admin).
  const iconos = CLUB.imagenes.faviconAdmin;
  const setIcon = (selector, href) => document.querySelector(selector)?.setAttribute("href", href);
  setIcon('link[rel="icon"][type="image/x-icon"]', iconos.ico);
  setIcon('link[rel="icon"][sizes="16x16"]', iconos.png16);
  setIcon('link[rel="icon"][sizes="32x32"]', iconos.png32);
  setIcon('link[rel="apple-touch-icon"]', iconos.apple);
}
const isGaleria = path.startsWith("/galeria");
const isHistorico = path.startsWith("/historico");
const isSocios = path.startsWith("/socios");
// /partidas: entrada pública para jugar en remoto (plan
// "partido-amistoso-remoto", guardado en el proyecto), independiente de
// cualquier torneo/liga concretos — ver PaginaPartidas.jsx.
const isPartidas = path.startsWith("/partidas");
const isTorneos = path === "/torneos" || path === "/torneos/";
const matchTorneo = path.match(/^\/torneo\/([^/]+)/);
const matchLiga = path.match(/^\/liga\/([^/]+)/);
const matchAviso = path.match(/^\/aviso\/([^/]+)/);

function Pagina() {
  if (isAdmin) return <Admin />;
  if (isGaleria) return <Galeria />;
  if (isHistorico) return <Historico />;
  if (isSocios) return <Socios />;
  if (isPartidas) return <PaginaPartidas />;
  if (isTorneos) return <PaginaTorneos />;
  if (matchTorneo) return <TorneoPage id={matchTorneo[1]} />;
  if (matchLiga) return <LigaPage id={matchLiga[1]} />;
  if (matchAviso) return <AvisoCheckIn token={matchAviso[1]} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <Carga logoUrl={isAdmin ? LOGO_TRANSPARENTE_ADMIN : LOGO_TRANSPARENTE_PRINCIPAL} />
      <Pagina />
    </LanguageProvider>
  </React.StrictMode>
);
