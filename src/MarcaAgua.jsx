// Marca de agua discreta con el nombre del socio que está viendo la página,
// para que una captura de pantalla de contenido solo-socios (fotos de la
// galería privada, calendario) que acabe compartida fuera del club se pueda
// rastrear hasta quién la hizo. No impide la captura (eso no es posible
// desde una web) — solo añade una pequeña disuasión y trazabilidad.
//
// Por defecto se posiciona en la esquina del elemento envolvente más cercano
// (que debe llevar `position: relative`) — pensado para una sola foto.
// Con `fijo`, se ancla a la esquina de la pantalla en vez de a un elemento
// (para secciones largas o con scroll, como el calendario, donde una capa
// absoluta podría acabar fuera de la parte visible).
// Pedido por Iraitz, 2026-09-10.
export default function MarcaAgua({ usuario, fijo }) {
  const etiqueta = usuario?.nombre || usuario?.email;
  if (!etiqueta) return null;
  return (
    <span className={`marca-agua ${fijo ? "marca-agua-fija" : ""}`} aria-hidden="true">
      {etiqueta}
    </span>
  );
}
