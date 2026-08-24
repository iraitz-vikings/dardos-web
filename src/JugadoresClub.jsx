import { useEffect, useState } from "react";
import MediasFabricante from "./MediasFabricante.jsx";
import { agruparPorSocio } from "./agruparJugadores.js";

const API_URL = import.meta.env.VITE_API_URL || "https://dardos-club-backend-production.up.railway.app";

export default function JugadoresClub() {
  const [jugadores, setJugadores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/jugadores/directorio`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then(setJugadores)
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const filtrados = jugadores.filter((j) => j.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const { socios, invitados } = agruparPorSocio(filtrados);

  const tarjeta = (j) => (
    <div
      key={j.id}
      className="jugador-tarjeta"
      style={{ padding: "1rem" }}
      role="button"
      tabIndex={0}
      onClick={() => setSeleccionado(j)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setSeleccionado(j);
        }
      }}
    >
      {j.avatarUrl ? (
        <img
          src={j.avatarUrl}
          alt={j.nombre}
          style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", margin: "0 auto .6rem" }}
        />
      ) : (
        <div
          style={{
            width: 72, height: 72, borderRadius: "50%", margin: "0 auto .6rem",
            background: "var(--iron-2)", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.4rem", color: "var(--bone)",
          }}
        >
          {j.nombre.charAt(0).toUpperCase()}
        </div>
      )}
      <strong style={{ display: "block" }}>{j.nombre}</strong>
      {j.apodo && <em style={{ fontSize: ".85em", color: "var(--steel)" }}>"{j.apodo}"</em>}
      {j.bio && <p style={{ fontSize: ".82em", marginTop: ".5rem" }}>{j.bio}</p>}
    </div>
  );

  return (
    <div>
      <h3>Jugadores del club</h3>
      <input
        type="text"
        placeholder="Buscar jugador…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />

      {cargando && <p className="chronicle-status">Cargando…</p>}
      {!cargando && filtrados.length === 0 && <p className="chronicle-status">No hay jugadores que coincidan.</p>}

      {socios.length > 0 && (
        <>
          <h4>Socios</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            {socios.map(tarjeta)}
          </div>
        </>
      )}
      {invitados.length > 0 && (
        <>
          <h4>Invitados</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem" }}>
            {invitados.map(tarjeta)}
          </div>
        </>
      )}

      {seleccionado && (
        <div className="perfil-jugador-modal" onClick={() => setSeleccionado(null)}>
          <div className="perfil-jugador-panel" onClick={(e) => e.stopPropagation()}>
            <div className="perfil-jugador-panel-header">
              <button type="button" className="admin-link-btn" onClick={() => setSeleccionado(null)}>Cerrar</button>
            </div>
            <div className="perfil-jugador-cabecera">
              {seleccionado.avatarUrl ? (
                <img
                  src={seleccionado.avatarUrl}
                  alt={seleccionado.nombre}
                  style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: "var(--iron-2)", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.6rem", color: "var(--bone)",
                  }}
                >
                  {seleccionado.nombre.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <strong style={{ display: "block", fontSize: "1.15rem" }}>{seleccionado.nombre}</strong>
                {seleccionado.apodo && <span style={{ display: "block", opacity: 0.85 }}>"{seleccionado.apodo}"</span>}
                {seleccionado.usuarioId && (
                  <span style={{ fontSize: ".7em", color: "var(--ember)" }}>Socio</span>
                )}
              </div>
            </div>
            {seleccionado.bio && <p className="perfil-jugador-bio">{seleccionado.bio}</p>}
            <MediasFabricante idsFabricantes={seleccionado.idsFabricantes} />
            {(seleccionado.idsFabricantes || []).filter((i) => (i.idExterno || "").trim()).length === 0 && (
              <p className="chronicle-status">Todavía no ha guardado ningún alias de fabricante.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
