import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'

import { AuthProvider } from './auth/AuthProvider'
import { RutaProtegida } from './auth/RutaProtegida'
import { useAuth, useUsuario } from './auth/contexto'
import { puedeAdministrar } from './layout/menu'
import { AlumnoPerfilPagina } from './paginas/AlumnoPerfilPagina'
import { AlumnosPagina } from './paginas/AlumnosPagina'
import { InicioPagina } from './paginas/InicioPagina'
import { InscripcionesPagina } from './paginas/InscripcionesPagina'
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

        {/* Las de administración exigen además un rol. Sin esto, alguien que
            escribe /admin/usuarios en la barra de direcciones veía el marco de
            la pantalla y una tabla que nunca cargaba: parecía un sistema roto,
            no un permiso que falta. Quien autoriza sigue siendo el backend. */}
        <Route element={<SoloAdministracion />}>
          <Route path="/admin/alumnos" element={<AlumnosPagina />} />
          <Route path="/admin/alumnos/:id" element={<AlumnoPerfilPagina />} />
          <Route path="/admin/inscripciones" element={<InscripcionesPagina />} />
          <Route path="/admin/usuarios" element={<UsuariosPagina />} />
        </Route>
      </Route>

      {/* Una URL que no existe no es un error para el usuario: lo devolvemos
          a la home, y si no tiene sesión, la ruta protegida lo manda al login. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * Las rutas `/admin/*`, para quien tiene rol.
 *
 * Usa el mismo predicado que decide si el menú dibuja el grupo Administración,
 * así no puede haber una sección visible que la ruta rechace ni al revés.
 */
function SoloAdministracion() {
  const usuario = useUsuario()

  if (!puedeAdministrar(usuario)) return <Navigate to="/" replace />

  return <Outlet />
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
