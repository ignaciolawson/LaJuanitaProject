import type { UsuarioActual } from '../api/tipos'

/**
 * El tema del lienzo: claro o oscuro.
 *
 * **Existe porque el sistema tiene dos públicos con dos usos distintos, no
 * porque esté de moda.** Micaela mira estas pantallas ocho horas por día
 * cargando alumnos y cobrando; un alumno entra cinco minutos a ver cuándo es
 * su próxima clase. La decisión vieja —todo claro porque se mira ocho horas
 * por día— era correcta para la primera y nunca se le preguntó nada a la
 * segunda.
 *
 * De ahí las dos reglas:
 *
 * 1. ~~**El default sale del perfil**: quien administra arranca en claro;
 *    quien no, en oscuro.~~ Reemplazada el 2026-10-17: **oscuro para todos**
 *    (ver `temaPorDefecto`).
 * 2. **La elección de la persona le gana al default, siempre.** Una vez que
 *    alguien toca el interruptor, esa es su preferencia y el perfil deja de
 *    opinar — incluso si después cambia de rol.
 *
 * ⚠️ **El shell cambia con el tema, igual que el lienzo** (§12 · A4, decisión de
 * Ignacio del 2026-09-01). El interruptor cambia la pantalla entera: en claro el
 * sidebar es hueso, en oscuro tinta. Lo que NO cambia es que sean dos
 * superficies distintas — es lo que separa "dónde estoy" de "qué estoy mirando"
 * —, y eso se sostiene en los dos temas (ver `index.css`).
 *
 * La única superficie que se queda en tinta pase lo que pase es la mitad de foto
 * de `Puerta`: ahí la tinta no es una superficie de trabajo, es la marca.
 */
export type Tema = 'claro' | 'oscuro'

/**
 * ⚠️ Es una clave DISTINTA de `lajuanita.credencial`, y tiene que seguir
 * siéndolo: el tema sobrevive a cerrar sesión —es de la persona y de este
 * navegador, no de la sesión— mientras que la credencial se borra. Guardarlos
 * juntos haría que salir del sistema te devuelva un tema que no elegiste.
 */
const CLAVE = 'lajuanita.tema'

function esTema(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'oscuro'
}

/** Lo que la persona eligió alguna vez, o `null` si nunca tocó el interruptor. */
export function temaGuardado(): Tema | null {
  try {
    const crudo = localStorage.getItem(CLAVE)
    return esTema(crudo) ? crudo : null
  } catch {
    // localStorage puede tirar en modo privado o con las cookies bloqueadas.
    // Un tema es una preferencia, no un dato: si no se puede leer, se usa el
    // default y no pasa nada más.
    return null
  }
}

export function guardarTema(tema: Tema): void {
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // Mismo criterio que arriba: se aplica igual en esta pestaña, sólo que no
    // sobrevive a recargar.
  }
}

/**
 * El default de quien todavía no eligió.
 *
 * ⚠️ **Oscuro para todos desde el 2026-10-17** (pedido de Ignacio). La regla 1
 * del comentario de arriba —claro para quien administra, oscuro para el resto—
 * se reemplazó por esta; la regla 2 sigue igual: quien ya tocó el interruptor
 * conserva lo que eligió. El parámetro queda para que volver a un default por
 * perfil sea cambiar este cuerpo y nada más.
 *
 * Si se cambia, cambia también el script del `<head>` de `index.html`, que
 * aplica este mismo default antes de que React monte.
 */
export function temaPorDefecto(_usuario: UsuarioActual | null): Tema {
  return 'oscuro'
}

/**
 * Lo escribe en el `<html>`, que es lo que leen los selectores de `index.css`.
 *
 * Va en el elemento raíz y no en el `<body>` porque `color-scheme` tiene que
 * estar ahí para que el navegador pinte los controles nativos y la barra de
 * scroll del documento: en el body llega tarde para las dos cosas.
 */
export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema
}
