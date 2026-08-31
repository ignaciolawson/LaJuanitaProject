import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  adjuntarComprobante,
  agenda,
  agregarParticipante,
  altaReserva,
  cambiarAsistencia,
  cambiarEstadoReserva,
  editarReserva,
  listarAlumnos,
  listarInscripciones,
  listarProfesores,
  listarSalas,
  listarTiposUso,
  listarUsuarios,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  HORA_APERTURA,
  NOMBRE_DE_MEDIO,
  type AlumnoResumen,
  type EstadoAsistencia,
  type InscripcionResumen,
  type MedioPago,
  type Moneda,
  type ProfesorResumen,
  type ReservaResumen,
  type SalaResumen,
  type TipoUsoResumen,
  type UsuarioResumen,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'
import {
  diaYMes,
  diasDesde,
  filasDeHoras,
  hhmm,
  horaDe,
  hoy,
  lunesDe,
  ocupaLaHora,
  rangoLegible,
  sumarDias,
} from '../componentes/semana'
import { usePuedeEscribir } from '../componentes/SoloLectura'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/** Los mismos que ofrece `/admin/pagos`. Espejan el CHECK `pago_medio_valido`. */
const MEDIOS_DE_PAGO: MedioPago[] = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'PAYPAL',
  'CUENTA_EEUU',
  'OTRO',
]

const ASISTENCIAS: EstadoAsistencia[] = [
  'PENDIENTE',
  'PRESENTE',
  'AUSENTE',
  'AUSENTE_JUSTIFICADO',
  'CANCELADA',
]

/**
 * El hueco al que apunta el alta: día, hora y —si la celda tenía una sola sala
 * libre— cuál. La sala viaja para no ofrecer un formulario que la base va a
 * rechazar, igual que hace `permitidos` con la matriz de §2.6.
 */
type Franja = { fecha: string; hora: number; idSala?: number }

/**
 * Módulo 2 — el calendario semanal. La pantalla que resuelve el problema que el
 * relevamiento marca como más caro: que un cambio de sala se sepa tarde.
 *
 * <p><b>Días en columnas y horas en filas, no salas en columnas.</b> El alcance
 * pide lo segundo, y con tres salas entraría — pero entonces la vista es de un
 * día, y lo que hay que ver para no pisarse es la semana. La sala va adentro de
 * cada bloque, y el filtro de arriba da la vista "la semana de la Sala 1", que es
 * lo que la versión por columnas ofrecía. Si alguna vez son diez salas, esta
 * decisión se da vuelta.
 *
 * <p>El horario del estudio es 10 a 18 (§13), así que son ocho filas y no
 * veinticuatro — pero <b>una reserva fuera de horario se dibuja igual</b>. Una
 * reserva que existe y no aparece es el peor error posible acá: nadie lo
 * reporta, simplemente dos personas terminan en la misma sala.
 */
