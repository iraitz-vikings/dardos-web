import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import Galeria from "./Galeria.jsx";
import TorneoPage from "./TorneoPage.jsx";
import Historico from "./Historico.jsx";
import "./styles.css";

const path = window.location.pathname;
const isAdmin = path.startsWith("/admin");
const isGaleria = path.startsWith("/galeria");
const isHistorico = path.startsWith("/historico");
const matchTorneo = path.match(/^\/torneo\/([^/]+)/);

function Pagina() {
  if (isAdmin) return <Admin />;
  if (isGaleria) return <Galeria />;
  if (isHistorico) return <Historico />;
  if (matchTorneo) return <TorneoPage id={matchTorneo[1]} />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
      <Pagina />
        </React.StrictMode>
        );
