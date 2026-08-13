import { useState } from "react";
import SocioPerfil from "./SocioPerfil.jsx";
import TablonAnuncios from "./TablonAnuncios.jsx";
import JugadoresClub from "./JugadoresClub.jsx";
import GaleriaPrivada from "./GaleriaPrivada.jsx";
import SalaTrofeos from "./SalaTrofeos.jsx";
import EquiposClub from "./EquiposClub.jsx";
import HistorialTorneos from "./HistorialTorneos.jsx";

const SECCIONES = [
  { id: "perfil", etiqueta: "Mi perfil", lista: true },
  { id: "historial", etiqueta: "Mi historial", lista: true },
  { id: "tablon", etiqueta: "Tablón de anuncios", lista: true },
  { id: "galeria-privada", etiqueta: "Galería privada", lista: true },
  { id: "trofeos", etiqueta: "Sala de trofeos", lista: true },
  { id: "equipos", etiqueta: "Equipos del club", lista: true },
  { id: "jugadores", etiqueta: "Jugadores del club", lista: true },
];

export default function ZonaSocio({ usuario, salir }) {
  const [seccion, setSeccion] = useState("perfil");

  return (
    <div className="admin-form" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="admin-header" style={{ background: "none", padding: 0, marginBottom: "1rem" }}>
        <span>Hola, {usuario.nombre}</span>
        <button className="admin-link-btn" onClick={salir}>Salir</button>
      </div>

      <nav className="admin-tabs" style={{ marginBottom: "1.2rem" }}>
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`admin-tab ${seccion === s.id ? "admin-tab-active" : ""}`}
            disabled={!s.lista}
            onClick={() => s.lista && setSeccion(s.id)}
            title={s.lista ? "" : "Próximamente"}
          >
            {s.etiqueta}{!s.lista && " 🔒"}
          </button>
        ))}
      </nav>

      {seccion === "perfil" && <SocioPerfil usuario={usuario} />}
      {seccion === "historial" && <HistorialTorneos />}
      {seccion === "tablon" && <TablonAnuncios usuario={usuario} />}
      {seccion === "jugadores" && <JugadoresClub />}
      {seccion === "galeria-privada" && <GaleriaPrivada usuario={usuario} />}
      {seccion === "trofeos" && <SalaTrofeos />}
      {seccion === "equipos" && <EquiposClub />}
    </div>
  );
}
