import { useEffect, useRef, useState } from "react";

// Texto que se guarda al salir del campo (o con Intro), no a cada tecla.
// Mientras se está escribiendo no lo pisa el refresco automático.
export default function CeldaTexto({ valor, onGuardar, placeholder, decimal, etiqueta }) {
  const [texto, setTexto] = useState(valor ?? "");
  const enfocado = useRef(false);
  useEffect(() => {
    if (!enfocado.current) setTexto(valor ?? "");
  }, [valor]);
  return (
    <input
      type="text"
      inputMode={decimal ? "decimal" : undefined}
      className={decimal ? "insc-cantidad" : undefined}
      value={texto}
      placeholder={placeholder}
      aria-label={etiqueta}
      onFocus={() => (enfocado.current = true)}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        enfocado.current = false;
        if (texto.trim() !== (valor ?? "")) onGuardar(texto.trim());
      }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
    />
  );
}
