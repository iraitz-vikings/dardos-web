import AccesoHerramienta from "./JuegoHerramienta.jsx";

// Página pública /partidas (plan "partido-amistoso-remoto", guardado en el
// proyecto): entrada independiente de cualquier torneo/liga concretos, para
// jugar en remoto desde el propio móvil. Se identifica por PIN igual que
// siempre (ver LoginPin en JuegoHerramienta.jsx) y lista TODOS los partidos
// pendientes del jugador — torneo, liga y amistosos juntos, sin filtrar por
// entidad (ver GET /pendientes en el backend). Es el enlace que se comparte
// al retar a alguien a un amistoso (ver RetarAmistoso.jsx).

export default function PaginaPartidas() {
  return (
    <div className="admin-form" style={{ maxWidth: 640, margin: "2rem auto" }}>
      <h2 style={{ marginTop: 0 }}>Tus partidos</h2>
      <p className="chronicle-status">
        Identifícate con tu PIN para jugar cualquiera de tus partidos pendientes (torneo, liga o amistoso)
        desde este dispositivo.
      </p>
      <AccesoHerramienta activa entidadNombre="tus partidos" autoAbrir />
    </div>
  );
}
