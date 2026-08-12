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
  const { metodo = 'GET', cuerpo, sinCredencial = false } = opciones

  const cabeceras: Record<string, string> = {}
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  if (!sinCredencial) {
    const credencial = leerCredencial()
    if (credencial) cabeceras['Authorization'] = `Bearer ${credencial.token}`
  }

  const respuesta = await fetch(ruta, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
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

async function interpretarError(respuesta: Response): Promise<ApiError> {
  let detalle = 'No se pudo completar la operación.'
  let errores: Record<string, string> | undefined

  try {
    const cuerpo = await respuesta.json()
    if (typeof cuerpo?.detail === 'string') detalle = cuerpo.detail
    if (cuerpo?.errores && typeof cuerpo.errores === 'object') errores = cuerpo.errores
  } catch {
    // Un 401 del filtro de seguridad viene sin cuerpo: Spring rechaza el
    // pedido antes de llegar al @RestControllerAdvice. Nos quedamos con el
    // mensaje por defecto.
    if (respuesta.status === 401) detalle = 'Tu sesión venció. Volvé a entrar.'
  }

  return new ApiError(respuesta.status, detalle, errores)
}
