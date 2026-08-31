import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { UsuarioActual as Actual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { InicioPagina } from './InicioPagina'

/**
 * El Inicio (`mejoras.md` §11).
 *
 * Lo que estos casos cuidan no es el dibujo, son las tres decisiones de §11 —las
 * mismas tres que un rediseño posterior puede deshacer sin darse cuenta:
 *
 * - **Cada perfil ve lo suyo, y se compone con los predicados que ya existen.**
 *   Un ADMIN ve tareas Y números; un DIRECTIVO sólo números; un STAFF sólo
 *   tareas. El caso testigo de siempre —Ghezz, STAFF *y* profesor— ve los dos
 *   bloques a la vez.
 * - **Las tarjetas vacías se muestran.** "Estás al día" es información, y un
 *   hueco se leería como que el sistema perdió el dato.
 * - **Un bloque que falla no vacía la pantalla.** Es el caso que más importa:
 *   sin él, un endpoint caído deja la primera pantalla del sistema en blanco
 *   para todo el mundo.
 *
 * Y uno que no es de diseño sino de permisos: **no se pide lo que va a volver
 * 403.** Que un USUARIO no llame a `/api/pagos/deudores` no lo autoriza a nada
 * —el backend resuelve el rol contra la base en cada pedido—, pero evita el
 * cartel de error donde debería haber una pantalla útil.
 */

vi.mock('../api/portal', () => ({
  misReservas: vi.fn(),
  miEstadoDeCuenta: vi.fn(),
  misSolicitudes: vi.fn(),
  misCursos: vi.fn(),
  misMateriales: vi.fn(),
  listarSolicitudes: vi.fn(),
}))
vi.mock('../api/administracion', () => ({
  agenda: vi.fn(),
  listarDeudores: vi.fn(),
  listarSolicitantes: vi.fn(),
}))
vi.mock('../api/docencia', () => ({ miAgenda: vi.fn(), misAlumnos: vi.fn() }))
vi.mock('../api/tablero', () => ({ resumenFinanciero: vi.fn() }))

const portal = await import('../api/portal')
const admin = await import('../api/administracion')
const docencia = await import('../api/docencia')
const tablero = await import('../api/tablero')

const PAGINA_VACIA = { contenido: [], pagina: 0, tamanio: 20, totalElementos: 0, totalPaginas: 0 }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(portal.misReservas).mockResolvedValue([])
  vi.mocked(portal.misSolicitudes).mockResolvedValue([])
  vi.mocked(portal.misCursos).mockResolvedValue([])
  vi.mocked(portal.misMateriales).mockResolvedValue([])
  vi.mocked(portal.listarSolicitudes).mockResolvedValue(PAGINA_VACIA)
  vi.mocked(portal.miEstadoDeCuenta).mockResolvedValue({
    idUsuario: 1,
    nombre: 'Prueba',
    apellido: 'Prueba',
    email: 'prueba@lajuanita.local',
    saldos: [],
    contratos: [],
    pagos: [],
  })
  vi.mocked(admin.agenda).mockResolvedValue([])
  vi.mocked(admin.listarDeudores).mockResolvedValue([])
  vi.mocked(admin.listarSolicitantes).mockResolvedValue(PAGINA_VACIA)
  vi.mocked(docencia.miAgenda).mockResolvedValue([])
  vi.mocked(docencia.misAlumnos).mockResolvedValue([])
  vi.mocked(tablero.resumenFinanciero).mockResolvedValue({
    periodo: { desde: '2026-08-01', hasta: '2026-08-31', idSala: null },
    caja: [],
    pendientes: [],
  })
})

function montar(
  rol: Actual['rol'] = 'USUARIO',
  relaciones: { esAlumno?: boolean; esProfesor?: boolean } = {},
) {
  const contexto: ContextoAuth = {
    sesion: {
      estado: 'autenticado',
      usuario: {
        id: 1,
        nombre: 'Micaela',
        apellido: 'Prueba',
        email: 'prueba@lajuanita.local',
        telefono: null,
        rol,
        fotoPerfil: null,
        esAlumno: relaciones.esAlumno ?? false,
        esProfesor: relaciones.esProfesor ?? false,
        debeCambiarPassword: false,
      },
    },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }

  return render(
    <MemoryRouter>
      <AuthContext value={contexto}>
        <InicioPagina />
      </AuthContext>
    </MemoryRouter>,
  )
}

describe('el saludo', () => {
  it('dice quién sos y qué sos', async () => {
    montar('ADMIN')

    expect(await screen.findByRole('heading', { name: 'Hola, Micaela' })).toBeDefined()
    expect(screen.getByText(/Administración/)).toBeDefined()
  })

  it('el título de la pantalla es el h1, no un h2', async () => {
    // Desde que salió la barra superior de la aplicación, el h1 del documento es
    // el nombre de la pantalla. Antes lo gastaba un "Hola, X" fijo en las 36.
    montar('ADMIN')

    const encabezado = await screen.findByRole('heading', { name: 'Hola, Micaela' })
    expect(encabezado.tagName).toBe('H1')
  })
})

