import { useNavigate } from 'react-router'

import { Boton } from '../componentes/Boton'
import { PantallaDeEstado } from '../componentes/PantallaDeEstado'

/**
 * Una sección que esta cuenta no puede ver.
 *
 * Dos puertas, y dicen cosas distintas porque se abren distinto:
 *
 *   administracion  la pide un ROL (`SoloAdministracion`). Antes rebotaba al
 *                   Inicio en silencio.
 *   profesores      la pide una RELACIÓN, que decide el backend (403 de
 *                   `/api/me/profesor/**`). Antes era un cartel rojo suelto
 *                   — *"Esta sección es de los profesores del estudio."* — que
 *                   es lo que vio Ignacio al cerrar la sesión de un profe y
 *                   entrar con la de un alumno en la misma pestaña.
 *
 * No autoriza nada: quien decide sigue siendo el backend. Esto sólo dice lo que
 * pasó en vez de dejar una pantalla vacía o un salto que no se explica.
 */
export function SinPermisoPagina({ para }: { para: 'administracion' | 'profesores' }) {
  const navegar = useNavigate()

  return (
    <PantallaDeEstado
      codigo="403"
      pista={para === 'profesores' ? 'SOLO PROFES' : 'SOLO STAFF'}
      titular="Te creías el DJ main, pero no estás ni en el line-up."
      remate={
        para === 'profesores'
          ? 'Esta cabina es solo para los profes del estudio.'
          : 'Esta cabina es solo para el equipo del estudio.'
      }
      acciones={
        <Boton type="button" onClick={() => navegar('/')}>
          Volver al inicio
        </Boton>
      }
    >
      {para === 'profesores'
        ? 'Esta sección es para quienes dan clases en el estudio, y tu cuenta no tiene alumnos a cargo. Si sos profe y no la ves, pedile a administración que te dé de alta como profesor.'
        : 'Tu cuenta no tiene acceso a esta sección. Si creés que deberías verla, pedile a administración que te lo habilite.'}
    </PantallaDeEstado>
  )
}
