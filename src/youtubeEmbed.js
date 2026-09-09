// Utilidad compartida para extraer el ID de un vídeo de YouTube a partir de
// su URL — usada por el campo `videoDirectoUrl` de TorneoClub/LigaClub (ver
// dardos-club-backend/src/lib/videoDirecto.js) en TorneoPage.jsx, LigaPage.jsx,
// AdminTorneosClub.jsx, AdminLigasClub.jsx y en la sección de streaming de
// App.jsx (Home).
//
// Nota: App.jsx tiene su propia copia local de esta misma función (para los
// vídeos de noticias) que se deja tal cual para no arriesgar esa parte ya en
// producción — esta es la copia "nueva" para el resto de usos.
export function idVideoYoutube(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
