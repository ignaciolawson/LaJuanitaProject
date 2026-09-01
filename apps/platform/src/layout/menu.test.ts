import { describe, expect, it } from 'vitest'

import type { Rol, UsuarioActual } from '../api/tipos'
import { menuPara, puedeAdministrar, puedeOperar, puedeVerElTableroCompleto } from './menu'

/**
 * Las tres reglas del menú, que son fáciles de confundir en una sola.
 *
 * Es la función de la que este proyecto está más orgulloso y la que nadie
 * verificaba. Todo lo de acá son funciones puras: ni backend, ni DOM.
 */

const ROLES: Rol[] = ['ADMIN', 'DIRECTIVO', 'STAFF', 'USUARIO']

function usuario(parcial: Partial<UsuarioActual> = {}): UsuarioActual {
  return {
    id: 1,
    nombre: 'Prueba',
    apellido: 'Prueba',
    email: 'prueba@lajuanita.local',
    telefono: null,
    rol: 'USUARIO',
    fotoPerfil: null,
    esAlumno: false,
    esProfesor: false,
    debeCambiarPassword: false,
    ...parcial,
  }
}

function etiquetas(u: UsuarioActual): string[] {
  return menuPara(u).flatMap((grupo) => grupo.items.map((item) => item.etiqueta))
}

describe('regla 1 — los servicios que cualquiera contrata van siempre', () => {
  /**
   * La regla que más duele olvidar: si "Reservar cabina" se mostrara solo a
   * quien ya reservó, quien nunca reservó no vería nunca el botón y no podría
   * hacer su primera reserva jamás.
   */
  it.each(ROLES)('un %s ve reservar, sus trabajos de M&M y sus pagos', (rol) => {
    const visibles = etiquetas(usuario({ rol }))

    expect(visibles).toContain('Reservar cabina')
    // Se llamaba "Mix & Mastering" hasta que el Módulo 6 le dio a administración
    // una sección con ese nombre. La entrada del portal pasó a "Mis trabajos"
    // para no tener la misma etiqueta en dos grupos; la regla que este caso
    // protege —va siempre, sin importar el rol ni si ya contrató algo— no cambió.
    expect(visibles).toContain('Mis trabajos')
    expect(visibles).toContain('Mis pagos')
  })

  it('las ve también quien no es alumno ni profesor ni administra nada', () => {
    const visibles = etiquetas(usuario({ rol: 'USUARIO', esAlumno: false, esProfesor: false }))

    expect(visibles).toContain('Reservar cabina')
  })
})

describe('regla 2 — las relaciones de negocio', () => {
  it('sin relación no se ven ni Mis cursos ni Mis alumnos', () => {
    const visibles = etiquetas(usuario({ esAlumno: false, esProfesor: false }))

    expect(visibles).not.toContain('Mis cursos')
    expect(visibles).not.toContain('Mis alumnos')
    expect(visibles).not.toContain('Subir material')
  })

  it('un alumno ve Mis cursos y no Mis alumnos', () => {
    const visibles = etiquetas(usuario({ esAlumno: true }))

    expect(visibles).toContain('Mis cursos')
    expect(visibles).not.toContain('Mis alumnos')
  })

  it('un profesor ve Mis alumnos y Subir material', () => {
    const visibles = etiquetas(usuario({ esProfesor: true }))

    expect(visibles).toContain('Mis alumnos')
    expect(visibles).toContain('Subir material')
    expect(visibles).not.toContain('Mis cursos')
  })

  /**
   * El caso Ghezz, que es la razón por la que los dos ejes están separados:
   * STAFF **y** profesor **y** puede alquilarse una cabina, las tres sin
   * contradicción.
   */
  it('los dos ejes son independientes: STAFF que además es profesor ve las dos cosas', () => {
    const visibles = etiquetas(usuario({ rol: 'STAFF', esProfesor: true }))

    expect(visibles).toContain('Mis alumnos') // por la relación
    expect(visibles).toContain('Alumnos') // por el rol
    expect(visibles).toContain('Reservar cabina') // por ser persona
  })

  it('las cuatro combinaciones de relación se comportan como corresponde', () => {
    const combinaciones: Array<[boolean, boolean, string[], string[]]> = [
      [false, false, [], ['Mis cursos', 'Mis alumnos']],
      [true, false, ['Mis cursos'], ['Mis alumnos']],
      [false, true, ['Mis alumnos', 'Subir material'], ['Mis cursos']],
      [true, true, ['Mis cursos', 'Mis alumnos', 'Subir material'], []],
    ]

    for (const [esAlumno, esProfesor, esperados, ausentes] of combinaciones) {
      const visibles = etiquetas(usuario({ esAlumno, esProfesor }))
      for (const e of esperados) expect(visibles).toContain(e)
      for (const a of ausentes) expect(visibles).not.toContain(a)
    }
  })
})

