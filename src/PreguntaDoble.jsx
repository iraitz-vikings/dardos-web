// Ventanita "¿cuántos dardos al doble?" que sale encima del marcador al
// cerrar (o fallar el cierre de) una visita — compartida por Marcadores.jsx
// y JuegoHerramienta.jsx. Antes era un aviso de texto encima de la diana/
// teclado y en horizontal quedaba apretado junto a él; como ventana tapa el
// resto hasta responder, que es justo lo que se quiere (la diana y los
// teclados ya están deshabilitados mientras hay pregunta).
export default function PreguntaDoble({ tirador, necesitaConfirmarCierre, restanteInicioVisita, onResponder }) {
  return (
    <div className="pregunta-doble-modal">
      <div className="pregunta-doble-panel" role="dialog" aria-modal="true" aria-labelledby="pregunta-doble-titulo">
        <p id="pregunta-doble-titulo" className="pregunta-doble-texto">
          ¿Cuántos dardos de esta visita ha tirado <strong>{tirador}</strong> al doble/máster?
        </p>
        {necesitaConfirmarCierre && (
          <p className="pregunta-doble-nota">
            Si ninguno ha sido un cierre válido, marca 0: la visita no contará y sigue con {restanteInicioVisita}.
          </p>
        )}
        <div className="pregunta-doble-botones">
          {[0, 1, 2, 3].map((n) => (
            <button key={n} type="button" className="pregunta-doble-boton" onClick={() => onResponder(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
