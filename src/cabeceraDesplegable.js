import { useEffect } from "react";

// Props para las cabeceras que abren/cierran un bloque (jornadas, rondas,
// competiciones, equipos...). Son <h4> con onClick, así que con teclado no
// se podían usar (revisión de accesibilidad 2026-10-08): con esto se pueden
// enfocar con Tab, se abren con Enter o Espacio y los lectores de pantalla
// saben que son botones y si están abiertos.
export function propsCabeceraDesplegable(abierta, alternar) {
  return {
    role: "button",
    tabIndex: 0,
    "aria-expanded": !!abierta,
    onClick: alternar,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        alternar();
      }
    },
  };
}

// Lo mismo para imágenes que se amplían al pulsarlas (galería, fotos de
// noticias, cartel, patrocinadores): sin esto no se podían abrir con teclado.
export function propsAmpliable(abrir) {
  return {
    role: "button",
    tabIndex: 0,
    onClick: abrir,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrir();
      }
    },
  };
}

// Cierra una ventana (modal, visor de fotos...) con la tecla Escape mientras
// `activo` sea true.
export function useCerrarConEscape(activo, cerrar) {
  useEffect(() => {
    if (!activo) return undefined;
    const onKey = (e) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activo, cerrar]);
}