describe('regla 3 — el rol', () => {
  it.each(['ADMIN', 'DIRECTIVO', 'STAFF'] as Rol[])('un %s ve administración', (rol) => {
    expect(etiquetas(usuario({ rol }))).toContain('Alumnos')
  })

  it('un USUARIO no ve nada de administración', () => {
    const visibles = etiquetas(usuario({ rol: 'USUARIO' }))

    expect(visibles).not.toContain('Alumnos')
    expect(visibles).not.toContain('Personas')
    expect(visibles).not.toContain('Tablero')
  })

  /**
   * **Esto revierte lo que este mismo archivo afirmaba hasta el 2026-08-20**, y
   * conviene dejar escrito por qué, porque el test viejo no estaba mal escrito:
   * estaba escrito sobre otra lectura del alcance.
   *
   * Decía que STAFF no veía esta pantalla y que su resumen financiero vivía
   * dentro de Pagos. Pero §11 lista *"STAFF ve el resumen financiero básico"*
   * entre las **reglas duras del Módulo 8**: si ese resumen viviera en Pagos,
   * sería una regla del Módulo 3 y no de este. La lectura correcta es que el
   * tablero sirve a los dos y muestra menos.
   *
   * Lo que NO cambia es la línea que hace que los roles sean cuatro y no tres:
   * ADMIN y DIRECTIVO ven el tablero entero y STAFF no. Lo que cambió es que
   * "no verlo entero" dejó de significar "no entrar".
   */
  it('el tablero lo ve todo el que administra', () => {
    expect(etiquetas(usuario({ rol: 'ADMIN' }))).toContain('Tablero')
    expect(etiquetas(usuario({ rol: 'DIRECTIVO' }))).toContain('Tablero')
    expect(etiquetas(usuario({ rol: 'STAFF' }))).toContain('Tablero')
    expect(etiquetas(usuario({ rol: 'USUARIO' }))).not.toContain('Tablero')
  })

  /**
   * Y el predicado que decide **qué** ve cada uno, que es el tercer eje de rol
   * del sistema: `puedeAdministrar` dice quién ve las pantallas de
   * administración, `puedeOperar` quién escribe, y este quién ve el tablero
   * entero. Espeja `@PuedeVerElTableroCompleto` del backend.
   *
   * Antes vivía como un `u.rol === 'ADMIN' || ...` suelto adentro del ítem
   * apagado del menú, que es exactamente lo que este archivo se prohíbe.
   */
  it('solo ADMIN y DIRECTIVO ven el tablero completo', () => {
    expect(puedeVerElTableroCompleto(usuario({ rol: 'ADMIN' }))).toBe(true)
    expect(puedeVerElTableroCompleto(usuario({ rol: 'DIRECTIVO' }))).toBe(true)
    expect(puedeVerElTableroCompleto(usuario({ rol: 'STAFF' }))).toBe(false)
    expect(puedeVerElTableroCompleto(usuario({ rol: 'USUARIO' }))).toBe(false)
  })

  it('un grupo que queda sin items no se dibuja', () => {
    const grupos = menuPara(usuario({ rol: 'USUARIO' })).map((g) => g.titulo)

    expect(grupos).toContain('Mi cuenta')
    expect(grupos).not.toContain('Administración')
    expect(grupos).not.toContain('Mi formación')
  })
})

describe('los dos predicados que comparte toda la SPA', () => {
  /**
   * La otra mitad del rol DIRECTIVO, y la razón de ser de los dos predicados:
   * ve todas las pantallas y no puede tocar nada adentro. Antes de esto un
   * socio completaba "Nuevo alumno" y recibía "No tenés permiso para hacer
   * esto".
   */
  it('DIRECTIVO administra pero no opera', () => {
    const socio = usuario({ rol: 'DIRECTIVO' })

    expect(puedeAdministrar(socio)).toBe(true)
    expect(puedeOperar(socio)).toBe(false)
  })

  it('ADMIN y STAFF hacen las dos cosas', () => {
    for (const rol of ['ADMIN', 'STAFF'] as Rol[]) {
      expect(puedeAdministrar(usuario({ rol }))).toBe(true)
      expect(puedeOperar(usuario({ rol }))).toBe(true)
    }
  })

  it('USUARIO no hace ninguna', () => {
    const comun = usuario({ rol: 'USUARIO' })

    expect(puedeAdministrar(comun)).toBe(false)
    expect(puedeOperar(comun)).toBe(false)
  })

  /**
   * Los predicados están escritos por enumeración y no por negación
   * (`rol !== 'USUARIO'`). Por negación funcionaban **por coincidencia**: un
   * quinto rol entraba solo al menú y después comía un 403 del backend. Este
   * test fija el default correcto — un rol desconocido queda afuera hasta que
   * alguien decida lo contrario.
   */
  it('un rol que todavía no existe queda afuera de los dos', () => {
    const futuro = usuario({ rol: 'COORDINADOR' as Rol })

    expect(puedeAdministrar(futuro)).toBe(false)
    expect(puedeOperar(futuro)).toBe(false)
    expect(etiquetas(futuro)).not.toContain('Alumnos')
  })
})

