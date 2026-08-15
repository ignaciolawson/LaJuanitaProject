import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, pedir, registrarManejadorDeSesionVencida } from './cliente'
import { guardarCredencial } from '../auth/credencial'

/**
 * El único punto por donde el front habla con el backend, y sobre todo **cómo
 * interpreta los errores**.
 *
 * El backend contesta ProblemDetail (RFC 7807) y el mensaje para mostrar está
 * en `detail`. Pero no todas las respuestas de error tienen esa forma —Spring
 * rechaza algunas antes de llegar al advice—, y de ahí sale lo que la persona
 * termina leyendo en pantalla. Ninguno de estos tests necesita backend: se
 * mockea `fetch`.
 */

function responder(status: number, cuerpo?: unknown, textoCrudo?: string): Response {
  // 204 y 304 no admiten cuerpo: el constructor de `Response` tira
  // "Invalid response status code" si se le pasa uno, aunque sea la cadena
  // vacía.
  const sinCuerpo = status === 204 || status === 304
  const contenido = sinCuerpo
    ? null
    : (textoCrudo ?? (cuerpo === undefined ? '' : JSON.stringify(cuerpo)))

  return new Response(contenido, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  })
}

function mockearFetch(respuesta: Response) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta)
}

afterEach(() => {
  vi.restoreAllMocks()
  registrarManejadorDeSesionVencida(() => {})
})

describe('respuestas exitosas', () => {
  it('devuelve el JSON ya parseado', async () => {
    mockearFetch(responder(200, { contenido: [{ idAlumno: 1 }], totalElementos: 1 }))

    const resultado = await pedir<{ totalElementos: number }>('/api/alumnos')

    expect(resultado.totalElementos).toBe(1)
  })

  it('un 204 no intenta parsear un cuerpo que no existe', async () => {
    mockearFetch(responder(204))

    await expect(pedir('/api/algo', { metodo: 'DELETE' })).resolves.toBeUndefined()
  })

  it('manda la credencial guardada en el header', async () => {
    guardarCredencial({
      token: 'token.de.prueba',
      expiraEn: new Date(Date.now() + 3600_000).toISOString(),
    })
    const fetchMock = mockearFetch(responder(200, {}))

    await pedir('/api/me')

    const opciones = fetchMock.mock.calls[0][1] as RequestInit
    expect((opciones.headers as Record<string, string>)['Authorization'])
      .toBe('Bearer token.de.prueba')
  })

  /** El login es el único pedido que no lleva credencial: todavía no hay. */
  it('con `sinCredencial` no manda Authorization aunque haya token guardado', async () => {
    guardarCredencial({
      token: 'token.de.prueba',
      expiraEn: new Date(Date.now() + 3600_000).toISOString(),
    })
    const fetchMock = mockearFetch(responder(200, {}))

    await pedir('/api/auth/login', { metodo: 'POST', cuerpo: {}, sinCredencial: true })

    const opciones = fetchMock.mock.calls[0][1] as RequestInit
    expect((opciones.headers as Record<string, string>)['Authorization']).toBeUndefined()
  })
})

describe('interpretación de errores', () => {
  it('un ProblemDetail completo llega con su mensaje y sus errores por campo', async () => {
    mockearFetch(responder(409, {
      detail: 'Ya existe una cuenta con ese email.',
      errores: { email: 'Ya existe una cuenta con ese email.' },
    }))

    const error = await pedir('/api/usuarios', { metodo: 'POST', cuerpo: {} })
      .catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(409)
    expect((error as ApiError).message).toBe('Ya existe una cuenta con ese email.')
    expect((error as ApiError).errores?.email).toBeTruthy()
  })

  /**
   * El formato crudo de Spring (`timestamp`/`error`, sin `detail`).
   *
   * **Este era el agujero de ARQ-04**, y era el peor de los dos posibles: ese
   * cuerpo es JSON válido, así que parseaba bien, no encontraba `detail`, y por
   * eso **no entraba al `catch`** que existe justamente para poner un mensaje
   * razonable cuando el cuerpo no sirve. Quedaba el texto genérico aunque el
   * status dijera algo mucho más útil. Ahora un cuerpo sin `detail` se trata
   * como cuerpo inservible, igual que uno que no parsea.
   */
  it('un cuerpo sin `detail` cae en el mensaje por status, no en el genérico', async () => {
    mockearFetch(responder(500, { timestamp: '2026-08-14T00:00:00Z', error: 'Internal Server Error' }))

    const error = (await pedir('/api/alumnos').catch((e: unknown) => e)) as ApiError

    expect(error.message).toBe('El servidor tuvo un problema. Probá de nuevo en un momento.')
    expect(error.errores).toBeUndefined()
  })

  /** Un `detail` vacío es lo mismo que no tenerlo: no hay nada que mostrar. */
  it('un `detail` en blanco tampoco se muestra', async () => {
    mockearFetch(responder(404, { detail: '   ' }))

    const error = (await pedir('/api/alumnos/1').catch((e: unknown) => e)) as ApiError

    expect(error.message).toBe('No encontramos lo que estabas buscando.')
  })

  it('un cuerpo que no es JSON tampoco rompe', async () => {
    mockearFetch(responder(502, undefined, '<html>Bad Gateway</html>'))

    const error = (await pedir('/api/alumnos').catch((e: unknown) => e)) as ApiError

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(502)
    expect(error.message).toBe('El servidor tuvo un problema. Probá de nuevo en un momento.')
  })

  /**
   * El 401 del filtro de seguridad viene **sin cuerpo**: Spring rechaza el
   * pedido antes de llegar al advice. El mensaje tiene que decir algo útil.
   */
  it('un 401 sin cuerpo dice que la sesión venció', async () => {
    mockearFetch(responder(401, undefined, ''))

    const error = (await pedir('/api/me').catch((e: unknown) => e)) as ApiError

    expect(error.message).toBe('Tu sesión venció. Volvé a entrar.')
  })
})

describe('sesión vencida', () => {
  /**
   * Sin esto, cuando el token vence con la app abierta el front sigue
   * mostrando el menú y los datos de alguien que ya no está autenticado, y
   * todo falla de a un pedido por vez sin que nadie entienda por qué.
   */
  it('un 401 en un pedido con credencial cierra la sesión', async () => {
    const cerrar = vi.fn()
    registrarManejadorDeSesionVencida(cerrar)
    mockearFetch(responder(401, { detail: 'No autenticado' }))

    await pedir('/api/me').catch(() => {})

    expect(cerrar).toHaveBeenCalledOnce()
  })

  /**
   * El 401 del login significa "esa contraseña está mal" y no debe cerrar
   * nada: no había sesión que cerrar, y hacerlo borraría la de otra pestaña.
   */
  it('un 401 del login NO cierra la sesión', async () => {
    const cerrar = vi.fn()
    registrarManejadorDeSesionVencida(cerrar)
    mockearFetch(responder(401, { detail: 'Email o contraseña incorrectos.' }))

    await pedir('/api/auth/login', { metodo: 'POST', cuerpo: {}, sinCredencial: true })
      .catch(() => {})

    expect(cerrar).not.toHaveBeenCalled()
  })

  it('un 403 no cierra la sesión: sé quién sos y no podés', async () => {
    const cerrar = vi.fn()
    registrarManejadorDeSesionVencida(cerrar)
    mockearFetch(responder(403, { detail: 'No tenés permiso para hacer esto.' }))

    await pedir('/api/alumnos').catch(() => {})

    expect(cerrar).not.toHaveBeenCalled()
  })
})
