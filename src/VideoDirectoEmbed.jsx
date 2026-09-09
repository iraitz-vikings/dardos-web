import { idVideoYoutube } from "./youtubeEmbed.js";

// Embebe el vídeo de YouTube en directo de un torneo/liga (campo
// `videoDirectoUrl`, ver dardos-club-backend/src/lib/videoDirecto.js). Se usa
// en TorneoPage.jsx y LigaPage.jsx; no renderiza nada si no hay URL o no se
// reconoce como YouTube.
export default function VideoDirectoEmbed({ url, titulo }) {
  const idVideo = idVideoYoutube(url);
  if (!idVideo) return null;

  return (
    <div className="video-directo-embed">
      <div className="video-directo-embed-marco">
        <iframe
          src={`https://www.youtube.com/embed/${idVideo}?autoplay=0`}
          title={titulo ? `Directo: ${titulo}` : "Retransmisión en directo"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
