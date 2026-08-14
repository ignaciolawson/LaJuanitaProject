import { useCallback, useEffect, useState } from 'react'

import {
  altaAlumno,
  cambiarEstadoAlumno,
  editarAlumno,
  listarAlumnos,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { AlumnoResumen, EstadoAlumno, NivelIngreso } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { useUsuario } from '../auth/contexto'
import { puedeOperar } from '../layout/menu'

const ESTADOS: EstadoAlumno[] = ['ACTIVO', 'INACTIVO', 'SUSPENDIDO']
const NIVELES: NivelIngreso[] = ['INICIAL', 'INTERMEDIO', 'AVANZADO']

/**
 * Módulo 1 — el listado que reemplaza el Notion de Micaela.
 *
 * Todavía sin disciplina ni nivel actual: eso vive en `inscripcion`, que es la
 * próxima tanda.
 */
export function AlumnosPagina() {
  const puedeEscribir = puedeOperar(useUsuario())

  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoAlumno | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [editando, setEditando] = useState<AlumnoResumen | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarAlumnos({ buscar, estado, pagina })
      setAlumnos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, pagina])

  // Espera a que la persona deje de tipear antes de pedir: sin esto, cada
  // tecla dispara una consulta.
  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  // Volver a la primera página al cambiar qué se busca: filtrar desde la página
  // 3 devuelve vacío y parece que no hay resultados.
  function cambiarBusqueda(texto: string) {
    setBuscar(texto)
    setPagina(0)
  }

  function cambiarFiltroEstado(nuevo: EstadoAlumno | '') {
    setEstado(nuevo)
    setPagina(0)
  }

  async function cambiarEstado(alumno: AlumnoResumen, nuevo: EstadoAlumno) {
    try {
      await cambiarEstadoAlumno(alumno.idAlumno, nuevo)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Alumnos</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'alumno' : 'alumnos'}`}
          </p>
        </div>
        {/* DIRECTIVO lee todo y no escribe nada. Ofrecerle el alta terminaba en
            "No tenés permiso para hacer esto" después de completar el
            formulario. Quien autoriza sigue siendo el backend. */}
        {puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Nuevo alumno</Boton>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          placeholder="Buscar por nombre, apellido o email…"
          className="min-w-64 flex-1 rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
        />
        <select
          value={estado}
          onChange={(e) => cambiarFiltroEstado(e.target.value as EstadoAlumno | '')}
          className="rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0) + e.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && (
        <FormularioAlta
          onCerrar={() => setMostrandoAlta(false)}
          onCreado={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {editando && (
        <FormularioEdicion
          alumno={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
              <th className="px-4 py-3 font-semibold">Alumno</th>
              <th className="px-4 py-3 font-semibold">Contacto</th>
              <th className="px-4 py-3 font-semibold">Nivel de ingreso</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {alumnos.map((a) => (
              <tr key={a.idAlumno}>
                <td className="px-4 py-3">
                  <span className="font-medium">
                    {a.apellido}, {a.nombre}
                  </span>
                  {!a.usuarioActivo && (
                    <span className="ml-2 text-xs text-apagado">(cuenta desactivada)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-tenue">
                  <div>{a.email}</div>
                  {a.telefono && <div className="text-xs">{a.telefono}</div>}
                </td>
                <td className="px-4 py-3 text-tenue">{a.nivelIngreso ?? '—'}</td>
                <td className="px-4 py-3">
                  <Etiqueta estado={a.estadoAlumno} />
                </td>
                <td className="px-4 py-3">
                  {puedeEscribir && (
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setEditando(a)}
                        className="text-xs text-tenue underline underline-offset-2 transition-colors hover:text-red"
                      >
                        Editar
                      </button>
                      <select
                        value={a.estadoAlumno}
                        onChange={(e) => void cambiarEstado(a, e.target.value as EstadoAlumno)}
                        aria-label={`Cambiar estado de ${a.nombre} ${a.apellido}`}
                        className="rounded border border-linea bg-white px-2 py-1 text-xs outline-none focus:border-red"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {e.charAt(0) + e.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {!cargando && alumnos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-tenue">
                  {buscar || estado
                    ? 'No hay alumnos que coincidan con la búsqueda.'
                    : 'Todavía no hay alumnos cargados.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Paginado
        pagina={pagina}
        totalPaginas={totalPaginas}
        totalElementos={total}
        onCambiar={setPagina}
      />
    </div>
  )
}

function Etiqueta({ estado }: { estado: EstadoAlumno }) {
  const estilo = {
    ACTIVO: 'border-ink/20 text-ink',
    INACTIVO: 'border-linea text-apagado',
    SUSPENDIDO: 'border-red/40 text-red',
  }[estado]

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${estilo}`}>
      {estado.charAt(0) + estado.slice(1).toLowerCase()}
    </span>
  )
}

