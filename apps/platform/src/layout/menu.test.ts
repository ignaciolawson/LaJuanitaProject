import { describe, expect, it } from 'vitest'

import type { Rol, UsuarioActual } from '../api/tipos'
import { menuPara, puedeAdministrar, puedeOperar } from './menu'

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
  it.each(ROLES)('un %s ve reservar, mix & mastering y sus pagos', (rol) => {
    const visibles = etiquetas(usuario({ rol }))

    expect(visibles).toContain('Reservar cabina')
    expect(visibles).toContain('Mix & Mastering')
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
    expect(visibles).not.toContain('Dashboard')
  })

  /**
   * El dashboard ejecutivo es de dirección. Micaela es STAFF y ve el resumen
   * financiero básico dentro de Pagos, no esta pantalla: es una de las dos
   * líneas que hacen que los roles sean cuatro y no tres.
   */
  it('el dashboard es solo de ADMIN y DIRECTIVO', () => {
    expect(etiquetas(usuario({ rol: 'ADMIN' }))).toContain('Dashboard')
    expect(etiquetas(usuario({ rol: 'DIRECTIVO' }))).toContain('Dashboard')
    expect(etiquetas(usuario({ rol: 'STAFF' }))).not.toContain('Dashboard')
    expect(etiquetas(usuario({ rol: 'USUARIO' }))).not.toContain('Dashboard')
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
