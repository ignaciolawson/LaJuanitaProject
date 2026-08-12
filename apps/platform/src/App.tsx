import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'

import { AuthProvider } from './auth/AuthProvider'
import { RutaProtegida } from './auth/RutaProtegida'
import { useAuth } from './auth/contexto'
import { InicioPagina } from './paginas/InicioPagina'
import { LoginPagina } from './paginas/LoginPagina'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Rutas />
      </BrowserRouter>
    </AuthProvider>
  )
}

function Rutas() {
  return (
    <Routes>
      <Route path="/login" element={<SoloAnonimos />} />

      {/* Todo lo de adentro exige sesión. Los módulos que vienen (alumnos,
          reservas, pagos…) se agregan acá y quedan protegidos solos. */}
      <Route element={<RutaProtegida />}>
        <Route index element={<InicioPagina />} />
      </Route>

      {/* Una URL que no existe no es un error para el usuario: lo devolvemos
          a la home, y si no tiene sesión, la ruta protegida lo manda al login. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * El login solo tiene sentido para quien no entró. Si ya hay sesión, esta
 * ruta devuelve a donde estaba: así el botón "atrás" del navegador después de
 * entrar no muestra el formulario de login de nuevo.
 */
function SoloAnonimos() {
  const { sesion } = useAuth()
  const ubicacion = useLocation()

  if (sesion.estado === 'cargando') return null

  if (sesion.estado === 'autenticado') {
    const desde = (ubicacion.state as { desde?: string } | null)?.desde
    return <Navigate to={desde ?? '/'} replace />
  }

  return <LoginPagina />
}
