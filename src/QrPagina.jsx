import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Código QR de la página actual, generado en el propio navegador (librería
// `qrcode`). Antes se pedía la imagen a api.qrserver.com, que recibía la
// dirección de la página y la IP del visitante sin que este lo supiera
// (revisión de normativa 2026-09-29). Lo usan TorneoPage.jsx y LigaPage.jsx.
export default function QrPagina() {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    QRCode.toDataURL(window.location.href, { width: 200, margin: 2 })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, []);

  if (!src) return null;
  return <img src={src} alt="Código QR de esta página" width={160} height={160} />;
}
