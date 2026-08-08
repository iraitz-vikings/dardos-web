import { useEffect, useState } from "react";

// Se activa cuando un partido pasa a estar "en curso" y se desactiva solo a los 60s
// (o antes, si deja de estar en curso), para poder resaltarlo brevemente.
export default function useResaltadoReciente(enCurso, clave) {
  const [reciente, setReciente] = useState(false);

  useEffect(() => {
    if (!enCurso) {
      setReciente(false);
      return;
    }
    setReciente(true);
    const t = setTimeout(() => setReciente(false), 60000);
    return () => clearTimeout(t);
  }, [enCurso, clave]);

  return reciente;
}
