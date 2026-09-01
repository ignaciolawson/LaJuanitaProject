import type { ReactNode } from 'react'

/**
 * La tarjeta con nombre: el contenedor de una sección dentro de una pantalla.
 *
 * **Estaba escrita a mano 60 veces**, con seis rellenos distintos (`p-5`,
 * `px-5 py-4`, `px-5 py-6`, `p-4`, `px-4 py-3`…) y el título suelto arriba en
 * un `<h3 className="t-seccion mb-3">` con cuatro separaciones diferentes. Es
 * exactamente lo que le pasaba a `Tabla` antes de la 3.1, con el mismo costo:
 * el próximo cambio de estilo son sesenta ediciones.
 *
 * **Y arregla lo que Ignacio pidió con estas palabras: *"que haya ahí
 * rectángulos que te digan la sección"*.** El diagnóstico era correcto y el
 * problema era literal — una sección se anunciaba con once píxeles de texto
 * gris y nada más, así que las pantallas eran una sucesión de rectángulos
 * blancos indistinguibles. Acá el título vive DENTRO del bloque, sobre una
 * franja con su propio tono: el nombre y lo que nombra son una sola pieza, no
 * dos cosas que quedaron cerca.
 *
 * La franja también resuelve la falta de profundidad, y sale gratis: son dos
 * tonos dentro de la misma tarjeta (`--superficie-2` sobre `--superficie`), o
 * sea la paleta que ya existía, sin sumar un color.
 *
 * **El título es `<h2>` y no `<h3>`.** Las 38 secciones estaban en `<h3>` bajo
 * el `<h1>` de `CabeceraDePagina`: un nivel salteado, que para quien navega con
 * lector de pantalla es una sección que parece colgar de algo que no está. Es
 * la misma corrección de jerarquía que la 3.1 hizo al sacar la barra superior,
 * terminada del otro lado.
 */
export function Bloque({
  titulo,
  accion,
  destacado = false,
  nivel = 2,
  relleno = 'normal',
  className = '',
  children,
}: {
  /** Sin título no hay franja: el bloque es sólo el contenedor. */
  titulo?: ReactNode
  /** Lo que va a la derecha de la franja: un link, un botón, un contador. */
  accion?: ReactNode
  /**
   * El bloque que importa en esta pantalla, marcado con una línea roja arriba.
   *
   * ⚠️ **Uno por pantalla y ninguno es válido.** Es la misma regla que
   * `index.css` escribe para el rojo entero: si aparece en todos lados deja de
   * señalar nada. Dos bloques destacados no destacan el doble — no destacan.
   */
  destacado?: boolean
  /**
   * Nivel del encabezado. `2` por defecto — el bloque cuelga directo del
   * `<h1>` de la pantalla.
   *
   * ⚠️ **Un bloque adentro de un `Grupo` va en `3`**, porque el `Grupo` ya
   * gastó el `<h2>`. Dos `<h2>` anidados no rompen nada visualmente y
   * describen mal la pantalla: quien navega por encabezados escucha doce
   * secciones hermanas donde hay tres grupos con cuatro tarjetas cada uno.
   */
  nivel?: 2 | 3
  /** `apretado` para las tarjetas de cifra, donde el número es el contenido. */
  relleno?: 'normal' | 'apretado' | 'ninguno'
  className?: string
  children: ReactNode
}) {
  const PADS = {
    normal: 'p-5',
    apretado: 'px-5 py-4',
    // Para lo que trae su propio relleno adentro: una tabla, una lista de
    // filas separadas por línea. Sin esto habría que pelearle al padding.
    ninguno: '',
  }

  return (
    <section
      className={`overflow-hidden rounded-lg border border-linea bg-superficie shadow-tarjeta ${className}`}
    >
      {/* La línea de acento va arriba de todo y mide 2px: es el mismo gesto que
          la barra del ítem activo del sidebar, del otro lado de la costura. */}
      {destacado && <div aria-hidden className="h-0.5 bg-red" />}

      {titulo && (
        <div className="flex items-center justify-between gap-3 border-b border-linea bg-superficie-2 px-5 py-2.5">
          {nivel === 2 ? (
            <h2 className="t-mono min-w-0 truncate text-tenue">{titulo}</h2>
          ) : (
            <h3 className="t-mono min-w-0 truncate text-tenue">{titulo}</h3>
          )}
          {accion && <div className="shrink-0">{accion}</div>}
        </div>
      )}

      <div className={PADS[relleno]}>{children}</div>
    </section>
  )
}

/**
 * El hueco hundido dentro de un bloque: un dato destacado, una contraseña
 * temporal, una aclaración enmarcada.
 *
 * Estaba escrito a mano diez veces y **acertaban todas** — usaban
 * `bg-superficie-2`, que es el tono correcto. Lo que faltaba no era el color,
 * era el nombre; igual que cuando `--superficie-2` no existía y diez lugares
 * escribían `bg-papel`.
 *
 * ⚠️ En claro `--superficie-2` ES el papel, así que el hueco deja ver el fondo
 * que hay atrás. **En oscuro no puede serlo** y es un tono propio: sobre tinta
 * un hueco más oscuro que la tarjeta se lee como un agujero, no como un
 * relieve. Está resuelto en los tokens, no acá.
 */
export function Hueco({
  className = '',
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`rounded-md border border-linea bg-superficie-2 px-4 py-3 ${className}`}>
      {children}
    </div>
  )
}

/**
 * La banda de un dominio: agrupa varios `Bloque` bajo un nombre.
 *
 * Son los dos niveles del sistema de secciones y conviene no confundirlos:
 * **`Bloque` es la tarjeta con nombre; `Grupo` es lo que agrupa tarjetas.**
 * Uno lleva su título adentro, sobre una franja; el otro lo lleva afuera,
 * sobre una regla que cruza la pantalla.
 *
 * La regla no es adorno: **once píxeles de texto gris no alcanzan para partir
 * una pantalla en dos**, y sin ella el Inicio se leía como una sola bolsa de
 * doce tarjetas iguales y el Tablero como una tira de números sueltos. Estaba
 * escrita a mano en las dos, distinto en cada una.
 */
export function Grupo({
  titulo,
  aclaracion,
  accion,
  children,
}: {
  titulo: string
  /**
   * La línea que dice de qué período habla, o que aclara qué se está contando.
   *
   * ⚠️ **No es decoración y no se saca.** Es donde el Tablero dice *"al día de
   * hoy, no del período"*: sin esa línea alguien mira agosto, ve la deuda y
   * cree que se generó en agosto. Es la misma regla que `CabeceraDePagina`.
   */
  aclaracion?: ReactNode
  accion?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="mb-9 last:mb-0">
      <div className="flex items-center gap-3">
        <h2 className="t-mono shrink-0 text-tenue">{titulo}</h2>
        <span aria-hidden className="h-px grow bg-linea" />
        {accion && <div className="shrink-0">{accion}</div>}
      </div>

      {aclaracion && <p className="mt-1.5 text-xs text-tenue">{aclaracion}</p>}

      <div className="mt-4">{children}</div>
    </section>
  )
}
