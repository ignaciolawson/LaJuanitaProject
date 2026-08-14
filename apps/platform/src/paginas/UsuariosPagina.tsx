import { useCallback, useEffect, useState } from 'react'

import { cambiarActivoUsuario, listarUsuarios } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { UsuarioResumen } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { useUsuario } from '../auth/contexto'

const NOMBRE_DE_ROL: Record<string, string> = {
  ADMIN: 'Administración',
  DIRECTIVO: 'Dirección',
  STAFF: 'Equipo',
  USUARIO: 'Usuario',
}

/**
 * Todas las personas con cuenta, sean alumnos o no.
 *
 * Es la pantalla que hace visible la decisión de arquitectura del sistema: acá
 * aparece gente que alquiló una cabina una vez y nunca cursó nada. En el modelo
 * original, que trataba al alumno como el usuario del sistema, esa gente no
 * existía.
 */
export function UsuariosPagina() {
  const yo = useUsuario()

  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([])
  const [total, setTotal] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const pagina = await listarUsuarios({ buscar })
      setUsuarios(pagina.contenido)
      setTotal(pagina.totalElementos)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  async function alternarActivo(usuario: UsuarioResumen) {
    try {
      await cambiarActivoUsuario(usuario.id, !usuario.activo)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Personas</h2>
        <p className="mt-1 text-sm text-tenue">
          {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'cuenta' : 'cuentas'}`} · incluye a
          quien solo alquila cabina o compra equipos
        </p>
      </div>

      <input
        type="search"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="Buscar por nombre, apellido o email…"
        className="mb-4 w-full max-w-md rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
              <th className="px-4 py-3 font-semibold">Persona</th>
              <th className="px-4 py-3 font-semibold">Contacto</th>
              <th className="px-4 py-3 font-semibold">Rol</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <span className="font-medium">
                    {u.apellido}, {u.nombre}
                  </span>
                  {u.id === yo.id && <span className="ml-2 text-xs text-apagado">(vos)</span>}
                  {u.debeCambiarPassword && (
                    <span className="ml-2 text-xs text-apagado">· contraseña sin cambiar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-tenue">
                  <div>{u.email}</div>
                  {u.telefono && <div className="text-xs">{u.telefono}</div>}
                </td>
                <td className="px-4 py-3 text-tenue">{NOMBRE_DE_ROL[u.rol] ?? u.rol}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                      u.activo ? 'border-ink/20 text-ink' : 'border-linea text-apagado'
                    }`}
                  >
                    {u.activo ? 'Activa' : 'Desactivada'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {/* Desactivarse a uno mismo deja a la persona afuera en el
                      próximo pedido. El backend no lo impide todavía; acá al
                      menos no se ofrece el botón. */}
                  {u.id !== yo.id && (
                    <button
                      type="button"
                      onClick={() => void alternarActivo(u)}
                      className="text-xs text-tenue underline underline-offset-2 transition-colors hover:text-red"
                    >
                      {u.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {!cargando && usuarios.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-tenue">
                  No hay cuentas que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
