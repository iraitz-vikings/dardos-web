import CargaExterna from "./CargaExterna.jsx";
import { useLang } from "./i18n.jsx";
import { idVideoYoutube } from "./youtubeEmbed.js";

// Embebe el vídeo de YouTube en directo de un torneo/liga (campo
// `videoDirectoUrl`, ver dardos-club-backend/src/lib/videoDirecto.js). Se usa
// en TorneoPage.jsx y LigaPage.jsx; no renderiza nada si no hay URL o no se
// reconoce como YouTube.
export default function VideoDirectoEmbed({ url, titulo }) {
  const { t } = useLang();
  const idVideo = idVideoYoutube(url);
  if (!idVideo) return null;

  return (
    <div className="video-directo-embed">
      <div className="video-directo-embed-marco">
        <CargaExterna servicio="YouTube" boton={t("video.play")}>
          {() => (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${idVideo}?autoplay=1`}
              title={titulo ? `Directo: ${titulo}` : "Retransmisión en directo"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </CargaExterna>
      </div>
    </div>
  );
}
