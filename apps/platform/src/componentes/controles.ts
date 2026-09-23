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
 * ⚠️ **El borde va en `--linea-control` y no en `--linea`.** Un campo de este
 * sistema es una línea, así que ese borde de 1px es toda la señal de que ahí se
 * escribe — o sea es un control, y WCAG le pide 3:1. `--linea` mide 1,3:1:
 * separa superficies, que es otra cosa. (§12 · A3.)
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
/**
 * ⚠️ **`min-h-11` es el área tocable de P108** (§26 · Etapa 2), y va acá abajo
 * porque los dos controles la necesitan igual. Medido antes de tocar nada: el
 * de formulario daba **36px** de alto y el de filtro **32**, contra los 44 que
 * hace falta acertarle con el dedo. Desde `lg` el `min-h-0` devuelve el alto al
 * relleno de siempre, así que **en escritorio no cambia un píxel** — la barra de
 * filtros sigue sin ocupar el alto de una tarjeta, que es lo que la apretaba.
 *
 * Va como altura mínima y no como más `py` por la misma razón que en `Boton`:
 * el alto de estos controles es relleno + interlineado, una cuenta que se hace
 * mal de memoria. La altura se pide.
 */
const TOCABLE = 'min-h-11 lg:min-h-0'

const LINEA =
  `w-full border-0 border-b bg-transparent px-0 text-sm transition-colors focus:border-red ${TOCABLE}`

/**
 * El de un formulario. Respira más porque abajo lleva su mensaje de error, y
 * el color del borde lo pone quien lo usa: rojo cuando ese campo falló.
 */
export const CONTROL_DE_FORMULARIO = `${LINEA} py-2`

/**
 * El de una barra de filtros. Va más apretado: son tres o cuatro en una fila y
 * la barra no puede ocupar el alto de una tarjeta.
 */
export const CONTROL_DE_FILTRO = `${LINEA} border-linea-control py-1.5`

/**
 * La casilla de verificación, que es el control que la Etapa 2 dejó anotado.
 *
 * ⚠️ **Es la altura de su `<label>`, no la del cuadradito.** Un `<input
 * type="checkbox">` mide lo que el navegador quiera (~13-16px) y no se toca
 * solo: lo que se toca es la etiqueta entera, que hoy mide lo que mide su línea
 * de texto —unos 20px— y es tocable por el ancho de la frase, no por el alto.
 * O sea que apuntarle con el dedo es acertarle a una franja de 20px, que es el
 * mismo problema que tenía `variante="enlace"` en `Boton`.
 *
 * <p>Por eso la altura va en el `<label>` y no se le cambia el tamaño al
 * cuadradito: agrandarlo sería redibujar el control en escritorio, y la regla
 * de P108 es que **desde `lg` no se mueve un píxel**.
 *
 * <p>Son dos formas porque en el sistema hay dos usos distintos, y la
 * alineación no es intercambiable: `EN_LINEA` para la casilla de una sola línea
 * —un filtro, un integrante de un grupo—, donde el texto va centrado contra el
 * cuadradito; `CON_TEXTO` para la que arrastra una explicación de dos o tres
 * renglones, donde el cuadradito tiene que quedarse arriba con la primera línea
 * (esas ya pasan los 44px solas, así que ahí el `min-h-11` es un piso que no se
 * nota — y está igual, porque el piso es el que no hay que volver a pensar).
 */
export const CASILLA_EN_LINEA = `flex items-center gap-2 ${TOCABLE}`

/** La que lleva una explicación de varios renglones al lado. Ver arriba. */
export const CASILLA_CON_TEXTO = `flex items-start gap-2 ${TOCABLE}`
