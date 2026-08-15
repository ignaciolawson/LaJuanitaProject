import { createContext, use } from 'react'

import type { RegistroRequest, UsuarioActual } from '../api/tipos'

/**
 * Los tres estados posibles de la sesión, como unión discriminada.
 *
 * `cargando` es un estado de verdad y no un booleano suelto: al arrancar la
 * app con un token guardado hay que preguntarle al backend quién es antes de
 * decidir nada. Sin este estado, el primer render diría "anónimo" y mandaría
 * al login a alguien que ya estaba adentro.
 */
export type Sesion =
  | { estado: 'cargando' }
  | { estado: 'anonimo' }
  | { estado: 'autenticado'; usuario: UsuarioActual }

/*
 * Acá vivía `DatosDeRegistro`, que era `RegistroRequest` con otro nombre: los
 * mismos cinco campos, declarados aparte porque los tipos de pedido no estaban
 * en `tipos.ts`. Ahora sí están (ARQ-09), así que el contrato tiene un solo
 * nombre y un solo lugar donde cambiarlo.
 */

export type ContextoAuth = {
  sesion: Sesion
  /** Lanza `ApiError` si las credenciales no sirven; el formulario lo muestra. */
  iniciarSesion: (email: string, password: string) => Promise<void>
  /** Crea la cuenta y deja a la persona adentro, sin un segundo paso de login. */
  registrarse: (datos: RegistroRequest) => Promise<void>
  cerrarSesion: () => void
  /**
   * Vuelve a leer `/api/me`. Hace falta cuando algo que el front ya tiene
   * guardado cambió del lado del servidor -- hoy, al cambiar la contraseña
   * obligatoria, que apaga `debeCambiarPassword`.
   */
  refrescarUsuario: () => Promise<void>
}

export const AuthContext = createContext<ContextoAuth | null>(null)

export function useAuth(): ContextoAuth {
  const contexto = use(AuthContext)
  if (!contexto) {
    throw new Error('useAuth se usó fuera de <AuthProvider>.')
  }
  return contexto
}

/**
 * El usuario de la sesión, ya sin el `null`.
 *
 * Solo se puede usar dentro de una ruta protegida, que es justamente lo que
 * garantiza que haya usuario. Sirve para que las pantallas no tengan que
 * discriminar la unión ni recibir el usuario por props desde la raíz.
 */
export function useUsuario(): UsuarioActual {
  const { sesion } = useAuth()
  if (sesion.estado !== 'autenticado') {
    throw new Error('useUsuario se usó fuera de una ruta protegida.')
  }
  return sesion.usuario
}
