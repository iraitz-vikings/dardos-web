import { useState } from "react";
import { useLang } from "./i18n.jsx";
import SocioPerfil from "./SocioPerfil.jsx";
import TablonAnuncios from "./TablonAnuncios.jsx";
import JugadoresClub from "./JugadoresClub.jsx";
import GaleriaPrivada from "./GaleriaPrivada.jsx";
import SalaTrofeos from "./SalaTrofeos.jsx";
import EquiposClub from "./EquiposClub.jsx";
import HistorialTorneos from "./HistorialTorneos.jsx";
import HistoricoPrivado from "./HistoricoPrivado.jsx";
import Competiciones from "./Competiciones.jsx";
import CalendarioSocio from "./CalendarioSocio.jsx";
import Marcadores from "./Marcadores.jsx";

function useSecciones() {
  const { t } = useLang();
  return [
    { id: "tablon", etiqueta: t("zona.tablon"), lista: true },
    { id: "perfil", etiqueta: t("zona.perfil"), lista: true },
    { id: "historial", etiqueta: t("zona.historial"), lista: true },
    { id: "historico-privado", etiqueta: t("zona.historicoPrivado"), lista: true },
    { id: "competiciones", etiqueta: t("zona.competiciones"), lista: true },
    { id: "calendario", etiqueta: t("zona.calendario"), lista: true },
    { id: "marcadores", etiqueta: t("zona.marcadores"), lista: true },
    { id: "galeria-privada", etiqueta: t("zona.galeriaPrivada"), lista: true },
    { id: "trofeos", etiqueta: t("zona.trofeos"), lista: true },
    { id: "equipos", etiqueta: t("zona.equipos"), lista: true },
    { id: "jugadores", etiqueta: t("zona.jugadores"), lista: true },
  ];
}

export default function ZonaSocio({ usuario, salir }) {
  const { t } = useLang();
  const SECCIONES = useSecciones();
  const [seccion, setSeccion] = useState("tablon");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const actual = SECCIONES.find((s) => s.id === seccion);

  function elegirSeccion(s) {
    if (!s.lista) return;
    setSeccion(s.id);
    setMenuAbierto(false);
  }

  return (
    <div className="admin-form" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="admin-header" style={{ background: "none", padding: 0, marginBottom: "1rem" }}>
        <span>{t("socios.bienvenida").replace("{nombre}", usuario.nombre)}</span>
        <button className="admin-link-btn" onClick={salir}>{t("socios.salir")}</button>
      </div>

      <div className="socio-menu">
        <button
          type="button"
          className={`socio-menu-actual ${menuAbierto ? "socio-menu-actual-open" : ""}`}
          onClick={() => setMenuAbierto((o) => !o)}
          aria-expanded={menuAbierto}
        >
          <span>{actual?.etiqueta}</span>
          <em className="socio-menu-chevron" aria-hidden="true" />
        </button>

        <nav className={`admin-tabs socio-menu-lista ${menuAbierto ? "socio-menu-lista-open" : ""}`} style={{ marginBottom: "1.2rem" }}>
          {SECCIONES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`admin-tab ${seccion === s.id ? "admin-tab-active" : ""}`}
              disabled={!s.lista}
              onClick={() => elegirSeccion(s)}
              title={s.lista ? "" : t("zona.proximamente")}
            >
              {s.etiqueta}{!s.lista && " 🔒"}
            </button>
          ))}
        </nav>
      </div>

      {seccion === "perfil" && <SocioPerfil usuario={usuario} />}
      {seccion === "historial" && <HistorialTorneos />}
      {seccion === "historico-privado" && <HistoricoPrivado />}
      {seccion === "competiciones" && <Competiciones usuario={usuario} />}
      {seccion === "calendario" && <CalendarioSocio />}
      {seccion === "marcadores" && <Marcadores />}
      {seccion === "tablon" && <TablonAnuncios usuario={usuario} />}
      {seccion === "jugadores" && <JugadoresClub />}
      {seccion === "galeria-privada" && <GaleriaPrivada usuario={usuario} />}
      {seccion === "trofeos" && <SalaTrofeos />}
      {seccion === "equipos" && <EquiposClub />}
    </div>
  );
}
