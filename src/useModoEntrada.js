import useEstadoRecordado from "./useEstadoRecordado.js";

// Modo de entrada (diana/números/total) elegido en el marcador de
// Marcadores.jsx y JuegoHerramienta.jsx: se recuerda entre legs y partidas
// (cada leg es un componente nuevo y con useState volvía siempre a la
// diana). Por defecto el teclado: "total" en 501 y "numeros" en Cricket,
// que no admite total. Uno por juego para que el de 501 no acabe en Cricket.
export default function useModoEntrada(juego) {
  const validos = juego === "501" ? ["total", "numeros", "diana"] : ["numeros", "diana"];
  const [modo, setModo] = useEstadoRecordado(`marcador.modoEntrada.${juego}`, validos[0]);
  return [validos.includes(modo) ? modo : validos[0], setModo];
}
