import { useLang } from "./i18n.jsx";

// Editor de alias/medias de fabricante de un jugador, reutilizado por el
// perfil del invitado (PerfilInvitado.jsx) y el panel de admin
// (AdminJugadores.jsx). Misma lógica que la sección de fabricantes del perfil
// de socios (SocioPerfil.jsx): alias por fabricante, y para Radikal Darts
// además la nota de búsqueda y el MPR/PPD a mano (su web bloquea el scraper).
//
// Props:
//   fabricantes: lista de fabricantes (GET /api/fabricantes)
//   ids/notas/medias: mapas { [fabricanteId]: valor } con lo introducido
//   onId/onNota/onMedia: callbacks para cambiar cada campo
export default function EditorMediasFabricante({ fabricantes, ids, notas, medias, onId, onNota, onMedia }) {
  const { t } = useLang();
  if (!fabricantes || fabricantes.length === 0) return null;

  return (
    <fieldset style={{ border: "1px solid rgba(255,255,255,.15)", borderRadius: 8, padding: ".8rem 1rem", marginBottom: "1rem" }}>
      <legend style={{ padding: "0 .4rem" }}>{t("perfil.aliasFabricante")}</legend>
      <p className="admin-hint" style={{ marginTop: 0 }}>{t("perfil.aliasHint")}</p>
      {fabricantes.map((f) => {
        const alias = ids[f.id] || "";
        const nombreFab = f.nombre.toLowerCase();
        const esRadikal = nombreFab.includes("radikal");
        const esConnection = nombreFab.includes("connection");
        const enlace =
          f.urlPerfilPlantilla && alias.trim()
            ? f.urlPerfilPlantilla.replace("{alias}", encodeURIComponent(alias.trim()))
            : null;
        return (
          <label key={f.id}>
            <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              {f.logoUrl && (
                <img
                  src={f.logoUrl}
                  alt=""
                  style={{ width: 20, height: 20, objectFit: "contain", background: "#fff", borderRadius: 3 }}
                />
              )}
              {f.nombre}
            </span>
            <input
              value={alias}
              onChange={(e) => onId(f.id, e.target.value)}
              placeholder={t("perfil.aliasPlaceholder").replace("{fabricante}", f.nombre)}
            />
            {(esRadikal || esConnection) && (
              <input
                value={notas[f.id] || ""}
                onChange={(e) => onNota(f.id, e.target.value)}
                placeholder={t(esRadikal ? "perfil.notaRadikalPlaceholder" : "perfil.notaConnectionPlaceholder")}
                style={{ marginTop: ".3rem" }}
              />
            )}
            {esConnection && <span className="admin-hint">{t("perfil.connectionLocalidadHint")}</span>}
            {esRadikal && (
              <span style={{ display: "flex", gap: ".5rem", marginTop: ".3rem" }}>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={medias[f.id]?.mpr ?? ""}
                  onChange={(e) => onMedia(f.id, "mpr", e.target.value)}
                  placeholder={t("perfil.mprRadikalPlaceholder")}
                />
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={medias[f.id]?.ppd ?? ""}
                  onChange={(e) => onMedia(f.id, "ppd", e.target.value)}
                  placeholder={t("perfil.ppdRadikalPlaceholder")}
                />
              </span>
            )}
            {esRadikal && (
              <span style={{ display: "block", fontSize: ".75em", opacity: 0.7, marginTop: ".2rem" }}>
                {t("perfil.radikalManualHint")}
              </span>
            )}
            {enlace && (
              <a href={enlace} target="_blank" rel="noreferrer" style={{ fontSize: ".85em" }}>
                {t("perfil.verMediaEn").replace("{fabricante}", f.nombre)}
              </a>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

// Construye el array idsFabricantes que espera el backend (PUT de perfil /
// jugador) a partir de los mapas de estado del editor. Incluye mpr/ppd solo
// para Radikal (entrada manual), igual que el perfil de socios.
export function construirIdsFabricantes(fabricantes, ids, notas, medias) {
  return fabricantes.map((f) => {
    const base = {
      fabricanteId: f.id,
      idExterno: ids[f.id] || "",
      notaBusqueda: notas[f.id] || "",
    };
    if (f.nombre.toLowerCase().includes("radikal")) {
      const media = medias[f.id] || {};
      base.mpr = media.mpr ?? "";
      base.ppd = media.ppd ?? "";
    }
    return base;
  });
}

// Rellena los mapas de estado (ids/notas/medias) desde el array idsFabricantes
// que devuelve el backend.
export function mapasDesdeIdsFabricantes(idsFabricantes) {
  const ids = {};
  const notas = {};
  const medias = {};
  (idsFabricantes || []).forEach((i) => {
    ids[i.fabricanteId] = i.idExterno || "";
    notas[i.fabricanteId] = i.notaBusqueda || "";
    medias[i.fabricanteId] = {
      mpr: i.mpr ?? "",
      ppd: i.ppd ?? "",
    };
  });
  return { ids, notas, medias };
}