/**
 * La recorrida por rol (Fase 3.3), como caso y no como una mirada.
 *
 * **Se recorrió a mano contra el sistema andando el 2026-09-01** —los seis
 * perfiles, con los usuarios de demostración de `sistema-gestion-plan.md` §6d— y
 * el backend contestó exactamente lo que tenía que contestar. Esto es la mitad
 * que queda escrita: una recorrida a mano se hace una vez y se vence sola; lo
 * que sigue valiendo dentro de seis meses es esto.
 *
 * ⚠️ **"El diseño del perfil X" no existe**, y es lo que estos casos muestran:
 * el menú se arma por TRES reglas —sección siempre visible, sección por
 * relación, sección por rol— que se combinan distinto según quién entra. Ghezz
 * es STAFF *y* profesor *y* puede alquilarse una cabina, y las tres cosas valen
 * a la vez.
 */
describe('la recorrida por rol', () => {
  /** Cuántos ítems ve cada perfil, por grupo. */
  function inventario(u: UsuarioActual) {
    const grupos = menuPara(u)
    return {
      total: grupos.reduce((n, g) => n + g.items.length, 0),
      grupos: grupos.map((g) => g.titulo),
    }
  }

  it('un USUARIO puro ve su cuenta y nada más', () => {
    const { total, grupos } = inventario(usuario())

    expect(total).toBe(8)
    expect(grupos).toEqual(['Mi cuenta'])
  })

  it('la relación suma, y suma distinto según cuál sea', () => {
    // El alumno ve dos ítems de formación y el profesor tres: no es "la
    // sección de formación", es cada ítem preguntando por su relación.
    expect(inventario(usuario({ esAlumno: true })).total).toBe(8 + 2)
    expect(inventario(usuario({ esProfesor: true })).total).toBe(8 + 3)
    expect(inventario(usuario({ esAlumno: true, esProfesor: true })).total).toBe(8 + 5)
  })

  it('los tres perfiles que administran ven los mismos cinco dominios', () => {
    // ⚠️ Lo que separa a DIRECTIVO de los otros dos NO es qué pantallas ve
    // —ve todas— sino que no tiene botones de escritura adentro. Si alguna
    // vez alguien "arregla" el menú escondiéndole secciones, este caso cae.
    const dominios = [
      'Mi cuenta',
      'Personas',
      'Salas y agenda',
      'Dinero',
      'Sello y mastering',
      'Dirección',
    ]

    for (const rol of ['ADMIN', 'DIRECTIVO', 'STAFF'] as Rol[]) {
      const { total, grupos } = inventario(usuario({ rol }))
      expect(grupos).toEqual(dominios)
      expect(total).toBe(8 + 18)
    }
  })

  it('los grupos van en orden de negocio y no de construcción de los módulos', () => {
    // Era el defecto que tenía "Administración" con sus 18 ítems corridos:
    // nadie navega "el módulo 6", navega "necesito cobrar".
    const { grupos } = inventario(usuario({ rol: 'ADMIN' }))

    expect(grupos.indexOf('Personas')).toBeLessThan(grupos.indexOf('Dinero'))
    expect(grupos.indexOf('Dinero')).toBeLessThan(grupos.indexOf('Dirección'))
  })

  it('las combinaciones reales son las que hay que mirar, no los roles sueltos', () => {
    // Ghezz: STAFF, profesor, y además se alquila una cabina.
    const ghezz = usuario({ rol: 'STAFF', esProfesor: true })
    const { total, grupos } = inventario(ghezz)

    expect(total).toBe(8 + 3 + 18)
    expect(grupos).toContain('Mi formación')
    expect(grupos).toContain('Dinero')
  })
})

