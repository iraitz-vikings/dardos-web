import { useEffect, useState } from "react";
import { API_URL } from "./config.js";
import PerfilJugadorModal from "./PerfilJugadorModal.jsx";

// Carga la ficha de un jugador por su id (GET /api/jugadores/:id/ficha, con
// sesión de socio) y la muestra en el modal de perfil. La usa el cuadrante al
// pulsar un nombre. Si no hay sesión o falla, se cierra sin más.
export default function PerfilJugadorPorId({ jugadorId, onClose }) {
  const [jugador, setJugador] = useState(null);

  useEffect(() => {
    let vivo = true;
    const token = localStorage.getItem("socioToken");
    fetch(`${API_URL}/api/jugadores/${jugadorId}/ficha`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!vivo) return;
        if (j) setJugador(j);
        else onClose();
      })
      .catch(() => vivo && onClose());
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jugadorId]);

  if (!jugador) return null;
  return <PerfilJugadorModal jugador={jugador} onClose={onClose} />;
}
