import { Navigate, useLocation } from 'react-router'

import { Layout } from '../layout/Layout'
import { useAuth } from './contexto'

/**
 * Envuelve todo lo que exige haber iniciado sesión.
 *
 * Va como `element` de una `<Route>` sin path, con las rutas protegidas
 * adentro: así el chequeo se escribe una sola vez y agregar un módulo nuevo
 * es agregar un `<Route>` adentro, sin acordarse de nada.
 */
export function RutaProtegida() {
  const { sesion } = useAuth()
  const ubicacion = useLocation()

  // Todavía no sabemos quién es: hay una credencial guardada y `/api/me`
  // está en camino. Mandar al login acá sería expulsar a alguien que sí
  // estaba adentro, cada vez que refresca la página.
  if (sesion.estado === 'cargando') return <Pantalla>Cargando…</Pantalla>

  if (sesion.estado === 'anonimo') {
    // `state.desde` guarda a dónde quería ir, para devolverlo ahí después de
    // entrar en vez de dejarlo siempre en la home.
    return <Navigate to="/login" state={{ desde: ubicacion.pathname }} replace />
  }

  return <Layout />
}

export function Pantalla({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full place-items-center text-sm text-tenue">
      {children}
    </div>
  )
}
