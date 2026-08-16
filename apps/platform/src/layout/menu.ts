import type { Rol, UsuarioActual } from '../api/tipos'

/**
 * El menú del portal, armado desde la respuesta de `GET /api/me`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LAS REGLAS, que son tres y es fácil confundirlas en una sola:
 *
 * 1. Ligadas a UN SERVICIO QUE CUALQUIERA CONTRATA → aparecen SIEMPRE.
 *    Reservar cabina, Mix & Mastering, Mis pagos.
 *
 *    Esta es la que se olvida y la que más duele. Si estas secciones se
 *    mostraran solo a quien ya tiene una reserva o un pago, quien nunca
 *    reservó no vería nunca el botón de reservar y no podría hacer su
 *    primera reserva jamás.
 *
 * 2. Ligadas a QUIÉN SOS (relación de negocio) → solo si la relación existe.
 *    Mis cursos exige `esAlumno`; Mis alumnos y Subir material, `esProfesor`.
 *
 * 3. Ligadas a QUÉ PODÉS ADMINISTRAR (rol) → solo para quien tiene permiso.
 *
 * Las reglas 2 y 3 son ejes INDEPENDIENTES: Ghezz es STAFF y además profesor,
 * y ve las dos cosas sin contradicción.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Nada de esto está hardcodeado por usuario: todo sale de `UsuarioActual`.
 */

export type ItemMenu = {
  etiqueta: string
  ruta: string
  /** Sin predicado = visible siempre (regla 1). */
  visible?: (usuario: UsuarioActual) => boolean
  /**
   * `false` mientras el módulo no exista. Se dibuja apagado y no navega, en
   * vez de mandar a una pantalla vacía que parece un error. Se pone en `true`
   * cuando el módulo se construye de verdad.
   */
  disponible: boolean
}

export type GrupoMenu = {
  titulo: string
  items: ItemMenu[]
}

const MENU: GrupoMenu[] = [
  {
    titulo: 'Mi cuenta',
    items: [
      { etiqueta: 'Inicio', ruta: '/', disponible: true },
      // Regla 1: sin predicado. Van siempre, para todo el mundo.
      { etiqueta: 'Reservar cabina', ruta: '/reservar', disponible: false },
      { etiqueta: 'Mix & Mastering', ruta: '/mix-mastering', disponible: false },
      { etiqueta: 'Mis pagos', ruta: '/mis-pagos', disponible: false },
    ],
  },
  {
    titulo: 'Mi formación',
    items: [
      // Regla 2: dependen de la relación, no del rol.
      { etiqueta: 'Mis cursos', ruta: '/mis-cursos', visible: (u) => u.esAlumno, disponible: false },
      { etiqueta: 'Mis alumnos', ruta: '/mis-alumnos', visible: (u) => u.esProfesor, disponible: false },
      { etiqueta: 'Subir material', ruta: '/material', visible: (u) => u.esProfesor, disponible: false },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      // Regla 3: dependen del rol.
      // DIRECTIVO ve estas pantallas pero no escribe nada; eso lo impone el
      // backend, no el menú. Ocultárselas acá sería mentir sobre lo que puede.
      { etiqueta: 'Alumnos', ruta: '/admin/alumnos', visible: puedeAdministrar, disponible: true },
      {
        etiqueta: 'Inscripciones',
        ruta: '/admin/inscripciones',
        visible: puedeAdministrar,
        disponible: true,
      },
      { etiqueta: 'Personas', ruta: '/admin/usuarios', visible: puedeAdministrar, disponible: true },
      { etiqueta: 'Reservas', ruta: '/admin/reservas', visible: puedeAdministrar, disponible: false },
      { etiqueta: 'Pagos', ruta: '/admin/pagos', visible: puedeAdministrar, disponible: false },
      {
        etiqueta: 'Dashboard',
        ruta: '/admin/dashboard',
        // El dashboard ejecutivo completo (facturación) es solo de dirección.
        // Micaela, que es STAFF, ve el resumen financiero básico dentro de
        // Pagos -- no esta pantalla.
        visible: (u) => u.rol === 'ADMIN' || u.rol === 'DIRECTIVO',
        disponible: false,
      },
    ],
  },
]

/**
 * Quién ve las pantallas de administración. Espeja `@PuedeLeerAdministracion`
 * del backend (ADMIN·DIRECTIVO·STAFF).
 *
 * Escrito por enumeración y no como `rol !== 'USUARIO'`: por negación funciona
 * hoy **por coincidencia**, y un quinto rol entraría solo al menú de acá y
 * recibiría 403 del backend. Enumerado, un rol nuevo queda afuera hasta que
 * alguien decida lo contrario, que es el default correcto.
 */
export function puedeAdministrar(usuario: UsuarioActual): boolean {
  return ADMINISTRAN.includes(usuario.rol)
}

const ADMINISTRAN: Rol[] = ['ADMIN', 'DIRECTIVO', 'STAFF']

/**
 * El segundo eje del rol: quién puede ESCRIBIR.
 *
 * `puedeAdministrar` dice quién ve las pantallas de administración;
 * este dice quién puede tocar algo adentro. Son distintos, y esa diferencia
 * es la razón de ser del rol DIRECTIVO: lee todo el sistema y no modifica nada.
 *
 * Espeja `@PuedeOperar` del backend (ADMIN·STAFF). Sin esto, un socio entraba a
 * Alumnos, veía "Nuevo alumno", completaba el formulario y recibía "No tenés
 * permiso para hacer esto" — el sistema le ofrecía algo que no podía hacer.
 *
 * **Esto NO autoriza nada.** Quien autoriza es el backend, que resuelve el rol
 * contra la base en cada pedido; acá solo se deja de ofrecer lo que va a ser
 * rechazado. Es cosmética honesta, no un control de acceso, y borrar esta
 * función no abriría ningún agujero — solo volvería a mentirle al usuario.
 */
export function puedeOperar(usuario: UsuarioActual): boolean {
  return OPERAN.includes(usuario.rol)
}

const OPERAN: Rol[] = ['ADMIN', 'STAFF']

/** Devuelve el menú de esta persona, ya sin los grupos que le quedan vacíos. */
export function menuPara(usuario: UsuarioActual): GrupoMenu[] {
  return MENU.map((grupo) => ({
    ...grupo,
    items: grupo.items.filter((item) => item.visible?.(usuario) ?? true),
  })).filter((grupo) => grupo.items.length > 0)
}
