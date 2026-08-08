import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Admin from "./Admin.jsx";
import Galeria from "./Galeria.jsx";
import "./styles.css";

const path = window.location.pathname;
const isAdmin = path.startsWith("/admin");
const isGaleria = path.startsWith("/galeria");

function Pagina() {
  if (isAdmin) return <Admin />;
  if (isGaleria) return <Galeria />;
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
      <Pagina />
        </React.StrictMode>
        );
