import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { useAuth } from '../auth/contexto'
import { CONTROL_DE_FORMULARIO } from '../componentes/controles'
import { Boton } from '../componentes/Boton'
import { Puerta } from '../componentes/Puerta'

export function LoginPagina() {
  const { iniciarSesion } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await iniciarSesion(email, password)
      // No hay navegación acá a propósito: al pasar a estado "autenticado",
      // App vuelve a renderizar y muestra la app en lugar del login.
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo conectar con el servidor. ¿Está levantado el backend?',
      )
      setEnviando(false)
    }
  }

  return (
    <Puerta
      // "Sistema de gestión" decía qué ES esto, y las otras dos puertas dicen qué
      // HACÉS acá ("Crear cuenta", "Elegí tu contraseña"). Era la única de las tres
      // que se presentaba en vez de invitar, y encima nombraba a la marca en el
      // único lugar donde la marca ya ocupa media pantalla.
      titulo="Ingresá"
      // La única frase con voz de toda la plataforma, y va acá porque acá
      // no hay nada que hacer todavía. Adentro, en una pantalla de carga de
      // datos, una línea así sería ruido.
      bajada="Tus clases, tus salas y tus pagos, en un solo lugar."
      pie={
        <>
          <p className="text-sm text-tenue">
            ¿No tenés cuenta?{' '}
            <Link
              to="/registro"
              className="font-medium underline underline-offset-2 hover:text-acento"
            >
              Creá una
            </Link>
          </p>

          <p className="mt-4 text-xs leading-relaxed text-apagado">
            ¿Olvidaste la contraseña? Pedile a administración que te la resetee:
            las contraseñas se guardan encriptadas y no se pueden recuperar.
          </p>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate>
        <label className="block">
          <span className="t-mono text-tenue">Email</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            autoFocus
            className={`mt-1.5 ${CONTROL_DE_FORMULARIO}`}
          />
        </label>

        <label className="mt-5 block">
          <span className="t-mono text-tenue">Contraseña</span>
          <input
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className={`mt-1.5 ${CONTROL_DE_FORMULARIO}`}
          />
        </label>

        {/* `role="alert"` para que el lector de pantalla anuncie el error sin
            que la persona tenga que ir a buscarlo. */}
        {error && (
          <p
            role="alert"
            className="mt-5 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-acento"
          >
            {error}
          </p>
        )}

        <Boton type="submit" disabled={enviando} className="mt-7 w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Boton>
      </form>
    </Puerta>
  )
}
