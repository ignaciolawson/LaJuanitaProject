import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  altaAlumno,
  cambiarEstadoAlumno,
  editarAlumno,
  listarAlumnos,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type {
  AlumnoResumen,
  Disciplina,
  EstadoAlumno,
  Nivel,
  NivelIngreso,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { usePuedeEscribir } from '../componentes/SoloLectura'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

const ESTADOS: EstadoAlumno[] = ['ACTIVO', 'INACTIVO', 'SUSPENDIDO']
const NIVELES: NivelIngreso[] = ['INICIAL', 'INTERMEDIO', 'AVANZADO']
const DISCIPLINAS: Disciplina[] = ['DJ', 'PRODUCCION', 'MENTORIA']

/**
 * Módulo 1 — el listado que reemplaza el Notion de Micaela.
 *
 * **Ojo con los dos "nivel" de esta pantalla, que no son el mismo.** El de la
 * columna es `alumno.nivel_ingreso`: con qué nivel entró la persona al estudio,
 * una vez, en su ficha. El del filtro es `inscripcion.nivel`: el nivel del curso
 * que está haciendo, que cambia con cada inscripción y puede ser distinto en DJ
 * y en producción. Por eso el filtro dice "nivel del curso" y no "nivel" a
 * secas.
 */
export function AlumnosPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoAlumno | ''>('')
  const [disciplina, setDisciplina] = useState<Disciplina | ''>('')
  const [nivelCurso, setNivelCurso] = useState<Nivel | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [editando, setEditando] = useState<AlumnoResumen | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarAlumnos({
        buscar,
        estado,
        disciplina,
        nivel: nivelCurso,
        pagina,
      })
      setAlumnos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, disciplina, nivelCurso, pagina])

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

  /** Todo filtro vuelve a la página 1, por el mismo motivo que la búsqueda. */
  function filtrar<T>(set: (valor: T) => void) {
    return (valor: T) => {
      set(valor)
      setPagina(0)
    }
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
      <CabeceraDePagina
        titulo="Alumnos"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'alumno' : 'alumnos'}`}</>}
        acciones={<>{/* DIRECTIVO lee todo y no escribe nada. Ofrecerle el alta terminaba en
            "No tenés permiso para hacer esto" después de completar el
            formulario. Quien autoriza sigue siendo el backend. */}
        {puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Nuevo alumno</Boton>}</>}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => cambiarBusqueda(e.target.value)}
          placeholder="Buscar por nombre, apellido o email…"
          className="min-w-64 flex-1 rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        />
        <select
          value={estado}
          onChange={(e) => filtrar(setEstado)(e.target.value as EstadoAlumno | '')}
          aria-label="Filtrar por estado"
          className="rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {e.charAt(0) + e.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {/* Los dos filtros que miran las inscripciones vigentes del alumno.
            Combinados exigen una MISMA inscripción: "DJ avanzado" no trae a
            quien hace DJ inicial y producción avanzada. */}
        <select
          value={disciplina}
          onChange={(e) => filtrar(setDisciplina)(e.target.value as Disciplina | '')}
          aria-label="Filtrar por disciplina"
          className="rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todas las disciplinas</option>
          {DISCIPLINAS.map((d) => (
            <option key={d} value={d}>
              {NOMBRE_DE_DISCIPLINA[d]}
            </option>
          ))}
        </select>
        <select
          value={nivelCurso}
          onChange={(e) => filtrar(setNivelCurso)(e.target.value as Nivel | '')}
          aria-label="Filtrar por nivel del curso"
          className="rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todos los niveles del curso</option>
          {NIVELES.map((n) => (
            <option key={n} value={n}>
              {n.charAt(0) + n.slice(1).toLowerCase()}
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

      <Tabla columnas={['Alumno', 'Contacto', 'Cursa', 'Nivel de ingreso', 'Estado', '']}>
            {alumnos.map((a) => (
              <tr key={a.idAlumno}>
                <Celda>
                  {/* El nombre es la puerta al perfil. Va en la fila entera y no
                      como una columna "Ver" al final: es donde la gente hace
                      clic sin que se lo digan. */}
                  <Link
                    to={`/admin/alumnos/${a.idAlumno}`}
                    className="font-medium underline-offset-2 transition-colors hover:text-acento hover:underline"
                  >
                    {a.apellido}, {a.nombre}
                  </Link>
                  {!a.usuarioActivo && (
                    <span className="ml-2 text-xs text-apagado">(cuenta desactivada)</span>
                  )}
                </Celda>
                <Celda className="text-tenue">
                  <div>{a.email}</div>
                  {a.telefono && <div className="text-xs">{a.telefono}</div>}
                </Celda>
                {/* Se muestra siempre, no solo al filtrar: una lista filtrada
                    que no dice de qué es cada fila obliga a confiar en que el
                    filtro hizo lo que dijo. */}
                <Celda className="text-tenue">
                  {a.disciplinas.length > 0
                    ? a.disciplinas.map((d) => NOMBRE_DE_DISCIPLINA[d]).join(', ')
                    : <span className="text-apagado">Nada vigente</span>}
                </Celda>
                <Celda className="text-tenue">{a.nivelIngreso ?? '—'}</Celda>
                <Celda>
                  <Etiqueta estado={a.estadoAlumno} />
                </Celda>
                <Celda>
                  {puedeEscribir && (
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <Boton variante="enlace"
                        type="button"
                        onClick={() => setEditando(a)}>
                        Editar
                      </Boton>
                      <select
                        value={a.estadoAlumno}
                        onChange={(e) => void cambiarEstado(a, e.target.value as EstadoAlumno)}
                        aria-label={`Cambiar estado de ${a.nombre} ${a.apellido}`}
                        className="rounded border border-linea bg-superficie px-2 py-1 text-xs outline-none focus:border-red"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {e.charAt(0) + e.slice(1).toLowerCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </Celda>
              </tr>
            ))}

            {!cargando && alumnos.length === 0 && (
              <FilaVacia columnas={6}>
                {buscar || estado || disciplina || nivelCurso
                    ? 'No hay alumnos que coincidan con la búsqueda.'
                    : 'Todavía no hay alumnos cargados.'}
              </FilaVacia>
            )}
          </Tabla>

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
    SUSPENDIDO: 'border-red/40 text-acento',
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
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-superficie p-5">
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
      <div className="mb-6 rounded-lg border border-linea bg-superficie p-5">
        <h3 className="font-semibold">Alumno creado</h3>
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          Pasale esta contraseña por WhatsApp. El sistema le va a pedir que la
          cambie cuando entre. <strong className="text-ink">No se puede volver a ver:</strong>{' '}
          si se pierde, hay que generar una nueva.
        </p>
        <p className="mt-3 rounded-md border border-linea bg-superficie-2 px-4 py-3 font-mono text-lg tracking-wider">
          {passwordTemporal}
        </p>
        <Boton className="mt-4" onClick={onCreado}>
          Listo
        </Boton>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-superficie p-5">
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
