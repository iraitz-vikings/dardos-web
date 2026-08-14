// Lista de medias (MPR/PPD) de fabricante de un jugador. Se usa tanto en "Mi
// perfil" como en la ventana de perfil de "Jugadores del club", para no
// duplicar la lógica de cómo se muestra cada fabricante.
//
// Bullshooter no tiene scraping automático (se respeta su robots.txt): para
// ese fabricante solo se muestra un botón que lleva a su web a consultar la
// media a mano, en vez de un MPR/PPD que nunca se va a rellenar solo.
// Para el resto (Connection, Phoenix, Radikal...) se muestra siempre
// "MPR x.xx · PPD x.xx", con 0.00 como valor por defecto si todavía no hay
// datos (en vez de dejarlo en blanco, que es lo que hacía parecer que la
// media "no estaba" aunque el alias sí estuviera guardado).
export default function MediasFabricante({ idsFabricantes }) {
  const conAlias = (idsFabricantes || []).filter((i) => (i.idExterno || "").trim());
  if (conAlias.length === 0) return null;

  return (
    <div className="medias-fabricante">
      {conAlias.map((i) => {
        const esBullshooter = i.nombreFabricante.toLowerCase().includes("bullshooter");
        const enlace =
          i.urlPerfilPlantilla && i.idExterno.trim()
            ? i.urlPerfilPlantilla.replace("{alias}", encodeURIComponent(i.idExterno.trim()))
            : null;
        return (
          <div key={i.fabricanteId} className="medias-fabricante-item">
            <strong>{i.nombreFabricante}</strong>
            <span className="medias-fabricante-alias">{i.idExterno}</span>
            {esBullshooter ? (
              enlace && (
                <a href={enlace} target="_blank" rel="noreferrer" className="admin-link-btn">
                  Ver mi media ↗
                </a>
              )
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
