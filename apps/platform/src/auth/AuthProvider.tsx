import { useCallback, useEffect, useMemo, useState } from 'react'

import { pedir, registrarManejadorDeSesionVencida } from '../api/cliente'
import type { LoginRequest, LoginResponse, RegistroRequest, UsuarioActual } from '../api/tipos'
import { AuthContext, type Sesion } from './contexto'
import { borrarCredencial, guardarCredencial, leerCredencial } from './credencial'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Sesion>({ estado: 'cargando' })

  // Al arrancar: si hay una credencial guardada y vigente, se le pregunta al
  // backend quién es. No alcanza con leer el token -- puede haber quedado con
  // un rol viejo, o la persona puede haber sido dada de baja desde que se
  // emitió. `/api/me` relee el usuario de la base y es la única fuente.
  useEffect(() => {
    if (!leerCredencial()) {
      setSesion({ estado: 'anonimo' })
      return
    }

    let vigente = true

    pedir<UsuarioActual>('/api/me')
      .then((usuario) => {
        if (vigente) setSesion({ estado: 'autenticado', usuario })
      })
      .catch(() => {
        borrarCredencial()
        if (vigente) setSesion({ estado: 'anonimo' })
      })

    return () => {
      vigente = false
    }
  }, [])

  const iniciarSesion = useCallback(async (email: string, password: string) => {
    const respuesta = await pedir<LoginResponse>('/api/auth/login', {
      metodo: 'POST',
      cuerpo: { email, password } satisfies LoginRequest,
      sinCredencial: true,
    })

    guardarCredencial({ token: respuesta.token, expiraEn: respuesta.expiraEn })
    // El login ya devuelve el usuario completo, así que no hace falta un
    // segundo viaje a `/api/me` para poder dibujar el menú.
    setSesion({ estado: 'autenticado', usuario: respuesta.usuario })
  }, [])

  const registrarse = useCallback(async (datos: RegistroRequest) => {
    const respuesta = await pedir<LoginResponse>('/api/auth/registro', {
      metodo: 'POST',
      cuerpo: datos,
      sinCredencial: true,
    })

    guardarCredencial({ token: respuesta.token, expiraEn: respuesta.expiraEn })
    setSesion({ estado: 'autenticado', usuario: respuesta.usuario })
  }, [])

  const refrescarUsuario = useCallback(async () => {
    const usuario = await pedir<UsuarioActual>('/api/me')
    setSesion({ estado: 'autenticado', usuario })
  }, [])

  const cerrarSesion = useCallback(() => {
    borrarCredencial()
    setSesion({ estado: 'anonimo' })
  }, [])

  // Si el backend rechaza la credencial en cualquier pedido, la sesión se
  // termina acá y no cuando la persona se dé cuenta sola. Cubre el caso del
  // token que vence con la app abierta, y también el del usuario dado de baja
  // mientras estaba adentro.
  useEffect(() => {
    registrarManejadorDeSesionVencida(() => {
      borrarCredencial()
      setSesion({ estado: 'anonimo' })
    })
  }, [])

  const valor = useMemo(
    () => ({ sesion, iniciarSesion, registrarse, cerrarSesion, refrescarUsuario }),
    [sesion, iniciarSesion, registrarse, cerrarSesion, refrescarUsuario],
  )

  return <AuthContext value={valor}>{children}</AuthContext>
}
