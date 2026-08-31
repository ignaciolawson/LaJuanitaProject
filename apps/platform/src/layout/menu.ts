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
 *    Mis cursos y Mis materiales exigen `esAlumno`; Mi agenda, Mis alumnos y
 *    Subir material, `esProfesor`.
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
      { etiqueta: 'Mis reservas', ruta: '/mis-reservas', disponible: true },
      { etiqueta: 'Reservar cabina', ruta: '/reservar', disponible: true },
      { etiqueta: 'Mis pedidos', ruta: '/mis-solicitudes', disponible: true },
      // Se llamaba "Mix & Mastering" y pasa a "Mis trabajos" al construirse el
      // módulo, por dos razones: el resto del portal dice "Mis…" —reservas,
      // pedidos, pagos, cursos, materiales— y administración tiene su propia
      // sección con el nombre del servicio. Dos entradas con la misma etiqueta en
      // grupos distintos se leen como la misma pantalla. El título adentro sigue
      // diciendo Mix & Mastering, que es como el cliente conoce el servicio.
      { etiqueta: 'Mis trabajos', ruta: '/mix-mastering', disponible: true },
      { etiqueta: 'Mis pagos', ruta: '/mis-pagos', disponible: true },
      { etiqueta: 'Notificaciones', ruta: '/notificaciones', disponible: true },
      { etiqueta: 'Mi perfil', ruta: '/mi-perfil', disponible: true },
    ],
  },
  {
    titulo: 'Mi formación',
    items: [
      // Regla 2: dependen de la relación, no del rol.
      { etiqueta: 'Mis cursos', ruta: '/mis-cursos', visible: (u) => u.esAlumno, disponible: true },
      { etiqueta: 'Mis materiales', ruta: '/mis-materiales', visible: (u) => u.esAlumno, disponible: true },
      { etiqueta: 'Mi agenda', ruta: '/mi-agenda', visible: (u) => u.esProfesor, disponible: true },
      { etiqueta: 'Mis alumnos', ruta: '/mis-alumnos', visible: (u) => u.esProfesor, disponible: true },
      { etiqueta: 'Subir material', ruta: '/material', visible: (u) => u.esProfesor, disponible: true },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // Administración: CINCO grupos por dominio, no uno solo con 18 ítems.
  //
  // Eran 18 corridos bajo un título, y estaban en **orden de construcción de los
  // módulos**, que es el orden en que se fueron agregando y no el orden en que
  // alguien los usa. Nadie navega "el módulo 6": navega "necesito cobrar".
  //
  // Los grupos siguen las líneas del negocio y no la numeración de los módulos.
  // Por eso Venta de equipos cae en Dinero —es del Módulo 3, y lo que registra es
  // una operación con su cobro, no un inventario— y por eso Mix & Mastering y el
  // Sello quedan juntos: son las dos patas de disco, contra la pata de academia.
  //
  // Regla 3 en todos: dependen del rol. DIRECTIVO ve estas pantallas y no escribe
  // nada; eso lo impone el backend, no el menú. Ocultárselas acá sería mentir
  // sobre lo que puede.
  // ─────────────────────────────────────────────────────────────────────
  {
    titulo: 'Personas',
    items: [
      {
        // El buzón de la web (hallazgo #7) abre el grupo, y no está puesto al
        // azar: **es lo primero que hay que mirar a la mañana** —del otro lado
        // hay alguien esperando que lo llamen— y es la única pantalla del sistema
        // cuyo contenido lo escribe gente de afuera. Además es de dónde salen las
        // personas nuevas, así que el dominio es este y no "servicios".
        etiqueta: 'Buzón de la web',
        ruta: '/admin/buzon',
        visible: puedeAdministrar,
        disponible: true,
      },
      { etiqueta: 'Alumnos', ruta: '/admin/alumnos', visible: puedeAdministrar, disponible: true },
      {
        etiqueta: 'Inscripciones',
        ruta: '/admin/inscripciones',
        visible: puedeAdministrar,
        disponible: true,
      },
      { etiqueta: 'Personas', ruta: '/admin/usuarios', visible: puedeAdministrar, disponible: true },
    ],
  },
  {
    titulo: 'Salas y agenda',
    items: [
      { etiqueta: 'Calendario', ruta: '/admin/reservas', visible: puedeAdministrar, disponible: true },
      {
        // La otra mitad del portal: sin esta pantalla, lo que el alumno pide no
        // lo lee nadie.
        etiqueta: 'Pedidos de sala',
        ruta: '/admin/solicitudes',
        visible: puedeAdministrar,
        disponible: true,
      },
      {
        // La otra bandeja, y es otra cosa que "Pedidos de sala": ahí se pide
        // crear algo que no existe y aprobar es cobrar la seña; acá se pide mover
        // algo que existe y aprobar es elegir el horario nuevo. Juntarlas
        // obligaría a que una sola pantalla tenga dos formas de decir que sí.
        etiqueta: 'Pedidos de cambio',
        ruta: '/admin/reprogramaciones',
        visible: puedeAdministrar,
        disponible: true,
      },
      {
        etiqueta: 'Salas bloqueadas',
        ruta: '/admin/bloqueos',
        visible: puedeAdministrar,
        disponible: true,
      },
      {
        etiqueta: 'Uso de salas',
        ruta: '/admin/uso-salas',
        visible: puedeAdministrar,
        disponible: true,
      },
    ],
  },
  {
    titulo: 'Dinero',
    items: [
      { etiqueta: 'Pagos', ruta: '/admin/pagos', visible: puedeAdministrar, disponible: true },
      { etiqueta: 'Caja', ruta: '/admin/caja', visible: puedeAdministrar, disponible: true },
      { etiqueta: 'Deudores', ruta: '/admin/deudores', visible: puedeAdministrar, disponible: true },
      { etiqueta: 'Egresos', ruta: '/admin/egresos', visible: puedeAdministrar, disponible: true },
      {
        // Cae en Dinero y no en un grupo de "servicios" porque es del Módulo 3 y
        // porque **no es un inventario**: no hay stock propio, la venta va contra
        // el de Pioneer, así que la fila registra una operación y su cobro.
        etiqueta: 'Venta de equipos',
        ruta: '/admin/ventas',
        visible: puedeAdministrar,
        disponible: true,
      },
    ],
  },
  {
    titulo: 'Sello y mastering',
    items: [
      {
        etiqueta: 'Mix & Mastering',
        ruta: '/admin/mix-mastering',
        visible: puedeAdministrar,
        disponible: true,
      },
      {
        etiqueta: 'Sello',
        ruta: '/admin/sello',
        visible: puedeAdministrar,
        disponible: true,
      },
      {
        // Va separada del catálogo y no adentro: un artista se carga una vez y
        // después se lo elige veinte veces desde el alta de un release. Meter su
        // ABM dentro de la pantalla de releases obligaría a abrir un release para
        // llegar a algo que no es de ningún release.
        etiqueta: 'Artistas',
        ruta: '/admin/artistas',
        visible: puedeAdministrar,
        disponible: true,
      },
    ],
  },
  {
    titulo: 'Dirección',
    items: [
      {
        // Era el placeholder apagado del Módulo 8 y quedó construido el
        // 2026-08-20. La ruta pasó de `/admin/dashboard` a `/admin/tablero`
        // porque todas las rutas de este sistema están en castellano y nadie
        // había podido navegar a la vieja: el ítem estaba apagado.
        etiqueta: 'Tablero',
        ruta: '/admin/tablero',
        // **La ve todo el que administra, y muestra cosas distintas.** §11:
        // acceso completo ADMIN·DIRECTIVO, y STAFF ve el resumen financiero
        // básico. La nota vieja de acá decía que STAFF no entraba a esta
        // pantalla; el alcance dice lo contrario y gana el alcance.
        //
        // Lo que decide qué se muestra NO es este predicado sino el backend,
        // que tiene dos endpoints distintos. Acá solo se elige cuál pedir.
        visible: puedeAdministrar,
        disponible: true,
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
 * El tercer eje, y el único que separa a DOS CLASES DE ADMINISTRADOR.
 *
 * `puedeAdministrar` dice quién ve las pantallas de administración y
 * `puedeOperar` quién escribe. Este dice quién ve **el tablero entero**: §11
 * da acceso completo a ADMIN y DIRECTIVO, y a STAFF el resumen financiero
 * básico. Espeja `@PuedeVerElTableroCompleto` del backend.
 *
 * **Es la razón concreta por la que este proyecto tiene cuatro roles y no
 * tres**, y hasta hoy vivía escrita como un `u.rol === 'ADMIN' || ...` suelto
 * adentro del ítem apagado del menú. Tipada como `Rol[]`, un rol nuevo queda
 * afuera hasta que alguien lo decida.
 *
 * **Esto no autoriza nada**, igual que los otros dos: el backend resuelve el rol
 * contra la base en cada pedido y tiene dos endpoints separados. Acá solo se
 * elige cuál pedir, para no mandar uno que va a volver 403.
 */
export function puedeVerElTableroCompleto(usuario: UsuarioActual): boolean {
  return VEN_EL_TABLERO.includes(usuario.rol)
}

const VEN_EL_TABLERO: Rol[] = ['ADMIN', 'DIRECTIVO']

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
