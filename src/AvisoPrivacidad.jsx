import { useLang } from "./i18n.jsx";

// Línea informativa con enlace a la política de privacidad, debajo de los
// formularios que recogen datos personales (2026-10-08, deber de información
// del art. 13 RGPD). No es una casilla de "acepto": la base legal de esos
// datos es la relación con el club (ver /privacidad), así que basta con
// informar en el momento de recogerlos. `tipo`: registro | telegram | perfil.
export default function AvisoPrivacidad({ tipo }) {
  const { t } = useLang();
  return (
    <p className="admin-hint aviso-privacidad">
      {t(`privacidad.${tipo}`)}{" "}
      <a href="/privacidad" target="_blank" rel="noopener noreferrer">{t("privacidad.enlace")}</a>.
    </p>
  );
}
