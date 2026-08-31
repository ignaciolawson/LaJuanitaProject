import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router'

import { AuthProvider } from './auth/AuthProvider'
import { RutaProtegida } from './auth/RutaProtegida'
import { useAuth, useUsuario } from './auth/contexto'
import { puedeAdministrar } from './layout/menu'
import { AlumnoPerfilPagina } from './paginas/AlumnoPerfilPagina'
import { AlumnosPagina } from './paginas/AlumnosPagina'
import { BloqueosPagina } from './paginas/BloqueosPagina'
import { CajaPagina } from './paginas/CajaPagina'
import { CalendarioPagina } from './paginas/CalendarioPagina'
import { DeudoresPagina } from './paginas/DeudoresPagina'
import { EgresosPagina } from './paginas/EgresosPagina'
import { VentasPagina } from './paginas/VentasPagina'
import { EstadoDeCuentaPagina } from './paginas/EstadoDeCuentaPagina'
import { InicioPagina } from './paginas/InicioPagina'
import { InscripcionesPagina } from './paginas/InscripcionesPagina'
import { LoginPagina } from './paginas/LoginPagina'
import { MiAgendaPagina } from './paginas/MiAgendaPagina'
import { MiCuentaPagina } from './paginas/MiCuentaPagina'
import { MixMasteringPagina } from './paginas/MixMasteringPagina'
import { MiPerfilPagina } from './paginas/MiPerfilPagina'
import { FichaDeAlumnoPagina } from './paginas/FichaDeAlumnoPagina'
import { MisAlumnosPagina } from './paginas/MisAlumnosPagina'
import { MisCursosPagina } from './paginas/MisCursosPagina'
import { MisTrabajosPagina } from './paginas/MisTrabajosPagina'
import { MisMaterialesPagina } from './paginas/MisMaterialesPagina'
import { MisReservasPagina } from './paginas/MisReservasPagina'
import { MisSolicitudesPagina } from './paginas/MisSolicitudesPagina'
import { ArtistasPagina } from './paginas/ArtistasPagina'
import { NotificacionesPagina } from './paginas/NotificacionesPagina'
import { ReservarPagina } from './paginas/ReservarPagina'
import { SelloPagina } from './paginas/SelloPagina'
import { SubirMaterialPagina } from './paginas/SubirMaterialPagina'
import { ReprogramacionesPagina } from './paginas/ReprogramacionesPagina'
import { SolicitantesPagina } from './paginas/SolicitantesPagina'
import { SolicitudesPagina } from './paginas/SolicitudesPagina'
import { PagosPagina } from './paginas/PagosPagina'
import { RegistroPagina } from './paginas/RegistroPagina'
import { UsoDeSalasPagina } from './paginas/UsoDeSalasPagina'
import { TableroPagina } from './paginas/TableroPagina'
import { UsuariosPagina } from './paginas/UsuariosPagina'

export default function App() {
  return (
    <AuthProvider>
      {/* El `basename` es el gemelo del `base` de `vite.config.ts`: la
          plataforma se sirve bajo `/app` porque comparte origen con la landing
          (ver el comentario largo alla). Los dos tienen que moverse juntos —con
          uno solo, o cargan los assets y no resuelve ninguna ruta, o al reves. */}
      <BrowserRouter basename="/app">
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

        {/* El portal (Módulo 4). No llevan guarda de rol y es correcto: son
            pantallas sobre lo propio, y el backend las acota por identidad —el
            id sale del token, no de la URL. Un USUARIO sin nada ve listas
            vacías, que es lo que tiene. */}
        <Route path="/mis-reservas" element={<MisReservasPagina />} />
        <Route path="/reservar" element={<ReservarPagina />} />
        <Route path="/mis-solicitudes" element={<MisSolicitudesPagina />} />
        <Route path="/mis-cursos" element={<MisCursosPagina />} />
        <Route path="/mis-materiales" element={<MisMaterialesPagina />} />
        <Route path="/mix-mastering" element={<MisTrabajosPagina />} />

        {/* El portal del profesor (Módulo 5). Van acá afuera por lo mismo: no
            hay guarda de rol porque ser profesor no es un rol sino una
            relación, y ningún `@PreAuthorize` puede decidirla. El backend va y
            busca la fila; quien no la tiene no entra aunque sea ADMIN. */}
        <Route path="/mi-agenda" element={<MiAgendaPagina />} />
        <Route path="/mis-alumnos" element={<MisAlumnosPagina />} />
        <Route path="/mis-alumnos/:idAlumno" element={<FichaDeAlumnoPagina />} />
        <Route path="/material" element={<SubirMaterialPagina />} />
        <Route path="/mis-pagos" element={<MiCuentaPagina />} />
        <Route path="/notificaciones" element={<NotificacionesPagina />} />
        <Route path="/mi-perfil" element={<MiPerfilPagina />} />

        {/* Las de administración exigen además un rol. Sin esto, alguien que
            escribe /admin/usuarios en la barra de direcciones veía el marco de
            la pantalla y una tabla que nunca cargaba: parecía un sistema roto,
            no un permiso que falta. Quien autoriza sigue siendo el backend. */}
        <Route element={<SoloAdministracion />}>
          <Route path="/admin/alumnos" element={<AlumnosPagina />} />
          <Route path="/admin/alumnos/:id" element={<AlumnoPerfilPagina />} />
          <Route path="/admin/inscripciones" element={<InscripcionesPagina />} />
          <Route path="/admin/reservas" element={<CalendarioPagina />} />
          <Route path="/admin/solicitudes" element={<SolicitudesPagina />} />
          <Route path="/admin/buzon" element={<SolicitantesPagina />} />
          <Route path="/admin/reprogramaciones" element={<ReprogramacionesPagina />} />
          <Route path="/admin/bloqueos" element={<BloqueosPagina />} />
          <Route path="/admin/uso-salas" element={<UsoDeSalasPagina />} />
          <Route path="/admin/pagos" element={<PagosPagina />} />
          <Route path="/admin/estado-de-cuenta/:idUsuario" element={<EstadoDeCuentaPagina />} />
          <Route path="/admin/caja" element={<CajaPagina />} />
          <Route path="/admin/deudores" element={<DeudoresPagina />} />
          <Route path="/admin/egresos" element={<EgresosPagina />} />
          <Route path="/admin/ventas" element={<VentasPagina />} />
          <Route path="/admin/mix-mastering" element={<MixMasteringPagina />} />
          <Route path="/admin/sello" element={<SelloPagina />} />
          <Route path="/admin/artistas" element={<ArtistasPagina />} />
          <Route path="/admin/tablero" element={<TableroPagina />} />
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