/**
 * Edición de lo que es propio del alumno.
 *
 * No toca nombre, email ni teléfono: eso vive en el `usuario` y se edita desde
 * Personas. Son dos entidades distintas y el backend las mantiene separadas
 * (`EdicionAlumnoRequest` tampoco los acepta).
 */
function FormularioEdicion({
  alumno,
  onCerrar,
  onGuardado,
}: {
  alumno: AlumnoResumen
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [datos, setDatos] = useState({
    nivelIngreso: (alumno.nivelIngreso ?? '') as NivelIngreso | '',
    instagram: alumno.instagram ?? '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await editarAlumno(alumno.idAlumno, {
        nivelIngreso: datos.nivelIngreso || undefined,
        instagram: datos.instagram || undefined,
      })
      onGuardado()
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
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-white p-5">
      <h3 className="mb-1 font-semibold">
        Editar a {alumno.nombre} {alumno.apellido}
      </h3>
      <p className="mb-4 text-xs text-apagado">
        El nombre y el contacto se editan desde Personas: son datos de la cuenta, no del alumno.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Nivel de ingreso"
          value={datos.nivelIngreso}
          onChange={cambiar('nivelIngreso')}
          error={errores.nivelIngreso}
        >
          <option value="">Sin definir</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {n.charAt(0) + n.slice(1).toLowerCase()}
            </option>
          ))}
        </CampoSelect>
        <Campo
          etiqueta="Instagram"
          value={datos.instagram}
          onChange={cambiar('instagram')}
          error={errores.instagram}
          placeholder="@usuario"
        />
      </div>

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/**
 * Alta de alumno creando la cuenta.
 *
 * El otro camino (una persona que ya tiene cuenta y ahora se inscribe) usa el
 * mismo endpoint mandando `idUsuario`, y se agrega cuando exista el buscador de
 * personas. El backend ya lo soporta.
 */
function FormularioAlta({
  onCerrar,
  onCreado,
}: {
  onCerrar: () => void
  onCreado: () => void
}) {
  const [datos, setDatos] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    nivelIngreso: '' as NivelIngreso | '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      const resultado = await altaAlumno({
        usuarioNuevo: {
          nombre: datos.nombre,
          apellido: datos.apellido,
          email: datos.email,
          telefono: datos.telefono || undefined,
        },
        nivelIngreso: datos.nivelIngreso || undefined,
      })
      // No se cierra todavía: hay que mostrar la contraseña temporal, que no se
      // puede volver a consultar nunca.
      setPasswordTemporal(resultado.passwordTemporal)
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

  if (passwordTemporal) {
    return (
      <div className="mb-6 rounded-lg border border-linea bg-white p-5">
        <h3 className="font-semibold">Alumno creado</h3>
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          Pasale esta contraseña por WhatsApp. El sistema le va a pedir que la
          cambie cuando entre. <strong className="text-ink">No se puede volver a ver:</strong>{' '}
          si se pierde, hay que generar una nueva.
        </p>
        <p className="mt-3 rounded-md border border-linea bg-papel px-4 py-3 font-mono text-lg tracking-wider">
          {passwordTemporal}
        </p>
        <Boton className="mt-4" onClick={onCreado}>
          Listo
        </Boton>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-white p-5">
      <h3 className="mb-4 font-semibold">Nuevo alumno</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre"
          value={datos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
          required
          autoFocus
        />
        <Campo
          etiqueta="Apellido"
          value={datos.apellido}
          onChange={cambiar('apellido')}
          error={errores.apellido}
          required
        />
        <Campo
          etiqueta="Email"
          type="email"
          value={datos.email}
          onChange={cambiar('email')}
          error={errores.email}
          required
        />
        <Campo
          etiqueta="Teléfono"
          type="tel"
          value={datos.telefono}
          onChange={cambiar('telefono')}
          error={errores.telefono}
        />
        <CampoSelect
          etiqueta="Nivel de ingreso"
          value={datos.nivelIngreso}
          onChange={cambiar('nivelIngreso')}
        >
          <option value="">Sin definir</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {n.charAt(0) + n.slice(1).toLowerCase()}
            </option>
          ))}
        </CampoSelect>
      </div>

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear alumno'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
