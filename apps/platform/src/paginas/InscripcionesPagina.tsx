import { useCallback, useEffect, useState } from 'react'

import {
  altaInscripcion,
  cambiarEstadoInscripcion,
  editarInscripcion,
  listarInscripciones,
  listarProfesores,
  listarProgramas,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  esBajaDeNivel,
  type AlumnoResumen,
  type Disciplina,
  type EstadoInscripcion,
  type InscripcionResumen,
  type Moneda,
  type Nivel,
  type ProfesorResumen,
  type ProgramaResumen,
  MEDIOS_DE_PAGO,
  type MedioPago,
  NOMBRE_DE_MEDIO,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque } from '../componentes/Bloque'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { Filtros } from '../componentes/Filtros'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { NOMBRE_DE_DISCIPLINA, capitalizar, cuando } from '../componentes/presentacion'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { SelectorDeAlumno } from '../componentes/SelectorDeAlumno'

const DISCIPLINAS: Disciplina[] = ['DJ', 'PRODUCCION', 'MENTORIA']
const NIVELES: Nivel[] = ['INICIAL', 'INTERMEDIO', 'AVANZADO']
const ESTADOS: EstadoInscripcion[] = ['PREINSCRIPTA', 'ACTIVA', 'COMPLETADA', 'PAUSADA', 'CANCELADA']

/**
 * A qué estados se puede pasar desde cada uno, con el `<select>`.
 *
 * Es la escalera de `V30` §4 leída desde la pantalla, no una segunda copia de
 * la regla: la base rechaza igual lo que no esté acá. Lo que se gana es no
 * ofrecer lo que va a fallar. **A `PREINSCRIPTA` no se vuelve** (se entra sólo
 * al nacer), y **de `PREINSCRIPTA` a `ACTIVA` no se pasa desde acá**: eso lo
 * hace registrar la seña en Pagos, que la activa sola — un `<select>` que la
 * active a mano es exactamente lo que P59 vino a impedir.
 */
function estadosPosibles(desde: EstadoInscripcion): EstadoInscripcion[] {
  if (desde === 'PREINSCRIPTA') {
    return ['PREINSCRIPTA', 'CANCELADA']
  }
  return ESTADOS.filter((e) => e !== 'PREINSCRIPTA')
}

/**
 * Módulo 1 — el curso contratado de cada alumno.
 *
 * Es la pantalla que le faltaba al módulo: acá vive *"Juan compró el curso de DJ
 * inicial: 8 clases, $X, con Tomás"*, y sobre todo **cuántas clases le quedan**,
 * que es lo que el relevamiento marca como faltante hoy.
 *
 * Ese número no sale de una columna: el backend lo calcula contra las clases
 * efectivamente dictadas en cada lectura. Por eso la pantalla no lo guarda ni lo
 * recalcula por su cuenta — lo muestra.
 */
