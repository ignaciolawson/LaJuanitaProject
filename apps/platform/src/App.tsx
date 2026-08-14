import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router'

import { AuthProvider } from './auth/AuthProvider'
import { RutaProtegida } from './auth/RutaProtegida'
import { useAuth } from './auth/contexto'
import { AlumnosPagina } from './paginas/AlumnosPagina'
import { InicioPagina } from './paginas/InicioPagina'
import { LoginPagina } from './paginas/LoginPagina'
import { RegistroPagina } from './paginas/RegistroPagina'
import { UsuariosPagina } from './paginas/UsuariosPagina'

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
      {/* Las dos rutas públicas, y las únicas. */}
      <Route path="/login" element={<SoloAnonimos><LoginPagina /></SoloAnonimos>} />
      <Route path="/registro" element={<SoloAnonimos><RegistroPagina /></SoloAnonimos>} />

      {/* Todo lo de adentro exige sesión. Los módulos que vienen (reservas,
          pagos…) se agregan acá y quedan protegidos solos. */}
      <Route element={<RutaProtegida />}>
        <Route index element={<InicioPagina />} />
        <Route path="/admin/alumnos" element={<AlumnosPagina />} />
        <Route path="/admin/usuarios" element={<UsuariosPagina />} />
      </Route>

      {/* Una URL que no existe no es un error para el usuario: lo devolvemos
          a la home, y si no tiene sesión, la ruta protegida lo manda al login. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * Login y registro solo tienen sentido para quien no entró. Si ya hay sesión,
 * devuelve a donde estaba: así el botón "atrás" del navegador después de entrar
 * no muestra el formulario de nuevo.
 */
function SoloAnonimos({ children }: { children: React.ReactNode }) {
  const { sesion } = useAuth()
  const ubicacion = useLocation()

  if (sesion.estado === 'cargando') return null

  if (sesion.estado === 'autenticado') {
    const desde = (ubicacion.state as { desde?: string } | null)?.desde
    return <Navigate to={desde ?? '/'} replace />
  }

  return <>{children}</>
}
