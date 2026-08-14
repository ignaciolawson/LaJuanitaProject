import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { useAuth } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'

/**
 * Crear cuenta. Público.
 *
 * Cualquiera se hace una cuenta, sea alumno o no: para ver tus reservas
 * necesitás una, y quien alquila una cabina una vez nunca va a cursar nada.
 * Por eso este formulario NO pregunta disciplina ni nivel -- eso es de la
 * inscripción, que la carga administración después.
 */
export function RegistroPagina() {
  const { registrarse } = useAuth()

  const [datos, setDatos] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    password: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
    }
  }

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await registrarse(datos)
      // Sin navegación: al quedar autenticado, App renderiza la app.
    } catch (e) {
      if (e instanceof ApiError) {
        // El backend manda los errores por campo, así cada input muestra el
        // suyo. Un email repetido llega como 409 y se dibuja igual que un 400.
        if (e.errores) setErrores(e.errores)
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <main className="grid min-h-full place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <header className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-red">
            La Juanita
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Crear cuenta</h1>
          <p className="mt-2 text-sm leading-relaxed text-tenue">
            Con tu cuenta reservás cabina, seguís tus pagos y, si cursás, ves tus
            clases.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Nombre"
              value={datos.nombre}
              onChange={cambiar('nombre')}
              error={errores.nombre}
              autoComplete="given-name"
              required
              autoFocus
            />
            <Campo
              etiqueta="Apellido"
              value={datos.apellido}
              onChange={cambiar('apellido')}
              error={errores.apellido}
              autoComplete="family-name"
              required
            />
          </div>

          <Campo
            className="mt-4"
            etiqueta="Email"
            type="email"
            value={datos.email}
            onChange={cambiar('email')}
            error={errores.email}
            autoComplete="email"
            required
          />

          <Campo
            className="mt-4"
            etiqueta="Teléfono"
            type="tel"
            value={datos.telefono}
            onChange={cambiar('telefono')}
            error={errores.telefono}
            autoComplete="tel"
            required
          />

          <Campo
            className="mt-4"
            etiqueta="Contraseña"
            type="password"
            value={datos.password}
            onChange={cambiar('password')}
            error={errores.password}
            autoComplete="new-password"
            required
            ayuda="Mínimo 8 caracteres."
          />

          {errorGeneral && (
            <div className="mt-5">
              <Aviso>{errorGeneral}</Aviso>
            </div>
          )}

          <Boton type="submit" disabled={enviando} className="mt-7 w-full">
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </Boton>
        </form>

        <p className="mt-8 text-sm text-tenue">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-ink underline underline-offset-2 hover:text-red">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
