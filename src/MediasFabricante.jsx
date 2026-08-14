// Lista de medias de fabricante de un jugador. Se usa tanto en "Mi perfil"
// como en la ventana de perfil de "Jugadores del club", para no duplicar la
// lógica de cómo se muestra cada fabricante.
//
// - Bullshooter no tiene scraping automático (se respeta su robots.txt):
//   solo se muestra un botón que lleva a su web a consultar la media a
//   mano, en vez de un MPR/PPD que nunca se va a rellenar solo.
// - Connection Darts distingue dos medias por jugador (Virtual y
//   Presencial, cada una con su propio MPR/PPD): se muestran las dos por
//   separado.
// - El resto (Phoenix, Radikal...) tiene una única media: se muestra
//   "MPR x.xx · PPD x.xx".
// En todos los casos con MPR/PPD se usa 0.00 como valor por defecto si
// todavía no hay datos, en vez de dejarlo en blanco (que es lo que hacía
// parecer que la media "no estaba" aunque el alias sí estuviera guardado).
export default function MediasFabricante({ idsFabricantes }) {
  const conAlias = (idsFabricantes || []).filter((i) => (i.idExterno || "").trim());
  if (conAlias.length === 0) return null;

  return (
    <div className="medias-fabricante">
      {conAlias.map((i) => {
        const nombre = i.nombreFabricante.toLowerCase();
        const esBullshooter = nombre.includes("bullshooter");
        const esConnection = nombre.includes("connection");
        const enlace =
          i.urlPerfilPlantilla && i.idExterno.trim()
            ? i.urlPerfilPlantilla.replace("{alias}", encodeURIComponent(i.idExterno.trim()))
            : null;
        return (
          <div key={i.fabricanteId} className="medias-fabricante-item">
            <div className="medias-fabricante-cabecera">
              {i.logoUrl ? (
                <img src={i.logoUrl} alt={i.nombreFabricante} className="medias-fabricante-logo" />
              ) : (
                <span className="medias-fabricante-logo medias-fabricante-logo-vacio" aria-hidden="true">🎯</span>
              )}
              <strong>{i.nombreFabricante}</strong>
            </div>
            <span className="medias-fabricante-alias">{i.idExterno}</span>
            {esBullshooter ? (
              enlace && (
                <a href={enlace} target="_blank" rel="noreferrer" className="admin-link-btn">
                  Ver mi media ↗
                </a>
              )
            ) : esConnection ? (
              <span className="medias-fabricante-stats medias-fabricante-stats-doble">
                <span>Virtual: MPR {Number(i.mprVirtual ?? 0).toFixed(2)} · PPD {Number(i.ppdVirtual ?? 0).toFixed(2)}</span>
                <span>Presencial: MPR {Number(i.mprPresencial ?? 0).toFixed(2)} · PPD {Number(i.ppdPresencial ?? 0).toFixed(2)}</span>
              </span>
            ) : (
              <span className="medias-fabricante-stats">
                MPR {Number(i.mpr ?? 0).toFixed(2)} · PPD {Number(i.ppd ?? 0).toFixed(2)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
