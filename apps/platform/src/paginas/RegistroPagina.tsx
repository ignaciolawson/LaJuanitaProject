import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import type { RegistroRequest } from '../api/tipos'
import { useAuth } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { Puerta } from '../componentes/Puerta'

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

  // Tipado con el contrato y no inferido del literal: así, si al backend le
  // aparece un campo obligatorio, el formulario deja de compilar acá en vez de
  // mandar un cuerpo incompleto que nadie rechaza.
  const [datos, setDatos] = useState<RegistroRequest>({
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
    <Puerta
      titulo="Crear cuenta"
      bajada="Reservá cabina, seguí tus pagos y, si cursás, mirá tus clases."
      pie={
        <p className="text-sm text-tenue">
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/login"
            className="font-medium underline underline-offset-2 hover:text-acento"
          >
            Iniciá sesión
          </Link>
        </p>
      }
    >
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

    </Puerta>
  )
}
