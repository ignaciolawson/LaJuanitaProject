import { useState } from 'react'

import { ApiError } from '../api/cliente'
import { editarPerfil } from '../api/portal'
import { useAuth, useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'

/**
 * Módulo 4 — mi perfil.
 *
 * **El email no se edita acá, y no es un olvido.** Es la credencial con la que
 * se entra y no hay forma de verificar que la dirección nueva sea de quien la
 * escribe: no hay infraestructura de correo ni la va a haber pronto. Con un
 * email mal tipeado la persona queda afuera de su propia cuenta y nadie se
 * entera hasta que intenta entrar. Cambiarlo es un trámite con administración,
 * que ya tiene la pantalla.
 *
 * El rol tampoco, por razones más evidentes.
 */
export function MiPerfilPagina() {
  const usuario = useUsuario()
  const { refrescarUsuario } = useAuth()

  const [nombre, setNombre] = useState(usuario.nombre)
  const [apellido, setApellido] = useState(usuario.apellido)
  const [telefono, setTelefono] = useState(usuario.telefono ?? '')

  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setErrores({})
    setError(null)
    setGuardado(false)
    setGuardando(true)

    try {
      await editarPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim() || undefined,
      })
      // El endpoint devuelve el usuario completo, pero la sesión la maneja el
      // AuthProvider: se le pide que relea en vez de escribirle el estado desde
      // acá, así hay un solo lugar que sabe quién está adentro.
      await refrescarUsuario()
      setGuardado(true)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        if (e.errores) setErrores(e.errores)
      } else {
        setError('No se pudieron guardar los cambios.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Mi perfil</h2>
        <p className="mt-1 text-sm text-tenue">Tus datos de contacto.</p>
      </div>

      <form noValidate onSubmit={guardar} className="rounded-lg border border-linea bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={errores.nombre}
          />
          <Campo
            etiqueta="Apellido"
            required
            value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            error={errores.apellido}
          />
        </div>

        <Campo
          etiqueta="Teléfono"
          className="mt-4"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          error={errores.telefono}
          ayuda="Es por donde te escribimos para coordinar."
        />

        <div className="mt-4 rounded-md border border-linea bg-papel px-3 py-2.5">
          <div className="text-xs font-medium uppercase tracking-wider text-tenue">Email</div>
          <div className="mt-0.5 text-sm">{usuario.email}</div>
          <p className="mt-1 text-xs text-apagado">
            Es con lo que entrás al sistema. Para cambiarlo, escribinos.
          </p>
        </div>

        {error && (
          <div className="mt-4">
            <Aviso>{error}</Aviso>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </Boton>
          {guardado && <span className="text-sm text-tenue">Listo, se guardó.</span>}
        </div>
      </form>
    </div>
  )
}
