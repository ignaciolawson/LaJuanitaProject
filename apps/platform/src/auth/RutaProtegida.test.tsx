import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import { AuthContext, type ContextoAuth, type Sesion } from './contexto'
import { RutaProtegida } from './RutaProtegida'

/**
 * El portero de todo lo que exige sesión.
 *
 * Los tres estados importan por motivos distintos, y el del medio es el que se
 * olvida: `cargando` existe para no expulsar al login a alguien que **sí**
 * estaba adentro, cada vez que refresca la página.
 */

const USUARIO: UsuarioActual = {
  id: 1,
  nombre: 'Micaela',
  apellido: 'Prueba',
  email: 'micaela@lajuanita.local',
  telefono: null,
  rol: 'STAFF',
  fotoPerfil: null,
  esAlumno: false,
  esProfesor: false,
  debeCambiarPassword: false,
}

function contexto(sesion: Sesion): ContextoAuth {
  return {
    sesion,
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }
}

function montar(sesion: Sesion, rutaInicial = '/admin/alumnos') {
  return render(
    <AuthContext value={contexto(sesion)}>
      <MemoryRouter initialEntries={[rutaInicial]}>
        <Routes>
          <Route element={<RutaProtegida />}>
            <Route path="/admin/alumnos" element={<p>Contenido protegido</p>} />
          </Route>
          <Route path="/login" element={<p>Pantalla de login</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('RutaProtegida', () => {
  /**
   * Mandar al login mientras `/api/me` está en camino expulsaría a alguien que
   * ya estaba adentro cada vez que aprieta F5. El estado `cargando` existe por
   * eso y no es un booleano suelto.
   */
  it('mientras carga no manda al login ni muestra el contenido', () => {
    montar({ estado: 'cargando' })

    expect(screen.getByText('Cargando…')).toBeDefined()
    expect(screen.queryByText('Pantalla de login')).toBeNull()
    expect(screen.queryByText('Contenido protegido')).toBeNull()
  })

  it('sin sesión redirige al login', () => {
    montar({ estado: 'anonimo' })

    expect(screen.getByText('Pantalla de login')).toBeDefined()
    expect(screen.queryByText('Contenido protegido')).toBeNull()
  })

  it('con sesión deja pasar', () => {
    montar({ estado: 'autenticado', usuario: USUARIO })

    expect(screen.getByText('Contenido protegido')).toBeDefined()
  })

  /**
   * El corte está **antes** del Layout y todas las rutas con sesión pasan por
   * este componente, así que no hay URL que permita saltearlo. El backend hace
   * lo mismo por su cuenta —una contraseña temporal sin cambiar solo alcanza
   * para `/api/me` y `/api/me/password`—, y esta es la mitad visible.
   */
  it('con la contraseña temporal sin cambiar no se llega a ninguna pantalla', () => {
    montar({
      estado: 'autenticado',
      usuario: { ...USUARIO, debeCambiarPassword: true },
    })

    expect(screen.queryByText('Contenido protegido')).toBeNull()
    // La pantalla de cambio obligatorio, cualquiera sea su texto exacto,
    // reemplaza a la ruta pedida.
    expect(screen.queryByText('Pantalla de login')).toBeNull()
  })

  it('el bloqueo por contraseña temporal vale para cualquier ruta', () => {
    montar(
      { estado: 'autenticado', usuario: { ...USUARIO, debeCambiarPassword: true } },
      '/admin/alumnos',
    )

    expect(screen.queryByText('Contenido protegido')).toBeNull()
  })
})
