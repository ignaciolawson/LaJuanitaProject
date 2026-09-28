import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { useAuth } from '../auth/contexto'
import { Boton } from '../componentes/Boton'
import { CampoDePuerta } from '../componentes/CampoDePuerta'
import { useErrorPasajero } from '../componentes/aviso'
import { Puerta } from '../componentes/Puerta'

export function LoginPagina() {
  const { iniciarSesion } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recordarme, setRecordarme] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useErrorPasajero()

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setError(null)
    setEnviando(true)

    try {
      await iniciarSesion(email, password, recordarme)
      // No hay navegación acá a propósito: al pasar a estado "autenticado",
      // App vuelve a renderizar y muestra la app en lugar del login.
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'No se pudo conectar con el servidor.',
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
        <CampoDePuerta
          etiqueta="Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
          autoFocus
        />

        <CampoDePuerta
          etiqueta="Contraseña"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="mt-5"
        />

        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 select-none lg:min-h-0">
          <input
            type="checkbox"
            checked={recordarme}
            onChange={(e) => setRecordarme(e.target.checked)}
            className="peer sr-only"
          />
          {/* La casilla dibujada. Va inmediatamente después del input: el CSS
              del tilde (`index.css`) la encuentra con `input:checked + .casilla`. */}
          <span
            aria-hidden
            className="casilla grid size-5 shrink-0 place-items-center rounded-md border border-linea-control/70 bg-superficie transition-colors peer-checked:border-red peer-checked:bg-red peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-acento"
          >
            <svg viewBox="0 0 16 16" className="size-3.5 text-white" fill="none">
              <path
                d="M3.5 8.5l3 3 6-7"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
              />
            </svg>
          </span>
          <span className="text-sm text-tenue">Recordarme</span>
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