describe('qué ve cada perfil', () => {
  it('un USUARIO puro ve lo suyo y nada de administración', async () => {
    montar('USUARIO')

    expect(await screen.findByText('Lo mío')).toBeDefined()
    expect(screen.queryByText('Operación')).toBeNull()
    expect(screen.queryByText('Los números del mes')).toBeNull()
    expect(screen.queryByText('Mi formación')).toBeNull()
  })

  it('un USUARIO no pide lo que le va a volver 403', async () => {
    montar('USUARIO')

    await screen.findByText('Lo mío')
    expect(admin.listarDeudores).not.toHaveBeenCalled()
    expect(admin.agenda).not.toHaveBeenCalled()
    expect(tablero.resumenFinanciero).not.toHaveBeenCalled()
  })

  it('un DIRECTIVO ve los números y NO la lista de tareas', async () => {
    // Lee todo y no escribe nada: una lista de "andá a cobrarle a este" sería
    // trabajo para alguien que no puede hacerlo.
    montar('DIRECTIVO')

    expect(await screen.findByText('Los números del mes')).toBeDefined()
    expect(screen.queryByText('Operación')).toBeNull()
  })

  it('un STAFF ve la operación y NO los números', async () => {
    montar('STAFF')

    expect(await screen.findByText('Operación')).toBeDefined()
    expect(screen.queryByText('Los números del mes')).toBeNull()
  })

  it('un ADMIN ve las dos cosas', async () => {
    montar('ADMIN')

    expect(await screen.findByText('Operación')).toBeDefined()
    expect(screen.getByText('Los números del mes')).toBeDefined()
  })

  it('el STAFF que además es profesor ve los dos bloques', async () => {
    // Ghezz: STAFF *y* profesor *y* puede alquilarse una cabina. El caso testigo
    // de que el menú —y esta pantalla— se arman por tres reglas y no por rol.
    montar('STAFF', { esProfesor: true })

    expect(await screen.findByText('Operación')).toBeDefined()
    expect(screen.getByText('Mis clases')).toBeDefined()
  })
})

describe('las tarjetas vacías', () => {
  it('se muestran en vez de desaparecer', async () => {
    montar('STAFF')

    // Sin deuda, sin pedidos y sin nada reservado: las tres tarjetas siguen ahí
    // y lo dicen. "Todo al día" es la información que se viene a buscar.
    expect(await screen.findByText('Estás al día.')).toBeDefined()
    expect(screen.getByText('Ningún pedido esperando respuesta.')).toBeDefined()
    expect(screen.getByText('No hay deudas anotadas. Todo al día.')).toBeDefined()
  })
})

describe('las clases que le quedan al alumno', () => {
  it('es la cifra que el sistema existe para llevar, y está', async () => {
    vi.mocked(portal.misCursos).mockResolvedValue([
      {
        idInscripcion: 5,
        disciplina: 'DJ',
        nivel: 'INICIAL',
        profesor: 'Ghezz',
        clasesContratadas: 8,
        clasesConsumidas: 3,
        clasesRestantes: 5,
        fechaInicio: '2026-08-01',
        estado: 'ACTIVA',
      },
    ])

    montar('USUARIO', { esAlumno: true })

    expect(await screen.findByText('5')).toBeDefined()
    expect(screen.getByText(/de DJ/)).toBeDefined()
  })

  it('un curso completado no cuenta como clases que quedan', async () => {
    vi.mocked(portal.misCursos).mockResolvedValue([
      {
        idInscripcion: 5,
        disciplina: 'DJ',
        nivel: null,
        profesor: null,
        clasesContratadas: 8,
        clasesConsumidas: 8,
        clasesRestantes: 0,
        fechaInicio: '2026-01-01',
        estado: 'COMPLETADA',
      },
    ])

    montar('USUARIO', { esAlumno: true })

    expect(await screen.findByText('No tenés ningún curso vigente.')).toBeDefined()
  })
})

describe('un bloque que falla', () => {
  it('muestra su error y no vacía el resto de la pantalla', async () => {
    const { ApiError } = await import('../api/cliente')
    vi.mocked(admin.listarDeudores).mockRejectedValue(
      new ApiError(500, 'No se pudo consultar la deuda.'),
    )

    montar('STAFF')

    // La tarjeta rota dice qué pasó...
    expect(await screen.findByText('No se pudo consultar la deuda.')).toBeDefined()
    // ...y las demás siguen contestando.
    expect(screen.getByText('Estás al día.')).toBeDefined()
    expect(screen.getByText('Hoy no hay nada reservado.')).toBeDefined()
  })

  it('nunca muestra un vacío donde en realidad hubo un error', async () => {
    // La peor mentira que puede decir esta pantalla: "no hay deudores" cuando el
    // pedido falló. Por eso los tres estados los maneja la tarjeta y no cada uno.
    const { ApiError } = await import('../api/cliente')
    vi.mocked(admin.listarDeudores).mockRejectedValue(new ApiError(500, 'Se cayó.'))

    montar('STAFF')

    await screen.findByText('Se cayó.')
    expect(screen.queryByText('No hay deudas anotadas. Todo al día.')).toBeNull()
  })
})
