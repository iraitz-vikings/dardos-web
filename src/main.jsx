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
import Carga from "./Carga.jsx";
import { LanguageProvider } from "./i18n.jsx";
import "./styles.css";

// Logos EN VERSIÓN TRANSPARENTE (no los iconos cuadrados opacos del
// manifest) para la pantalla de carga inicial (pedido 2026-09-19) — cada
// app con el suyo: el de la web principal ya se usa igual en App.jsx
// (HERO_LOGO_URL), y el del admin en Admin.jsx (ADMIN_EMBLEM_URL).
const LOGO_TRANSPARENTE_PRINCIPAL = "https://res.cloudinary.com/lodi1y1k/image/upload/f_auto,q_auto/v1789382590/vikings-logo-transparente-2026.png";
const LOGO_TRANSPARENTE_ADMIN = "https://res.cloudinary.com/lodi1y1k/image/upload/e_background_removal/e_trim/b_transparent,c_pad,h_512,w_512/f_png/v1789816550/IMG-20260910-WA0004_o3n7ly.png";

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
  // Icono propio del admin (pedido 2026-09-18: misma imagen para instalar
  // el admin y para la pestaña/favicon mientras se navega por /admin).
  // Para el favicon (fondo transparente, como en la web principal) se usa
  // la versión con el fondo eliminado (e_background_removal); para el
  // apple-touch-icon se mantiene la versión opaca, porque iOS rellena de
  // negro las zonas transparentes de esos iconos.
  const CLOUD_BASE = "https://res.cloudinary.com/lodi1y1k/image/upload";
  const ADMIN_IMG = "v1789816550/IMG-20260910-WA0004_o3n7ly";
  const setIcon = (selector, href) => document.querySelector(selector)?.setAttribute("href", href);
  setIcon('link[rel="icon"][type="image/x-icon"]', `${CLOUD_BASE}/e_background_removal/e_trim/b_transparent,c_pad,h_32,w_32/f_ico/${ADMIN_IMG}.ico`);
  setIcon('link[rel="icon"][sizes="16x16"]', `${CLOUD_BASE}/e_background_removal/e_trim/b_transparent,c_pad,h_16,w_16/f_png/${ADMIN_IMG}.png`);
  setIcon('link[rel="icon"][sizes="32x32"]', `${CLOUD_BASE}/e_background_removal/e_trim/b_transparent,c_pad,h_32,w_32/f_png/${ADMIN_IMG}.png`);
  // La foto del admin trae mucho más margen de piedra alrededor de la
  // moneda que el logo de la web principal (que ya la llena casi entera),
  // así que recortamos primero al 70% central antes de encajarla en el
  // icono, para que ambos iconos se vean del mismo tamaño relativo.
  setIcon('link[rel="apple-touch-icon"]', `${CLOUD_BASE}/c_crop,g_center,h_0.7,w_0.7/c_fill,g_auto,h_180,w_180/f_png/${ADMIN_IMG}.png`);
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
      <Carga logoUrl={isAdmin ? LOGO_TRANSPARENTE_ADMIN : LOGO_TRANSPARENTE_PRINCIPAL} />
      <Pagina />
    </LanguageProvider>
  </React.StrictMode>
);
