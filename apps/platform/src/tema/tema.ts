import type { UsuarioActual } from '../api/tipos'
import { puedeAdministrar } from '../layout/menu'

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
 * 1. **El default sale del perfil**, no de una preferencia del navegador ni de
 *    un valor fijo. Quien administra arranca en claro; quien no, en oscuro.
 * 2. **La elección de la persona le gana al default, siempre.** Una vez que
 *    alguien toca el interruptor, esa es su preferencia y el perfil deja de
 *    opinar — incluso si después cambia de rol.
 *
 * ⚠️ **El shell NO cambia con el tema.** El sidebar es tinta en los dos, y esa
 * es la identidad: lo que el interruptor cambia es el lienzo. En oscuro el
 * shell se hunde un tono más para que "dónde estoy" y "qué estoy mirando"
 * sigan siendo dos superficies distintas (ver `index.css`).
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

/** El default de quien todavía no eligió. Ver la regla 1 del comentario. */
export function temaPorDefecto(usuario: UsuarioActual | null): Tema {
  if (usuario === null) return 'claro'
  return puedeAdministrar(usuario) ? 'claro' : 'oscuro'
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