export function CalendarioPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [lunes, setLunes] = useState(() => lunesDe(hoy()))
  const [idSala, setIdSala] = useState<number | ''>('')
  const [incluirCanceladas, setIncluirCanceladas] = useState(false)

  const [reservas, setReservas] = useState<ReservaResumen[]>([])
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [tipos, setTipos] = useState<TipoUsoResumen[]>([])
  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [elegida, setElegida] = useState<ReservaResumen | null>(null)
  const [nueva, setNueva] = useState<Franja | null>(null)
  const [editando, setEditando] = useState<ReservaResumen | null>(null)

  const dias = useMemo(() => diasDesde(lunes), [lunes])

  // El catálogo no cambia de una semana a otra: se pide una vez.
  useEffect(() => {
    Promise.all([listarSalas(), listarTiposUso(), listarProfesores()])
      .then(([s, t, p]) => {
        setSalas(s)
        setTipos(t)
        setProfesores(p)
      })
      .catch(() => setError('No se pudo cargar el catálogo de salas.'))
  }, [])

  /**
   * La semana que se está mirando, con los filtros puestos.
   *
   * Vive en un solo lugar porque **la piden tres cosas distintas** —la carga
   * inicial, tomar lista y anotar a alguien— y cada copia de estos cuatro
   * parámetros es una que se olvida de `incluirCanceladas` el día que alguien
   * agregue un filtro.
   */
  const traerAgenda = useCallback(
    () =>
      agenda({
        desde: dias[0],
        hasta: dias[6],
        idSala: idSala === '' ? undefined : idSala,
        incluirCanceladas,
      }),
    [dias, idSala, incluirCanceladas],
  )

  /**
   * Refresca la agenda **y el detalle que esté abierto**, con un solo pedido.
   *
   * `elegida` es su propio estado con una copia de la reserva, así que sin esto el
   * panel abierto sigue mostrando la lista de participantes vieja: se anota a
   * alguien y no aparece, que se lee como que no entró.
   *
   * Si la reserva ya no está en lo que vuelve —se canceló, o cambió el filtro— el
   * detalle se cierra en vez de quedar mostrando algo que ya no existe.
   */
  const refrescar = useCallback(async () => {
    const refrescadas = await traerAgenda()
    setReservas(refrescadas)
    setElegida((previa) => refrescadas.find((r) => r.idReserva === previa?.idReserva) ?? null)
  }, [traerAgenda])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setReservas(await traerAgenda())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el calendario.')
    } finally {
      setCargando(false)
    }
  }, [traerAgenda])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const horas = useMemo(() => filasDeHoras(reservas), [reservas])

  // Con el filtro puesto, la vista es "la semana de la Sala 1" y el hueco libre
  // que importa es el de esa sala. Sin filtro, cualquiera de las activas sirve.
  const salasActivas = useMemo(
    () => salas.filter((s) => s.activa && (idSala === '' || s.idSala === idSala)),
    [salas, idSala],
  )

  function mover(semanas: number) {
    setLunes(sumarDias(lunes, semanas * 7))
    setElegida(null)
    setNueva(null)
  }

  async function cancelar(reserva: ReservaResumen) {
    try {
      await cambiarEstadoReserva(reserva.idReserva, 'CANCELADA')
      setElegida(null)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo cancelar.'
      await cargar()
      setError(mensaje)
    }
  }

  async function marcarAsistencia(idParticipacion: number, estado: EstadoAsistencia) {
    try {
      await cambiarAsistencia(idParticipacion, estado)
      await refrescar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo tomar lista.')
    }
  }

  /** Anotar a alguien refresca lo mismo que tomar lista, y por lo mismo. */
  async function refrescarTrasAnotar() {
    try {
      await refrescar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo actualizar el calendario.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Calendario"
        aclaracion={cargando ? 'Cargando…' : rangoLegible(dias)}
        acciones={<>{puedeEscribir && (
          <Boton
            onClick={() =>
              setNueva({
                // El lunes de una semana que ya empezó es una fecha rara para
                // proponer; si hoy está a la vista, hoy.
                fecha: dias.includes(hoy()) ? hoy() : dias[0],
                hora: HORA_APERTURA,
                idSala: idSala === '' ? undefined : idSala,
              })
            }
          >
            Nueva reserva
          </Boton>
        )}</>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => mover(-1)}>
            ← Semana anterior
          </Boton>
          <Boton variante="secundario" onClick={() => setLunes(lunesDe(hoy()))}>
            Hoy
          </Boton>
          <Boton variante="secundario" onClick={() => mover(1)}>
            Semana siguiente →
          </Boton>
        </div>

        <select
          value={idSala}
          onChange={(e) => setIdSala(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label="Filtrar por sala"
          className="rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todas las salas</option>
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-tenue">
          <input
            type="checkbox"
            checked={incluirCanceladas}
            onChange={(e) => setIncluirCanceladas(e.target.checked)}
          />
          Ver canceladas
        </label>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {nueva && puedeEscribir && (
        <FormularioReserva
          // El `key` es la corrección, no un detalle de React: sin él el
          // formulario ya montado se queda con la franja del primer clic, y
          // clickear otra celda no cambia nada en pantalla. Guardar volvía a
          // apuntar al hueco viejo y la base rechazaba por solapamiento — que
          // desde afuera se lee como "no deja cargar más de una reserva".
          key={`${nueva.fecha}-${nueva.hora}-${nueva.idSala ?? ''}`}
          salas={salas}
          tipos={tipos}
          profesores={profesores}
          inicial={nueva}
          onCerrar={() => setNueva(null)}
          onGuardada={() => {
            setNueva(null)
            void cargar()
          }}
        />
      )}

      {editando && puedeEscribir && (
        <FormularioReserva
          // Por lo mismo que el de arriba: elegir otra reserva y darle "Mover"
          // con el formulario abierto dejaba en pantalla los datos de la primera.
          key={editando.idReserva}
          salas={salas}
          tipos={tipos}
          profesores={profesores}
          reserva={editando}
          onCerrar={() => setEditando(null)}
          onGuardada={() => {
            setEditando(null)
            setElegida(null)
            void cargar()
          }}
        />
      )}

      {elegida && (
        <Detalle
          reserva={elegida}
          puedeEscribir={puedeEscribir}
          onCerrar={() => setElegida(null)}
          onEditar={() => setEditando(elegida)}
          onCancelar={() => void cancelar(elegida)}
          onAsistencia={marcarAsistencia}
          onAnotado={() => void refrescarTrasAnotar()}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
        <div className="min-w-3xl">
          {/* Encabezado de días */}
          <div className="grid border-b border-linea" style={{ gridTemplateColumns: COLUMNAS }}>
            <div className="px-2 py-2" />
            {dias.map((dia, i) => (
              <div
                key={dia}
                className={`px-2 py-2 text-center text-xs uppercase tracking-wider ${
                  dia === hoy() ? 'font-semibold text-acento' : 'text-tenue'
                }`}
              >
                <div>{DIAS[i]}</div>
                <div className="text-[11px] normal-case">{diaYMes(dia)}</div>
              </div>
            ))}
          </div>

          {horas.map((hora) => (
            <div
              key={hora}
              className="grid border-b border-linea last:border-b-0"
              style={{ gridTemplateColumns: COLUMNAS }}
            >
              <div className="px-2 py-2 text-right text-xs text-tenue">
                {String(hora).padStart(2, '0')}:00
              </div>

              {dias.map((dia) => {
                // Ocupan la celda, no "empiezan en" la celda: una clase de 1:30
                // se come dos filas y la segunda no puede parecer libre.
                const ocupan = reservas.filter((r) => r.fecha === dia && ocupaLaHora(r, hora))
                const empiezan = ocupan.filter((r) => horaDe(r.horaInicio) === hora)
                const vienen = ocupan.filter((r) => horaDe(r.horaInicio) !== hora)

                // Una celda ocupada NO es una celda llena: son tres salas. Lo
                // que la cierra es que no quede ninguna libre a esa hora.
                const libres = salasActivas.filter(
                  (s) => !ocupan.some((r) => r.idSala === s.idSala && !cayo(r)),
                )
                const sePuedeCargar = puedeEscribir && libres.length > 0

                return (
                  <div key={dia + hora} className="flex min-h-14 flex-col border-l border-linea p-1">
                    {empiezan.map((r) => (
                      <Bloque key={r.idReserva} reserva={r} onElegir={() => setElegida(r)} />
                    ))}
                    {vienen.map((r) => (
                      <Continuacion key={r.idReserva} reserva={r} onElegir={() => setElegida(r)} />
                    ))}

                    {/* El hueco: abre el alta con esa fecha y esa hora puestas.
                        Es la diferencia entre cargar una clase en dos clics o en
                        ocho campos. Va como <button> y no como un onClick sobre
                        la celda porque también hay que poder llegar con el
                        teclado, y porque una celda ya ocupada por una sala sigue
                        teniendo hueco en las otras dos. */}
                    {sePuedeCargar && (
                      <button
                        type="button"
                        onClick={() =>
                          setNueva({
                            fecha: dia,
                            hora,
                            idSala: libres.length === 1 ? libres[0].idSala : undefined,
                          })
                        }
                        aria-label={`Cargar reserva el ${diaYMes(dia)} a las ${String(hora).padStart(2, '0')}:00`}
                        className="min-h-6 flex-1 rounded text-left text-[11px] text-transparent transition-colors hover:bg-superficie-2 hover:text-apagado focus:bg-superficie-2 focus:text-apagado focus:outline-none"
                      >
                        + reservar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {!cargando && reservas.length === 0 && (
        <p className="mt-4 text-center text-sm text-tenue">
          No hay nada reservado esta semana.
        </p>
      )}
    </div>
  )
}

const COLUMNAS = '4rem repeat(7, minmax(0, 1fr))'

/**
 * La DEFINICIÓN CANÓNICA de `V1`, del lado del front: estos dos estados no
 * ocupan la sala. Una cancelada se dibuja (con "Ver canceladas") pero no impide
 * cargar otra cosa encima, que es exactamente lo que hace el EXCLUDE.
 */
function cayo(reserva: ReservaResumen): boolean {
  return reserva.estado === 'CANCELADA' || reserva.estado === 'REPROGRAMADA'
}

/** Un bloque del calendario. El color lo manda el backend desde `tipo_uso`. */
function Bloque({ reserva, onElegir }: { reserva: ReservaResumen; onElegir: () => void }) {
  const caida = cayo(reserva)

  return (
    <button
      type="button"
      onClick={onElegir}
      style={{ borderLeftColor: reserva.color ?? '#999' }}
      className={`mb-1 block w-full border-l-4 bg-superficie-2 px-1.5 py-1 text-left text-[11px] leading-tight transition-colors hover:bg-superficie-2 ${
        caida ? 'opacity-50 line-through' : ''
      }`}
    >
      <div className="font-medium">
        {hhmm(reserva.horaInicio)}–{hhmm(reserva.horaFin)}
      </div>
      <div className="truncate text-tenue">{reserva.sala}</div>
      <div className="truncate text-apagado">{reserva.tipoUso}</div>
    </button>
  )
}

/**
 * La misma reserva, vista desde una fila que no es la suya: la clase de 10:00 a
 * 11:30 sigue ocupando la sala a las 11. Se dibuja apagada y sin repetir el
 * horario para que no se lea como una segunda reserva, pero se dibuja — que la
 * fila 11 pareciera vacía era lo que hacía ofrecer una franja ya tomada.
 */
function Continuacion({ reserva, onElegir }: { reserva: ReservaResumen; onElegir: () => void }) {
  return (
    <button
      type="button"
      onClick={onElegir}
      style={{ borderLeftColor: reserva.color ?? '#999' }}
      title={`${reserva.tipoUso} · ${reserva.sala} · sigue desde ${hhmm(reserva.horaInicio)}`}
      className={`mb-1 block w-full border-l-4 border-dashed bg-superficie-2/50 px-1.5 py-0.5 text-left text-[10px] leading-tight text-apagado transition-colors hover:bg-superficie-2 ${
        cayo(reserva) ? 'opacity-50 line-through' : ''
      }`}
    >
      <span className="truncate">↳ {reserva.sala} · sigue</span>
    </button>
  )
}

function Detalle({
  reserva,
  puedeEscribir,
  onCerrar,
  onEditar,
  onCancelar,
  onAsistencia,
  onAnotado,
}: {
  reserva: ReservaResumen
  puedeEscribir: boolean
  onCerrar: () => void
  onEditar: () => void
  onCancelar: () => void
  onAsistencia: (idParticipacion: number, estado: EstadoAsistencia) => void
  onAnotado: () => void
}) {
  return (
    <div className="mb-6 rounded-lg border border-linea bg-superficie p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">
            {reserva.tipoUso} · {reserva.sala}
          </h3>
          <p className="mt-1 text-sm text-tenue">
            {diaYMes(reserva.fecha)} · {hhmm(reserva.horaInicio)}–{hhmm(reserva.horaFin)} ·{' '}
            {capitalizar(reserva.estado)}
          </p>
          <p className="text-sm text-tenue">
            {reserva.profesor ?? <span className="text-apagado">Sin profesor asignado</span>}
          </p>
          {reserva.notas && <p className="mt-2 text-sm">{reserva.notas}</p>}
        </div>
        <Boton variante="enlace"
          type="button"
          onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>

      <h4 className="mb-2 t-mono text-tenue">
        Quiénes vienen ({reserva.participantes.length})
      </h4>

      {reserva.participantes.length === 0 ? (
        <p className="text-sm text-apagado">Todavía no hay nadie anotado.</p>
      ) : (
        <ul className="space-y-2">
          {reserva.participantes.map((p) => (
            <li key={p.idParticipacion} className="flex items-center justify-between gap-3 text-sm">
              <span>
                {p.apellido}, {p.nombre}
                {/* Sin inscripción, la clase no le descuenta nada del curso. */}
                {p.idInscripcion === null && (
                  <span className="ml-2 text-xs text-apagado">(no descuenta clases)</span>
                )}
              </span>
              {puedeEscribir && (
                <select
                  value={p.estadoAsistencia}
                  onChange={(e) => onAsistencia(p.idParticipacion, e.target.value as EstadoAsistencia)}
                  aria-label={`Asistencia de ${p.nombre} ${p.apellido}`}
                  className="rounded border border-linea bg-superficie px-2 py-1 text-xs outline-none focus:border-red"
                >
                  {ASISTENCIAS.map((a) => (
                    <option key={a} value={a}>
                      {capitalizar(a.replace('_', ' '))}
                    </option>
                  ))}
                </select>
              )}
            </li>
          ))}
        </ul>
      )}

      {puedeEscribir && reserva.estado !== 'CANCELADA' && (
        <FormularioParticipante reserva={reserva} onAnotado={onAnotado} />
      )}

      {puedeEscribir && reserva.estado !== 'CANCELADA' && (
        <div className="mt-5 flex gap-3">
          <Boton variante="secundario" onClick={onEditar}>
            Mover
          </Boton>
          <Boton variante="secundario" onClick={onCancelar}>
            Cancelar la reserva
          </Boton>
        </div>
      )}
    </div>
  )
}

/**
 * Elegir a quién anotar y contra qué curso: el alumno, sus inscripciones
 * vigentes, y la que se descuenta.
 *
 * **Está acá afuera porque ahora lo usan dos formularios**: el alta de la clase,
 * que los manda en el mismo pedido que la reserva (paso 2 de la seña), y el
 * "anotar a alguien" del detalle, para quien se suma después. Duplicarlo serían
 * dos lugares donde arreglar la carga de cursos.
 *
 * `activo` es lo que dispara la carga del listado de alumnos, y por eso es un
 * parámetro y no un `useEffect` suelto: son ~80 alumnos que no hacen falta hasta
 * que el formulario esté abierto, ni nunca si lo que se carga es un alquiler.
 */
function useParticipante(activo: boolean) {
  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([])
  const [cursos, setCursos] = useState<InscripcionResumen[]>([])
  const [idAlumno, setIdAlumno] = useState('')
  const [idInscripcion, setIdInscripcion] = useState('')
  const [errorDeCarga, setErrorDeCarga] = useState<string | null>(null)

  useEffect(() => {
    if (!activo) return
    listarAlumnos({ pagina: 0 })
      .then((r) => setAlumnos(r.contenido))
      .catch(() => setErrorDeCarga('No se pudo cargar el listado de alumnos.'))
  }, [activo])

  // Solo las vigentes: anotar una clase contra un curso terminado no descuenta
  // nada real, y ofrecerlo es ofrecer un error de carga.
  useEffect(() => {
    if (!idAlumno) {
      setCursos([])
      setIdInscripcion('')
      return
    }
    listarInscripciones({ idAlumno: Number(idAlumno), estado: 'ACTIVA' })
      .then((r) => {
        setCursos(r.contenido)
        // Con un solo curso no hay nada que elegir.
        setIdInscripcion(r.contenido.length === 1 ? String(r.contenido[0].idInscripcion) : '')
      })
      .catch(() => setErrorDeCarga('No se pudieron cargar las inscripciones.'))
  }, [idAlumno])

  const alumno = alumnos.find((a) => String(a.idAlumno) === idAlumno)

  return {
    alumnos,
    cursos,
    idAlumno,
    setIdAlumno,
    idInscripcion,
    setIdInscripcion,
    errorDeCarga,
    limpiar() {
      setIdAlumno('')
      setIdInscripcion('')
    },
    /** Listo para el cuerpo del pedido, o null si todavía no eligió a nadie. */
    elegido: alumno
      ? {
          idUsuario: alumno.idUsuario,
          idInscripcion: idInscripcion ? Number(idInscripcion) : null,
        }
      : null,
  }
}

/**
 * Los dos selects, sueltos: los dos formularios que los usan tienen su propia
 * grilla de dos columnas, así que esto es un fragmento y no un bloque.
 */
function CamposDeParticipante({
  selector,
  error,
}: {
  selector: ReturnType<typeof useParticipante>
  error?: string
}) {
  return (
    <>
      <CampoSelect
        etiqueta="Quién"
        value={selector.idAlumno}
        onChange={(e) => selector.setIdAlumno(e.target.value)}
        error={error}
      >
        <option value="">Elegí un alumno</option>
        {selector.alumnos.map((a) => (
          <option key={a.idAlumno} value={a.idAlumno}>
            {a.apellido}, {a.nombre}
          </option>
        ))}
      </CampoSelect>

      <CampoSelect
        etiqueta="Descuenta de"
        value={selector.idInscripcion}
        onChange={(e) => selector.setIdInscripcion(e.target.value)}
      >
        {/* El vacío es una opción válida y no un "elegí algo": una clase que
            no descuenta de ningún curso es el alquiler de cabina. */}
        <option value="">No descuenta clases</option>
        {selector.cursos.map((i) => (
          <option key={i.idInscripcion} value={i.idInscripcion}>
            {NOMBRE_DE_DISCIPLINA[i.disciplina]} — le quedan {i.clasesRestantes}
          </option>
        ))}
      </CampoSelect>
    </>
  )
}

/**
 * Anotar a alguien en una clase **que ya existe**.
 *
 * <p><b>Es la pieza que le faltaba al Módulo 2</b>, y sin ella el resto del
 * módulo no servía de nada: el backend expone el endpoint desde el 2026-08-16,
 * pero ninguna pantalla lo usaba — no se podía tomar lista, las clases restantes
 * nunca bajaban, y el historial del alumno quedaba vacío para siempre.
 *
 * <p><b>Sigue existiendo aunque el alta ahora cargue su alumno</b> (2026-08-17):
 * un alumno que se suma a una clase grupal la semana siguiente, o una
 * recuperación, entran por acá.
 *
 * <p><b>La inscripción es lo que hace que la clase descuente del curso.</b> Va
 * vacía cuando la persona viene sin cursar —un alquiler de cabina— y por eso se
 * elige aparte del alumno en vez de deducirse: alguien con dos cursos activos
 * tiene dos, y adivinar cuál descontar es adivinar mal la mitad de las veces.
 * Cuando tiene una sola, viene puesta.
 */
function FormularioParticipante({
  reserva,
  onAnotado,
}: {
  reserva: ReservaResumen
  onAnotado: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const selector = useParticipante(abierto)

  async function anotar(evento: React.FormEvent) {
    evento.preventDefault()
    if (!selector.elegido) {
      setError('Elegí a quién anotar.')
      return
    }

    setError(null)
    setEnviando(true)
    try {
      await agregarParticipante(reserva.idReserva, selector.elegido)
      selector.limpiar()
      setAbierto(false)
      onAnotado()
    } catch (e) {
      // Acá caen las reglas de la base: la persona ya anotada, la misma persona
      // en otra sala a esa hora, y la de `V9` §5 —no consumir más clases que las
      // contratadas—, que además nombra la salida.
      setError(e instanceof ApiError ? e.message : 'No se pudo anotar.')
    } finally {
      // ⚠️ **En el `finally`, no solo en el `catch`** — el hallazgo #8 de
      // `docs/mejoras.md`, que se veía intermitente y no lo era.
      //
      // Antes esto vivía únicamente en el `catch`, y el camino feliz se apoyaba en
      // que `setAbierto(false)` desmontara el formulario. **No lo desmonta**: este
      // componente sigue montado y solo cambia lo que devuelve, así que el `true`
      // sobrevivía y el botón quedaba en "Anotando…", deshabilitado para siempre.
      //
      // Por eso parecía un cuelgue de red: la primera vez anda, y el trabado
      // aparece recién al abrir el formulario de nuevo — o sea al anotar al
      // segundo alumno de una clase grupal, que es el caso más común.
      setEnviando(false)
    }
  }

  if (!abierto) {
    return (
      <Boton variante="enlace"
        type="button"
        onClick={() => setAbierto(true)} className="mt-3">
        + Anotar a alguien
      </Boton>
    )
  }

  return (
    <form onSubmit={anotar} noValidate className="mt-4 rounded-md border border-linea p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <CamposDeParticipante selector={selector} />
      </div>

      {(error ?? selector.errorDeCarga) && (
        <div className="mt-3">
          <Aviso>{error ?? selector.errorDeCarga}</Aviso>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Anotando…' : 'Anotar'}
        </Boton>
        <Boton
          type="button"
          variante="secundario"
          onClick={() => {
            setAbierto(false)
            setError(null)
          }}
        >
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

function FormularioReserva({
  salas,
  tipos,
  profesores,
  inicial,
  reserva,
  onCerrar,
  onGuardada,
}: {
  salas: SalaResumen[]
  tipos: TipoUsoResumen[]
  profesores: ProfesorResumen[]
  inicial?: Franja
  reserva?: ReservaResumen
  onCerrar: () => void
  onGuardada: () => void
}) {
  const [datos, setDatos] = useState({
    idSala: reserva ? String(reserva.idSala) : inicial?.idSala ? String(inicial.idSala) : '',
    idTipoUso: reserva ? String(reserva.idTipoUso) : '',
    idProfesor: reserva?.idProfesor ? String(reserva.idProfesor) : '',
    fecha: reserva?.fecha ?? inicial?.fecha ?? '',
    horaInicio: reserva ? hhmm(reserva.horaInicio) : `${String(inicial?.hora ?? 10).padStart(2, '0')}:00`,
    horaFin: reserva ? hhmm(reserva.horaFin) : `${String((inicial?.hora ?? 10) + 1).padStart(2, '0')}:30`,
    notas: reserva?.notas ?? '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const sala = salas.find((s) => String(s.idSala) === datos.idSala)
  const tipo = tipos.find((t) => String(t.idTipoUso) === datos.idTipoUso)

  /**
   * Una clase se carga con quién la toma, en el mismo pedido (paso 2 de la seña).
   *
   * Las dos condiciones son deliberadas. **Solo en el alta**, porque mover una
   * reserva no toca a los participantes y `EdicionReservaRequest` no los tiene.
   * **Solo si es clase**, porque una grabación de set no tiene a quién anotar y su
   * plata llega por `pago.id_reserva`.
   */
  const pideParticipante = !reserva && (tipo?.esClase ?? false)
  const participante = useParticipante(pideParticipante)

  /**
   * El otro camino del dinero de `V10`, y el espejo exacto del de arriba.
   *
   * Una clase la cubre la inscripción del alumno. Un **alquiler de cabina o una
   * grabación de set no tienen inscripción ninguna**, así que su plata es un pago
   * apuntando a la reserva, y tiene que entrar en el mismo pedido — un pago no
   * puede apuntar a una reserva que todavía no existe.
   *
   * `MIX_MASTERING` es la única excepción de la regla (lo decide Ghezz caso por
   * caso), así que es el único uso que no la pide.
   */
  const pideSena = !reserva && tipo != null && !tipo.esClase && tipo.codigo !== 'MIX_MASTERING'
  const [sena, setSena] = useState({
    idUsuario: '',
    monto: '',
    moneda: 'ARS' as Moneda,
    cotizacionDolar: '',
    medioPago: 'EFECTIVO' as MedioPago,
  })
  /**
   * El comprobante de la seña, si lo hay.
   *
   * **No viaja con el alta**: desde `V21` es un archivo y no una ruta escrita a
   * mano, así que va en un segundo pedido contra el pago que el alta devuelve
   * (`idPagoSena`). Se pide igual acá y no después, porque quien carga el alquiler
   * está mirando la transferencia en ese momento — `mejoras.md` §9.9.
   */
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [personas, setPersonas] = useState<UsuarioResumen[]>([])

  // Quien alquila puede no ser alumno de nada -- es la decisión de `usuario` como
  // raíz-- así que acá se listan usuarios y no alumnos.
  useEffect(() => {
    if (!pideSena) return
    listarUsuarios({ pagina: 0 })
      .then((r) => setPersonas(r.contenido))
      .catch(() => setErrorGeneral('No se pudo cargar el listado de personas.'))
  }, [pideSena])

  function cambiarSena(campo: keyof typeof sena) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setSena((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  // Solo los usos habilitados para esa sala: la matriz de §2.6. La FK compuesta
  // los rechaza igual; esto evita ofrecerlos y después explicar un error.
  const permitidos = sala
    ? tipos.filter((t) => sala.usosPermitidos.some((u) => u.idTipoUso === t.idTipoUso))
    : tipos

  const advertencia = sala?.usosPermitidos.find(
    (u) => String(u.idTipoUso) === datos.idTipoUso,
  )?.advertencia

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.idSala) locales.idSala = 'Elegí la sala.'
    if (!datos.idTipoUso) locales.idTipoUso = 'Elegí para qué se usa.'
    if (!datos.fecha) locales.fecha = 'Poné la fecha.'
    // La misma regla que el backend impone con @AssertTrue (DB-11). Acá se
    // adelanta el mensaje; quien la sostiene sigue siendo el servidor.
    if (datos.horaFin <= datos.horaInicio) {
      locales.horarioValido = 'La hora de fin tiene que ser posterior a la de inicio.'
    }
    // Esta es la mitad de la seña que impone la pantalla (§13): una clase sin
    // nadie anotado es una reserva sin plata detrás, y `V10` la va a rechazar al
    // COMMIT. Se pide acá y no en el DTO porque el backend la acepta vacía a
    // propósito -- un alquiler de cabina no tiene participantes.
    if (pideParticipante && !participante.elegido) {
      locales.idUsuario = 'Elegí al alumno: una clase se carga junto con quién la toma.'
    }
    // La misma regla por el otro camino: sin inscripción que lo cubra, lo que
    // sostiene la reserva es el pago, y `V10` lo exige al COMMIT.
    if (pideSena) {
      if (!sena.idUsuario) locales.senaIdUsuario = 'Decí quién paga la seña.'
      if (!sena.monto || Number(sena.monto) <= 0) {
        locales.senaMonto = 'Poné el monto de la seña.'
      }
      if (sena.moneda === 'USD' && !sena.cotizacionDolar) {
        locales.senaCotizacion = 'Un pago en dólares necesita la cotización del día.'
      }
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    const cuerpo = {
      idSala: Number(datos.idSala),
      idTipoUso: Number(datos.idTipoUso),
      idProfesor: datos.idProfesor ? Number(datos.idProfesor) : null,
      fecha: datos.fecha,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      notas: datos.notas || undefined,
    }

    try {
      if (reserva) await editarReserva(reserva.idReserva, cuerpo)
      else {
        // Un solo participante. Una clase grupal se completa desde el detalle con
        // "Anotar a alguien" -- lo que la seña necesita es que la reserva no nazca
        // vacía, no que entre entera de una.
        const creada = await altaReserva({
          ...cuerpo,
          participantes: participante.elegido ? [participante.elegido] : undefined,
          sena: pideSena
            ? {
                idUsuario: Number(sena.idUsuario),
                monto: Number(sena.monto),
                moneda: sena.moneda,
                cotizacionDolar: sena.cotizacionDolar ? Number(sena.cotizacionDolar) : null,
                medioPago: sena.medioPago,
              }
            : undefined,
        })

        // La reserva y su seña ya entraron: si el archivo falla, lo que se avisa
        // es eso —no que falló el alta— y el comprobante se puede adjuntar
        // después desde Pagos.
        if (comprobante && creada.idPagoSena) {
          try {
            await adjuntarComprobante(creada.idPagoSena, comprobante)
          } catch (e) {
            setErrorGeneral(
              e instanceof ApiError
                ? `La reserva quedó cargada, pero el comprobante no: ${e.message}`
                : 'La reserva quedó cargada, pero el comprobante no se pudo subir.',
            )
            setEnviando(false)
            return
          }
        }
      }
      onGuardada()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        // Acá caen las reglas de la base: sala ocupada, sala bloqueada, el
        // profesor en dos lados, la sala que no sirve para eso. El mensaje que
        // se muestra es el que escribió la constraint o el trigger.
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-superficie p-5">
      <h3 className="mb-4 font-semibold">{reserva ? 'Mover la reserva' : 'Nueva reserva'}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect etiqueta="Sala" value={datos.idSala} onChange={cambiar('idSala')} error={errores.idSala}>
          <option value="">Elegí una</option>
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Para qué"
          value={datos.idTipoUso}
          onChange={cambiar('idTipoUso')}
          error={errores.idTipoUso}
        >
          <option value="">Elegí uno</option>
          {permitidos.map((t) => (
            <option key={t.idTipoUso} value={t.idTipoUso}>
              {t.nombre}
            </option>
          ))}
        </CampoSelect>

        <Campo etiqueta="Fecha" type="date" value={datos.fecha} onChange={cambiar('fecha')} error={errores.fecha} />

        <CampoSelect etiqueta="Profesor" value={datos.idProfesor} onChange={cambiar('idProfesor')}>
          <option value="">Sin asignar</option>
          {profesores.map((p) => (
            <option key={p.idProfesor} value={p.idProfesor}>
              {p.nombreCompleto}
            </option>
          ))}
        </CampoSelect>

        <Campo etiqueta="Desde" type="time" value={datos.horaInicio} onChange={cambiar('horaInicio')} />
        <Campo
          etiqueta="Hasta"
          type="time"
          value={datos.horaFin}
          onChange={cambiar('horaFin')}
          error={errores.horarioValido}
        />

        <Campo etiqueta="Notas" value={datos.notas} onChange={cambiar('notas')} className="sm:col-span-2" />

        {/* Aparecen recién al elegir un tipo de uso que es clase, y por eso el
            título va adentro del condicional: sin él son dos selects que salen de
            la nada en medio del formulario. */}
        {pideParticipante && (
          <>
            <p className="mt-2 text-xs font-semibold text-tenue sm:col-span-2">
              Quién toma la clase
            </p>
            <CamposDeParticipante selector={participante} error={errores.idUsuario} />
          </>
        )}

        {/* El otro camino del dinero. La leyenda dice el porqué en una línea:
            sin esto la reserva no tiene con qué existir, y el rechazo llegaría
            recién al guardar, escrito por un trigger. */}
        {pideSena && (
          <>
            <p className="mt-2 sm:col-span-2">
              <span className="text-xs font-semibold text-tenue">La seña</span>
              <span className="ml-2 text-xs text-tenue">
                Sin seña no se aparta el horario. Es el 50% del total.
              </span>
            </p>

            <CampoSelect
              etiqueta="Quién paga"
              value={sena.idUsuario}
              onChange={cambiarSena('idUsuario')}
              error={errores.senaIdUsuario}
            >
              <option value="">Elegí a la persona</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </CampoSelect>

            <Campo
              etiqueta="Monto"
              type="number"
              step="0.01"
              value={sena.monto}
              onChange={cambiarSena('monto')}
              error={errores.senaMonto}
            />

            <CampoSelect etiqueta="Moneda" value={sena.moneda} onChange={cambiarSena('moneda')}>
              <option value="ARS">Pesos</option>
              <option value="USD">Dólares</option>
            </CampoSelect>

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

            {/* Opcional a propósito: una seña en efectivo no tiene comprobante, y
                exigirlo dejaría media caja sin poder cargarse. */}
            <div>
              <span className="mb-1 block text-xs font-medium text-tenue">
                Comprobante (opcional)
              </span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                aria-label="Comprobante"
                onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-tenue"
              />
            </div>

            {sena.moneda === 'USD' && (
              <Campo
                etiqueta="Cotización del dólar"
                type="number"
                step="0.01"
                value={sena.cotizacionDolar}
                onChange={cambiarSena('cotizacionDolar')}
                ayuda="Sin esto el importe no se puede reconstruir después."
                error={errores.senaCotizacion}
                className="sm:col-span-2"
              />
            )}
          </>
        )}
      </div>

      {/* El caso "se puede, pero ojo" de la matriz: una clase de DJ en la cabina
          de grabación es válida solo si es una práctica. */}
      {advertencia && <p className="mt-3 text-xs text-acento">{advertencia}</p>}

      {/* El de carga también: sin esto, un fallo al traer los alumnos deja el
          select vacío sin decir por qué, que se lee como "no hay alumnos". */}
      {(errorGeneral ?? participante.errorDeCarga) && (
        <div className="mt-4">
          <Aviso>{errorGeneral ?? participante.errorDeCarga}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : reserva ? 'Guardar' : 'Reservar'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

