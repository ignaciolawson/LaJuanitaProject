import { createContext, use } from 'react'

import type { UsuarioActual } from '../api/tipos'

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

export type ContextoAuth = {
  sesion: Sesion
  /** Lanza `ApiError` si las credenciales no sirven; el formulario lo muestra. */
  iniciarSesion: (email: string, password: string) => Promise<void>
  cerrarSesion: () => void
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
