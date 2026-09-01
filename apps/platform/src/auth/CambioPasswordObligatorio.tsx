import { useState, type FormEvent } from 'react'

import { cambiarMiPassword } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { Puerta } from '../componentes/Puerta'
import { useAuth, useUsuario } from './contexto'

/**
 * Pantalla que tapa TODO el sistema hasta que la persona elija su contraseña.
 *
 * Aparece cuando la cuenta la creó administración: esa contraseña la generó el
 * sistema, Micaela la mandó por WhatsApp y la conocen dos personas. Mientras
 * siga siendo la de acceso, la cuenta no es realmente de nadie.
 *
 * Se dibuja desde `RutaProtegida`, que es el único lugar por donde pasan todas
 * las rutas con sesión: así no hay forma de esquivarla escribiendo una URL.
 */
export function CambioPasswordObligatorio() {
  const usuario = useUsuario()
  const { refrescarUsuario, cerrarSesion } = useAuth()

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)

    // Se verifica acá y no en el backend: que las dos escrituras coincidan es
    // una ayuda para no equivocarse tipeando, no una regla del sistema.
    if (passwordNueva !== repetida) {
      setErrores({ repetida: 'Las dos contraseñas no coinciden.' })
      return
    }

    setEnviando(true)
    try {
      await cambiarMiPassword(passwordActual, passwordNueva)
      // El backend apagó `debeCambiarPassword`; hay que releerlo para que esta
      // pantalla deje de aparecer.
      await refrescarUsuario()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <Puerta
      titulo="Elegí tu contraseña"
      bajada={`Hola ${usuario.nombre}. Un paso y entrás.`}
      pie={
        <>
          <p className="text-sm leading-relaxed text-tenue">
            Entraste con una contraseña que te dio administración. Elegí una
            propia para seguir: esa la conoce alguien más.
          </p>

          <Boton variante="enlace" type="button" onClick={cerrarSesion} className="mt-5">
            Cerrar sesión
          </Boton>
        </>
      }
    >
        <form onSubmit={onSubmit} noValidate>
          <Campo
            etiqueta="Contraseña que te dieron"
            type="password"
            value={passwordActual}
            onChange={(e) => setPasswordActual(e.target.value)}
            error={errores.passwordActual}
            autoComplete="current-password"
            required
            autoFocus
          />

          <Campo
            className="mt-4"
            etiqueta="Tu contraseña nueva"
            type="password"
            value={passwordNueva}
            onChange={(e) => setPasswordNueva(e.target.value)}
            error={errores.passwordNueva}
            autoComplete="new-password"
            required
            ayuda="Mínimo 8 caracteres."
          />

          <Campo
            className="mt-4"
            etiqueta="Repetila"
            type="password"
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            error={errores.repetida}
            autoComplete="new-password"
            required
          />

          {errorGeneral && (
            <div className="mt-5">
              <Aviso>{errorGeneral}</Aviso>
            </div>
          )}

          <Boton type="submit" disabled={enviando} className="mt-7 w-full">
            {enviando ? 'Guardando…' : 'Guardar y entrar'}
          </Boton>
        </form>

    </Puerta>
  )
}
