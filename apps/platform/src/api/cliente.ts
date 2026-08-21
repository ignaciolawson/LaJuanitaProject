import { leerCredencial } from '../auth/credencial'

/**
 * Un error que devolvió el backend, ya interpretado.
 *
 * El backend responde con ProblemDetail (RFC 7807), así que el mensaje para
 * mostrarle a la persona está siempre en `detail` y los errores por campo,
 * cuando los hay, en `errores`.
 */
export class ApiError extends Error {
  // Campos declarados y asignados a mano: el tsconfig tiene
  // `erasableSyntaxOnly`, que prohíbe los parámetros-propiedad del
  // constructor porque no son borrables por un transpilador.
  readonly status: number
  readonly errores: Record<string, string> | undefined

  constructor(status: number, mensaje: string, errores?: Record<string, string>) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.errores = errores
  }
}

type Opciones = {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  cuerpo?: unknown
  /** El login es el único pedido que no lleva credencial (todavía no hay). */
  sinCredencial?: boolean
  /**
   * Un archivo, que viaja como `multipart/form-data` en vez de JSON.
   *
   * Lo estrenó el Módulo 7: el contrato del sello es el primer archivo que entra
   * al sistema. **No se combina con `cuerpo`** — un multipart no lleva además un
   * JSON, y los datos que acompañan al archivo van por query string.
   */
  archivo?: File
}

type ManejadorDeSesionVencida = () => void

let alVencerLaSesion: ManejadorDeSesionVencida | null = null

/**
 * Registra qué hacer cuando el backend rechaza una credencial que creíamos
 * buena. Lo usa `AuthProvider` para cerrar la sesión.
 *
 * Sin esto, cuando el token vence con la app abierta el front se queda
 * mostrando el menú y los datos de alguien que ya no está autenticado: todo
 * falla de a un pedido por vez y nadie entiende por qué. La sesión tiene que
 * terminar cuando termina de verdad.
 */
export function registrarManejadorDeSesionVencida(manejador: ManejadorDeSesionVencida): void {
  alVencerLaSesion = manejador
}

/**
 * Único punto por donde el front habla con el backend.
 *
 * Las rutas son relativas (`/api/...`): en desarrollo las redirige el proxy
 * de Vite y en producción el reverse proxy del servidor. Así el navegador
 * siempre ve un solo origen y no hay CORS en el medio.
 */
export async function pedir<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const { metodo = 'GET', cuerpo, sinCredencial = false, archivo } = opciones

  const cabeceras: Record<string, string> = {}
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  if (!sinCredencial) {
    const credencial = leerCredencial()
    if (credencial) cabeceras['Authorization'] = `Bearer ${credencial.token}`
  }

  // Con un archivo, el `Content-Type` NO se pone a mano: el navegador tiene que
  // escribirlo él para agregarle el `boundary` que separa las partes. Ponerlo
  // acá produce un multipart sin boundary y el backend contesta 400 sin poder
  // explicar qué pasó. Es el error clásico de la primera subida.
  let contenido: BodyInit | undefined
  if (archivo !== undefined) {
    const formulario = new FormData()
    formulario.append('archivo', archivo)
    contenido = formulario
  } else if (cuerpo !== undefined) {
    contenido = JSON.stringify(cuerpo)
  }

  const respuesta = await fetch(ruta, {
    method: metodo,
    headers: cabeceras,
    body: contenido,
  })

  if (!respuesta.ok) {
    const error = await interpretarError(respuesta)

    // Un 401 en un pedido que SÍ llevaba credencial significa que la sesión
    // dejó de valer. Se distingue del 401 del login, que solo quiere decir
    // "esa contraseña está mal" y no debe cerrar nada.
    if (respuesta.status === 401 && !sinCredencial) alVencerLaSesion?.()

    throw error
  }

  // 204 y compañía no traen cuerpo; devolver undefined es correcto para ellas.
  if (respuesta.status === 204) return undefined as T
  return (await respuesta.json()) as T
}

/**
 * Mensaje para cuando el cuerpo del error no sirve — sea porque no vino, porque
 * no es JSON, o porque es un JSON sin `detail`.
 *
 * Los tres son el mismo caso desde acá: no hay nada que mostrarle a la persona.
 * Antes solo el segundo entraba al `catch` (ARQ-04): un cuerpo con `timestamp`
 * y `error` en vez de `detail` parseaba perfecto, no encontraba el campo, y se
 * quedaba con el texto genérico aunque el status dijera algo mucho más útil.
 */
function mensajePorEstado(estado: number): string {
  if (estado === 401) return 'Tu sesión venció. Volvé a entrar.'
  if (estado === 403) return 'No tenés permiso para hacer esto.'
  if (estado === 404) return 'No encontramos lo que estabas buscando.'
  if (estado === 429) return 'Demasiados intentos. Esperá un momento y probá de nuevo.'
  if (estado >= 500) return 'El servidor tuvo un problema. Probá de nuevo en un momento.'
  return 'No se pudo completar la operación.'
}

async function interpretarError(respuesta: Response): Promise<ApiError> {
  let detalle: string | undefined
  let errores: Record<string, string> | undefined

  try {
    const cuerpo = await respuesta.json()
    if (typeof cuerpo?.detail === 'string' && cuerpo.detail.trim() !== '') detalle = cuerpo.detail
    if (cuerpo?.errores && typeof cuerpo.errores === 'object') errores = cuerpo.errores
  } catch {
    // Sin cuerpo o con un cuerpo que no es JSON. Pasa, por ejemplo, con un 401
    // del filtro de seguridad: Spring rechaza el pedido antes de llegar al
    // @RestControllerAdvice.
  }

  return new ApiError(respuesta.status, detalle ?? mensajePorEstado(respuesta.status), errores)
}

/**
 * La cabecera `Authorization`, para los pedidos que NO pasan por `pedir`.
 *
 * Son los que bajan un archivo: `pedir` interpreta JSON y un `.xlsx` no lo es,
 * así que esos usan `fetch` directo. Lo que no pueden hacer es leer la
 * credencial por su cuenta — `leerCredencial` además chequea el vencimiento y
 * limpia lo que ya no vale, y una copia a mano sería la que se olvida de eso.
 *
 * Vivía privada en `sello.ts`, que fue el primero en bajar un archivo. Se mudó
 * acá el 2026-08-20, cuando la exportación del tablero la necesitó también
 * (ARQ-06: se extrae cuando aparece el segundo usuario, no antes).
 */
export function cabeceraDeCredencial(): Record<string, string> {
  const credencial = leerCredencial()
  return credencial ? { Authorization: `Bearer ${credencial.token}` } : {}
}
