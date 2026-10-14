import { useState } from "react";

// useState que sobrevive a recargar la página (pedido de Iraitz,
// 2026-10-14: al actualizar se volvía siempre a la primera sección). Se
// guarda en sessionStorage, así que dura lo que la pestaña del navegador:
// una pestaña nueva empieza de cero. Para pestañas y secciones, no para
// datos. Quien lo use debe comprobar que el valor recuperado sigue siendo
// válido (p. ej. una sección que ya no existe) y caer al inicial si no.
export default function useEstadoRecordado(clave, inicial) {
  const [valor, setValorInterno] = useState(() => {
    try {
      const guardado = sessionStorage.getItem(clave);
      return guardado === null ? inicial : JSON.parse(guardado);
    } catch {
      return inicial;
    }
  });

  function setValor(nuevo) {
    setValorInterno((anterior) => {
      const siguiente = typeof nuevo === "function" ? nuevo(anterior) : nuevo;
      try { sessionStorage.setItem(clave, JSON.stringify(siguiente)); } catch { /* sin almacenamiento */ }
      return siguiente;
    });
  }

  return [valor, setValor];
}
