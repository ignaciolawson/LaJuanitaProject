import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { useAuth } from '../auth/contexto'
import { Boton } from '../componentes/Boton'

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
    <main className="grid min-h-full place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-acento">
            La Juanita
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Sistema de gestión
          </h1>
          <p className="mt-2 text-sm text-tenue">
            Entrá con tu mail y tu contraseña.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <label className="block">
            <span className="t-mono text-tenue">
              Email
            </span>
            <input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
              autoFocus
              className="mt-1.5 w-full rounded-md border border-linea bg-superficie px-3 py-2.5 text-sm outline-none transition-colors focus:border-red"
            />
          </label>

          <label className="mt-5 block">
            <span className="t-mono text-tenue">
              Contraseña
            </span>
            <input
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-md border border-linea bg-superficie px-3 py-2.5 text-sm outline-none transition-colors focus:border-red"
            />
          </label>

          {/* `role="alert"` para que el lector de pantalla anuncie el error
              sin que la persona tenga que ir a buscarlo. */}
          {error && (
            <p
              role="alert"
              className="mt-5 rounded-md border border-red/30 bg-red/5 px-3 py-2.5 text-sm text-acento"
            >
              {error}
            </p>
          )}

          <Boton
            type="submit"
            disabled={enviando} className="mt-7 w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </Boton>
        </form>

        <p className="mt-8 text-sm text-tenue">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="text-ink underline underline-offset-2 hover:text-acento">
            Creá una
          </Link>
        </p>

        <p className="mt-4 text-xs leading-relaxed text-apagado">
          ¿Olvidaste la contraseña? Pedile a administración que te la resetee:
          las contraseñas se guardan encriptadas y no se pueden recuperar.
        </p>
      </div>
    </main>
  )
}
