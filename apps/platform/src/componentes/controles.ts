/**
 * El control de línea: la forma que tienen TODOS los campos de este sistema.
 *
 * No son cajas sino líneas, y eso es una decisión de la Fase 3 — el mismo
 * lenguaje que la landing, *"más cerca de una planilla de estudio que de un
 * formulario de SaaS"*. En una pantalla de carga, veinte bordes redondeados
 * compiten con los datos que uno vino a leer.
 *
 * **Estaba definido dos veces**: `Campo` tenía su `BASE` para los formularios y
 * los filtros lo llevaban copiado a mano en 30 lugares, con otro relleno. Dos
 * definiciones de la misma cosa es la deuda que este proyecto ya paga en la
 * base de datos con `contarClasesConsumidas` contra `V9` §5; no hacía falta
 * sumarle una en el CSS.
 *
 * ⚠️ **El `focus:border-red` no se saca, y el `outline` tampoco.** Los 30
 * controles a mano llevaban `outline-none` copiado y ninguno lo reemplazaba por
 * nada: navegando con teclado, saber en qué campo estabas dependía de notar que
 * una línea de 1px había cambiado de tono. `index.css` cierra con una regla
 * escrita con todas las letras sobre eso, y el borde rojo es su refuerzo, no su
 * reemplazo.
 *
 * ⚠️ **El archivo NO se puede llamar `filtros.ts` ni `campo.ts`.** Este proyecto
 * se desarrolla en Windows, donde el sistema de archivos no distingue
 * mayúsculas, así que `filtros.ts` y `Filtros.tsx` son **el mismo archivo** para
 * la resolución de módulos. TypeScript lo dice —*"differs from file name only in
 * casing"*— pero recién al compilar, y en Linux (o sea, en CI y en el deploy) el
 * mismo código andaría: es un error que aparece o no según la máquina.
 */
const LINEA =
  'w-full border-0 border-b bg-transparent px-0 text-sm transition-colors focus:border-red'

/**
 * El de un formulario. Respira más porque abajo lleva su mensaje de error, y
 * el color del borde lo pone quien lo usa: rojo cuando ese campo falló.
 */
export const CONTROL_DE_FORMULARIO = `${LINEA} py-2`

/**
 * El de una barra de filtros. Va más apretado: son tres o cuatro en una fila y
 * la barra no puede ocupar el alto de una tarjeta.
 */
export const CONTROL_DE_FILTRO = `${LINEA} border-linea py-1.5`
