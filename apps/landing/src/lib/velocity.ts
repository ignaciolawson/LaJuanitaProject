/**
 * Velocidad de scroll compartida.
 *
 * ScrollFx la actualiza en cada frame y quien la necesite la lee de acá.
 * La alternativa (leer `--vel` con getComputedStyle en cada tick) fuerza un
 * recálculo de estilos 60 veces por segundo y se nota en móviles: esto es
 * una lectura de propiedad y listo.
 */
export const scrollVelocity = { value: 0 };
