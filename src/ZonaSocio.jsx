import { useEffect, useState } from "react";
import { useLang } from "./i18n.jsx";
import SocioPerfil, { sincronizarSuscripcionPush } from "./SocioPerfil.jsx";
import AvisoEstadoPush from "./AvisoEstadoPush.jsx";
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
import RetarAmistoso from "./RetarAmistoso.jsx";

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
    { id: "amistoso", etiqueta: t("zona.amistoso"), lista: true },
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
  // Algunas secciones aprovechan más espacio en tablet/PC (galerías, tablas
  // de equipos/jugadores, calendario y competiciones); el resto es sobre
  // todo texto/formularios y se queda en el ancho estrecho de siempre, más
  // legible.
  const SECCIONES_ANCHAS = ["galeria-privada", "jugadores", "equipos", "calendario", "competiciones"];
  const ancho = SECCIONES_ANCHAS.includes(seccion) ? 1100 : 640;

  function elegirSeccion(s) {
    if (!s.lista) return;
    setSeccion(s.id);
    setMenuAbierto(false);
  }

  // Revisa y, si hace falta, recupera en silencio los avisos push de este
  // dispositivo cada vez que se entra en la zona de socios — no solo al
  // abrir "Mi perfil" (ver notificaciones-se-desactivan-solas-2026-09-22.md):
  // entrar al perfil es bastante menos frecuente que el resto de secciones,
  // así que dejarlo solo ahí se perdía a la mayoría de los socios que
  // navegan sin pasar nunca por su perfil. Se ejecuta una vez por sesión
  // (ZonaSocio no se remonta al cambiar de sección); si falla o el
  // navegador no soporta algo, no hace nada visible — AvisosPush en "Mi
  // perfil" sigue siendo el sitio para verlo y activarlo a mano.
  //
  // El resultado se usa para AvisoEstadoPush: si en este dispositivo las
  // notificaciones están bloqueadas o sin activar, se avisa aquí mismo.
  const [estadoPush, setEstadoPush] = useState(null);
  useEffect(() => {
    sincronizarSuscripcionPush().then(setEstadoPush).catch(() => {});
  }, []);

  return (
    <div className="admin-form" style={{ maxWidth: ancho, margin: "0 auto", transition: "max-width .15s ease" }}>
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

      <AvisoEstadoPush estado={estadoPush} onActivado={() => setEstadoPush((e) => ({ ...e, activo: true }))} />
      {seccion === "perfil" && <SocioPerfil usuario={usuario} />}
      {seccion === "historial" && <HistorialTorneos />}
      {seccion === "historico-privado" && <HistoricoPrivado />}
      {seccion === "competiciones" && <Competiciones usuario={usuario} />}
      {seccion === "calendario" && <CalendarioSocio />}
      {seccion === "marcadores" && <Marcadores />}
      {seccion === "amistoso" && <RetarAmistoso />}
      {seccion === "tablon" && <TablonAnuncios usuario={usuario} />}
      {seccion === "jugadores" && <JugadoresClub />}
      {seccion === "galeria-privada" && <GaleriaPrivada usuario={usuario} />}
      {seccion === "trofeos" && <SalaTrofeos />}
      {seccion === "equipos" && <EquiposClub />}
    </div>
  );
}