export function InscripcionesPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [inscripciones, setInscripciones] = useState<InscripcionResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [disciplina, setDisciplina] = useState<Disciplina | ''>('')
  const [estado, setEstado] = useState<EstadoInscripcion | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [editando, setEditando] = useState<InscripcionResumen | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarInscripciones({ buscar, disciplina, estado, pagina })
      setInscripciones(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, disciplina, estado, pagina])

  // Espera a que la persona deje de tipear antes de pedir, igual que en Alumnos.
  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  // Filtrar desde la página 3 devuelve vacío y parece que no hay resultados.
  function filtrar<T>(set: (valor: T) => void) {
    return (valor: T) => {
      set(valor)
      setPagina(0)
    }
  }

  async function cambiarEstado(inscripcion: InscripcionResumen, nuevo: EstadoInscripcion) {
    setError(null)
    try {
      await cambiarEstadoInscripcion(inscripcion.idInscripcion, nuevo)
      await cargar()
    } catch (e) {
      // El caso real: reactivar una inscripción vieja cuando el alumno ya tiene
      // otra activa de la misma disciplina. El backend lo rechaza con su propio
      // mensaje y hay que mostrarlo, no tragarlo.
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.'
      // Recargar ANTES de mostrar el error, no después: `cargar` arranca
      // limpiando el error, así que al revés se borra solo el mensaje que se
      // acaba de poner y el rechazo pasa desapercibido.
      await cargar()
      setError(mensaje)
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Inscripciones"
        aclaracion={<>{cargando
              ? 'Cargando…'
              : `${total} ${total === 1 ? 'inscripción' : 'inscripciones'}`}</>}
        acciones={<>{puedeEscribir && (
          <Boton onClick={() => setMostrandoAlta(true)}>Nueva inscripción</Boton>
        )}</>}
      />

      <AvisoSoloLectura />

      <Filtros>        <input
          type="search"
          value={buscar}
          onChange={(e) => filtrar(setBuscar)(e.target.value)}
          placeholder="Buscar por nombre, apellido o email del alumno…"
          className={CONTROL_DE_FILTRO}
        />
        <select
          value={disciplina}
          onChange={(e) => filtrar(setDisciplina)(e.target.value as Disciplina | '')}
          aria-label="Filtrar por disciplina"
          className={CONTROL_DE_FILTRO}
        >
          <option value="">Todas las disciplinas</option>
          {DISCIPLINAS.map((d) => (
            <option key={d} value={d}>
              {NOMBRE_DE_DISCIPLINA[d]}
            </option>
          ))}
        </select>
        <select
          value={estado}
          onChange={(e) => filtrar(setEstado)(e.target.value as EstadoInscripcion | '')}
          aria-label="Filtrar por estado"
          className={CONTROL_DE_FILTRO}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {capitalizar(e)}
            </option>
          ))}
        </select>
      </Filtros>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && (
        <FormularioAlta
          onCerrar={() => setMostrandoAlta(false)}
          onCreada={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {editando && (
        <FormularioEdicion
          inscripcion={editando}
          onCerrar={() => setEditando(null)}
          onGuardada={() => {
            setEditando(null)
            void cargar()
          }}
        />
      )}

      <Tabla columnas={['Alumno', 'Curso', 'Profesor', 'Clases', 'Precio', 'Estado', '']}>
            {inscripciones.map((i) => (
              <tr key={i.idInscripcion}>
                <Celda>
                  <div className="font-medium">
                    {i.apellido}, {i.nombre}
                  </div>
                  <div className="text-xs text-tenue">{i.email}</div>
                </Celda>
                <Celda>
                  <div>{NOMBRE_DE_DISCIPLINA[i.disciplina]}</div>
                  <div className="text-xs text-tenue">
                    {i.nivel ? capitalizar(i.nivel) : 'Sin nivel'}
                  </div>
                </Celda>
                {/* Sin profe asignado es un estado válido —se anota primero y se
                    decide después quién lo toma—, pero conviene que se note. */}
                <Celda className="text-tenue">
                  {i.profesor ?? <span className="text-apagado">Sin asignar</span>}
                </Celda>
                {/* El número por el que existe el módulo. Va como una sola
                    cadena y no partido en dos spans: "5" y "de 8" separados se
                    leen como dos datos distintos. */}
                <Celda className="whitespace-nowrap">
                  <div className="font-medium">{`${i.clasesRestantes} de ${i.clasesContratadas}`}</div>
                  <div className="text-xs text-tenue">clases restantes</div>
                </Celda>
                <Celda className="whitespace-nowrap text-tenue">
                  {precio(i.precioTotal, i.moneda)}
                </Celda>
                <Celda>
                  <Etiqueta estado={i.estado} />
                  <PlazoDeSenia inscripcion={i} />
                </Celda>
                <Celda>
                  {puedeEscribir && (
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <Boton variante="enlace"
                        type="button"
                        onClick={() => setEditando(i)}>
                        Editar
                      </Boton>
                      <select
                        value={i.estado}
                        onChange={(e) =>
                          void cambiarEstado(i, e.target.value as EstadoInscripcion)
                        }
                        aria-label={`Cambiar estado de la inscripción de ${i.nombre} ${i.apellido}`}
                        className={CONTROL_DE_FILTRO}
                      >
                        {estadosPosibles(i.estado).map((e) => (
                          <option key={e} value={e}>
                            {capitalizar(e)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </Celda>
              </tr>
            ))}

            {!cargando && inscripciones.length === 0 && (
              <FilaVacia columnas={7}>
                {buscar || disciplina || estado
                    ? 'No hay inscripciones que coincidan con la búsqueda.'
                    : 'Todavía no hay inscripciones cargadas.'}
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

/**
 * La preinscripta lleva el acento porque pide algo de quien mira — falta la
 * seña, y con plazo—; la cancelada lo lleva porque ya lo llevaba. Es la
 * regla del rojo como bisturí: lo que pide acción, no lo que describe.
 */
function Etiqueta({ estado }: { estado: EstadoInscripcion }) {
  const estilo = {
    PREINSCRIPTA: 'border-red/40 text-acento',
    ACTIVA: 'border-texto/20 text-texto',
    COMPLETADA: 'border-linea text-apagado',
    PAUSADA: 'border-linea text-apagado',
    CANCELADA: 'border-red/40 text-acento',
  }[estado]

  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${estilo}`}>
      {capitalizar(estado)}
    </span>
  )
}

/**
 * Hasta cuándo puede señarse (`V30`, P72: 24 hs). Sólo la preinscripta lo
 * tiene. Dice "venció" en vez de una fecha pasada porque lo que quien mira
 * necesita saber es si hay que llamar, no hacer la resta.
 */
function PlazoDeSenia({ inscripcion }: { inscripcion: InscripcionResumen }) {
  if (inscripcion.estado !== 'PREINSCRIPTA' || !inscripcion.vencePreinscripcion) {
    return null
  }
  const vence = new Date(inscripcion.vencePreinscripcion)
  const vencio = vence.getTime() < Date.now()
  return (
    <div className={`mt-0.5 text-xs ${vencio ? 'text-acento' : 'text-tenue'}`}>
      {vencio ? 'Venció el plazo para señar' : `Señar antes del ${cuando(inscripcion.vencePreinscripcion)}`}
    </div>
  )
}

function precio(monto: number, moneda: Moneda): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto)
}

/** Los campos del curso, compartidos por el alta y la edición. */
type CamposDelCurso = {
  idProfesor: string
  nivel: Nivel | ''
  clasesContratadas: string
  precioTotal: string
  moneda: Moneda
  cotizacionDolar: string
  fechaInicio: string
  notas: string
}

function CamposComunes({
  datos,
  cambiar,
  errores,
  profesores,
  ayudaClases,
}: {
  datos: CamposDelCurso
  cambiar: (campo: keyof CamposDelCurso) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  errores: Record<string, string>
  profesores: ProfesorResumen[]
  ayudaClases?: string
}) {
  return (
    <>
      <CampoSelect etiqueta="Nivel" value={datos.nivel} onChange={cambiar('nivel')} error={errores.nivel}>
        <option value="">Sin definir</option>
        {NIVELES.map((n) => (
          <option key={n} value={n}>
            {capitalizar(n)}
          </option>
        ))}
      </CampoSelect>

      {/* El profesor vive en la inscripción y no en el alumno: el mismo alumno
          puede tener un profe para DJ y otro para mentoría (P6). */}
      <CampoSelect
        etiqueta="Profesor"
        value={datos.idProfesor}
        onChange={cambiar('idProfesor')}
        error={errores.idProfesor}
      >
        <option value="">Sin asignar</option>
        {profesores.map((p) => (
          <option key={p.idProfesor} value={p.idProfesor}>
            {p.nombreCompleto}
          </option>
        ))}
      </CampoSelect>

      <Campo
        etiqueta="Clases contratadas"
        type="number"
        min={1}
        value={datos.clasesContratadas}
        onChange={cambiar('clasesContratadas')}
        error={errores.clasesContratadas}
        ayuda={ayudaClases}
      />

      <Campo
        etiqueta="Precio total"
        type="number"
        min={0}
        step="0.01"
        value={datos.precioTotal}
        onChange={cambiar('precioTotal')}
        error={errores.precioTotal}
        required
        ayuda="El curso se paga completo antes de empezar."
      />

      <CampoSelect etiqueta="Moneda" value={datos.moneda} onChange={cambiar('moneda')}>
        <option value="ARS">Pesos (ARS)</option>
        <option value="USD">Dólares (USD)</option>
      </CampoSelect>

      {/* Solo con la cotización del día un importe en dólares se puede
          reconstruir después. La base lo exige; acá se pide cuando corresponde
          en vez de mostrar un campo que casi siempre sobra. */}
      {datos.moneda === 'USD' && (
        <Campo
          etiqueta="Cotización del dólar"
          type="number"
          min={0}
          step="0.0001"
          value={datos.cotizacionDolar}
          onChange={cambiar('cotizacionDolar')}
          error={errores.cotizacionDolar}
          required
        />
      )}

      <Campo
        etiqueta="Fecha de inicio"
        type="date"
        value={datos.fechaInicio}
        onChange={cambiar('fechaInicio')}
        error={errores.fechaInicio}
        ayuda="Se puede dejar vacía y acordarla después."
      />

      <Campo
        etiqueta="Notas"
        value={datos.notas}
        onChange={cambiar('notas')}
        error={errores.notas}
        className="sm:col-span-2"
      />
    </>
  )
}

/** Carga los profesores una vez, para los dos formularios. */
function useProfesores() {
  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])

  useEffect(() => {
    listarProfesores()
      .then(setProfesores)
      // Que no haya profesores no puede impedir cargar la inscripción: el campo
      // es opcional y se asigna después.
      .catch(() => setProfesores([]))
  }, [])

  return profesores
}

/**
 * El catálogo (`V28`): cuántas clases trae cada disciplina y a cuánto. Sale del
 * servidor y no de una constante, para que el 8 de DJ viva en UN lugar — el que
 * Mica edita en `/admin/programas`.
 *
 * Si no carga, el formulario sigue funcionando sin prellenar nada: la regla la
 * aplica el backend igual, y un catálogo caído no puede impedir inscribir.
 */
function useProgramas() {
  const [programas, setProgramas] = useState<ProgramaResumen[]>([])

  useEffect(() => {
    listarProgramas()
      .then(setProgramas)
      .catch(() => setProgramas([]))
  }, [])

  return programas
}

function FormularioAlta({ onCerrar, onCreada }: { onCerrar: () => void; onCreada: () => void }) {
  const profesores = useProfesores()
  const programas = useProgramas()
  const [alumno, setAlumno] = useState<AlumnoResumen | null>(null)
  const [disciplina, setDisciplina] = useState<Disciplina | ''>('')
  const [datos, setDatos] = useState<CamposDelCurso>({
    idProfesor: '',
    nivel: '',
    clasesContratadas: '',
    precioTotal: '',
    moneda: 'ARS',
    cotizacionDolar: '',
    fechaInicio: '',
    notas: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  /**
   * La seña (P59, `V30`). **Apagada por defecto, y lo que eso significa se dice
   * en la pantalla**: sin seña la inscripción nace preinscripta con 24 hs para
   * pagarla, no "sin plata". El monto se prellena con el 50% del precio y se
   * edita: la base sostiene que haya plata cobrada, no que sea la mitad.
   */
  const [conSena, setConSena] = useState(false)
  const [sena, setSena] = useState({ monto: '', medioPago: 'EFECTIVO' as MedioPago })

  function cambiarSena(campo: 'monto' | 'medioPago') {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setSena((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  /**
   * Al elegir disciplina se completan las clases de fábrica y el precio, desde
   * el catálogo (P63). Es una sugerencia visible, no una regla — quien aplica la
   * cantidad cuando el campo va vacío es el backend, así que un alta por la API
   * tiene la misma cuenta que una por pantalla. **El precio sí queda en la
   * inscripción**: el catálogo dice cuánto sale hoy y esto guarda cuánto se
   * acordó ese día (P63). Sin precio en el catálogo ("a confirmar"), el campo
   * queda vacío y lo tipea quien inscribe, como antes.
   */
  function elegirDisciplina(nueva: Disciplina | '') {
    setDisciplina(nueva)
    const programa = nueva === '' ? undefined : programas.find((p) => p.disciplina === nueva)
    setDatos((previo) => ({
      ...previo,
      clasesContratadas: programa?.clasesEstandar ? String(programa.clasesEstandar) : '',
      precioTotal: programa?.precio != null ? String(programa.precio) : '',
      moneda: programa?.moneda ?? previo.moneda,
    }))
    // Y la seña sugerida: el 50% de ese precio.
    setSena((previo) => ({
      ...previo,
      monto: programa?.precio != null ? String(programa.precio / 2) : '',
    }))
  }

  function cambiar(campo: keyof CamposDelCurso) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales = validar(alumno, disciplina, datos, programas)
    if (conSena && (!sena.monto || Number(sena.monto) <= 0)) {
      locales.senaMonto = 'Poné el monto de la seña.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await altaInscripcion({
        idAlumno: alumno!.idAlumno,
        idProfesor: datos.idProfesor ? Number(datos.idProfesor) : undefined,
        disciplina: disciplina as Disciplina,
        nivel: datos.nivel || undefined,
        clasesContratadas: datos.clasesContratadas ? Number(datos.clasesContratadas) : undefined,
        precioTotal: Number(datos.precioTotal),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : undefined,
        fechaInicio: datos.fechaInicio || undefined,
        notas: datos.notas || undefined,
        sena: conSena
          ? {
              monto: Number(sena.monto),
              moneda: datos.moneda,
              cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : null,
              medioPago: sena.medioPago,
            }
          : undefined,
      })
      onCreada()
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
    <Bloque titulo="Nueva inscripción" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-4">
          <SelectorDeAlumno elegido={alumno} onElegir={setAlumno} error={errores.idAlumno} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Disciplina"
            value={disciplina}
            onChange={(e) => elegirDisciplina(e.target.value as Disciplina | '')}
            error={errores.disciplina}
          >
            <option value="">Elegí una</option>
            {/* Un programa desactivado no se ofrece (el backend lo rechaza igual).
                Sin catálogo cargado se ofrecen las tres, como siempre. */}
            {DISCIPLINAS.filter(
              (d) => programas.length === 0 || programas.some((p) => p.disciplina === d && p.activo),
            ).map((d) => (
              <option key={d} value={d}>
                {NOMBRE_DE_DISCIPLINA[d]}
              </option>
            ))}
          </CampoSelect>

          <CamposComunes
            datos={datos}
            cambiar={cambiar}
            errores={errores}
            profesores={profesores}
            ayudaClases={ayudaDeClases(disciplina, programas)}
          />

          {/* La seña (P59). Lo que significa no marcarla se dice al lado: una
              preinscripción no es "sin plata", es "con 24 hs para pagar". */}
          <label className="flex items-start gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={conSena}
              onChange={(e) => setConSena(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">
              <span className="font-medium">La seña entró ahora</span>
              <span className="block text-xs text-tenue">
                {conSena
                  ? 'La inscripción nace activa y el pago queda registrado como seña.'
                  : 'Sin seña queda preinscripta: la persona tiene 24 horas para pagarla y figura en Deudores como “sin señar”.'}
              </span>
            </span>
          </label>

          {conSena && (
            <>
              <Campo
                etiqueta="Monto de la seña"
                type="number"
                step="0.01"
                value={sena.monto}
                onChange={cambiarSena('monto')}
                error={errores.senaMonto}
                ayuda="El 50% del precio, por defecto."
              />
              <CampoSelect
                etiqueta="Cómo pagó"
                value={sena.medioPago}
                onChange={cambiarSena('medioPago')}
              >
                {MEDIOS_DE_PAGO.map((m) => (
                  <option key={m} value={m}>
                    {NOMBRE_DE_MEDIO[m]}
                  </option>
                ))}
              </CampoSelect>
            </>
          )}
        </div>

        {errorGeneral && (
          <div className="mt-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Creando…' : conSena ? 'Crear inscripción' : 'Preinscribir'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
          </form>
    </Bloque>
  )
}

function ayudaDeClases(
  disciplina: Disciplina | '',
  programas: ProgramaResumen[],
): string | undefined {
  if (disciplina === '') return undefined

  const programa = programas.find((p) => p.disciplina === disciplina)
  if (!programa) return undefined

  if (programa.clasesEstandar === null) {
    return `${programa.nombre} se arma a medida: no hay una cantidad estándar.`
  }
  const duracion = `${Math.floor(programa.duracionMinutos / 60)}:${String(programa.duracionMinutos % 60).padStart(2, '0')}`
  return `${programa.nombre} son ${programa.clasesEstandar} clases de ${duracion}.`
}

/**
 * Lo que el formulario tiene que resolver antes de enviar.
 *
 * **No duplica las reglas del backend, las anticipa.** Los tres casos de acá
 * vuelven igual como 400 si se saltean —el precio y la disciplina por Bean
 * Validation, la mentoría por `InscripcionService`—; pedirlos antes evita un ida
 * y vuelta que termina en un cartel rojo sobre un formulario ya completo.
 */
function validar(
  alumno: AlumnoResumen | null,
  disciplina: Disciplina | '',
  datos: CamposDelCurso,
  programas: ProgramaResumen[],
): Record<string, string> {
  const errores: Record<string, string> = {}

  if (!alumno) errores.idAlumno = 'Elegí a qué alumno se inscribe.'
  if (!disciplina) errores.disciplina = 'Elegí la disciplina.'
  if (datos.precioTotal === '') errores.precioTotal = 'Poné el precio total del curso.'

  // El único caso donde el backend NO puede completar el número por su cuenta:
  // un programa sin estándar en el catálogo (hoy, la mentoría). Lo dice el
  // catálogo y no el nombre de la disciplina, por lo mismo que el 8 de DJ ya no
  // vive acá. Sin catálogo cargado se manda y el backend contesta.
  const programa = programas.find((p) => p.disciplina === disciplina)
  if (programa && programa.clasesEstandar === null && datos.clasesContratadas === '') {
    errores.clasesContratadas = `${programa.nombre} se arma a medida: decí cuántas clases son.`
  }

  return errores
}

/**
 * Edición.
 *
 * Sin alumno ni disciplina: cambiar cualquiera de los dos no es corregir esta
 * inscripción, es otra. El backend tampoco los acepta.
 */
function FormularioEdicion({
  inscripcion,
  onCerrar,
  onGuardada,
}: {
  inscripcion: InscripcionResumen
  onCerrar: () => void
  onGuardada: () => void
}) {
  const profesores = useProfesores()
  const [datos, setDatos] = useState<CamposDelCurso>({
    idProfesor: inscripcion.idProfesor ? String(inscripcion.idProfesor) : '',
    nivel: inscripcion.nivel ?? '',
    clasesContratadas: String(inscripcion.clasesContratadas),
    precioTotal: String(inscripcion.precioTotal),
    moneda: inscripcion.moneda,
    cotizacionDolar: inscripcion.cotizacionDolar ? String(inscripcion.cotizacionDolar) : '',
    fechaInicio: inscripcion.fechaInicio ?? '',
    notas: inscripcion.notas ?? '',
  })
  const [motivoBajaNivel, setMotivoBajaNivel] = useState('')
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  const baja = esBajaDeNivel(inscripcion.nivel, datos.nivel)

  function cambiar(campo: keyof CamposDelCurso) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (datos.precioTotal === '') locales.precioTotal = 'Poné el precio total del curso.'
    if (datos.clasesContratadas === '') locales.clasesContratadas = 'Poné la cantidad de clases.'
    if (baja && motivoBajaNivel.trim() === '') {
      locales.motivoBajaNivel = 'Bajar el nivel queda firmado: escribí el motivo.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await editarInscripcion(inscripcion.idInscripcion, {
        idProfesor: datos.idProfesor ? Number(datos.idProfesor) : null,
        nivel: datos.nivel || undefined,
        clasesContratadas: Number(datos.clasesContratadas),
        precioTotal: Number(datos.precioTotal),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : undefined,
        fechaInicio: datos.fechaInicio || undefined,
        notas: datos.notas || undefined,
        motivoBajaNivel: baja ? motivoBajaNivel : undefined,
      })
      onGuardada()
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
    <Bloque titulo={<>Editar {NOMBRE_DE_DISCIPLINA[inscripcion.disciplina]} de {inscripcion.nombre}{' '} {inscripcion.apellido}</>} className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        <p className="mb-4 text-xs text-apagado">
          El alumno y la disciplina no se editan: cambiarlos no es corregir esta
          inscripción, es otra. Lleva {inscripcion.clasesConsumidas} de{' '}
          {inscripcion.clasesContratadas} clases dadas.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <CamposComunes
            datos={datos}
            cambiar={cambiar}
            errores={errores}
            profesores={profesores}
            ayudaClases="Ampliar el curso es subir este número."
          />
        </div>

        {/* Bajar el nivel es decirle a alguien "no estás para intermedio". La base
            exige quién, cuándo y por qué; el quién y el cuándo los pone el
            servidor, así que acá solo se pide el motivo. */}
        {baja && (
          <div className="mt-4 rounded-md border border-red/30 bg-red/5 p-4">
            <p className="mb-3 text-sm text-acento">
              Estás bajando el nivel de {capitalizar(inscripcion.nivel!)} a{' '}
              {capitalizar(datos.nivel as string)}. Queda registrado con tu nombre y la
              fecha.
            </p>
            <Campo
              etiqueta="Motivo"
              value={motivoBajaNivel}
              onChange={(e) => setMotivoBajaNivel(e.target.value)}
              error={errores.motivoBajaNivel}
              required
            />
          </div>
        )}

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
    </Bloque>
  )
}
