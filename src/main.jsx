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
import { LanguageProvider } from "./i18n.jsx";
import "./styles.css";

const path = window.location.pathname;
const isAdmin = path.startsWith("/admin");

// Instalar la web general y el admin como dos apps separadas (pedido de
// Iraitz, 2026-09-18): index.html trae puesto el manifest general
// (manifest.json, scope "/"). En /admin lo cambiamos por uno propio
// (manifest-admin.json, scope "/admin", icono/nombre "Vikings Admin") ANTES
// de montar React — así "Instalar aplicación" (Chrome/Android) o "Añadir a
// pantalla de inicio" (iOS) desde /admin registra una app distinta de la
// web general, aunque sea el mismo dominio: cada manifest.json es una
// identidad de instalación aparte, no hace falta tocar el servidor ni el
// build para tener dos "apps".
if (isAdmin) {
  document.querySelector('link[rel="manifest"]')?.setAttribute("href", "/manifest-admin.json");
  document.title = "Vikings Dardos — Admin";
}
const isGaleria = path.startsWith("/galeria");
const isHistorico = path.startsWith("/historico");
const isSocios = path.startsWith("/socios");
// /partidas: entrada pública para jugar en remoto (plan
// "partido-amistoso-remoto", guardado en el proyecto), independiente de
// cualquier torneo/liga concretos — ver PaginaPartidas.jsx.
const isPartidas = path.startsWith("/partidas");
const matchTorneo = path.match(/^\/torneo\/([^/]+)/);
const matchLiga = path.match(/^\/liga\/([^/]+)/);
const matchAviso = path.match(/^\/aviso\/([^/]+)/);

function Pagina() {
  if (isAdmin) return <Admin />;
  if (isGaleria) return <Galeria />;
  if (isHistorico) return <Historico />;
  if (isSocios) return <Socios />;
  if (isPartidas) return <PaginaPartidas />;
  if (matchTorneo) return <TorneoPage id={matchTorneo[1]} />;
  if (matchLiga) return <LigaPage id={matchLiga[1]} />;
  if (matchAviso) return <AvisoCheckIn token={matchAviso[1]} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <Pagina />
    </LanguageProvider>
  </React.StrictMode>
);
