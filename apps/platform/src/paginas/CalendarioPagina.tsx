import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  agenda,
  altaReserva,
  cambiarAsistencia,
  cambiarEstadoReserva,
  editarReserva,
  listarProfesores,
  listarSalas,
  listarTiposUso,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  HORA_APERTURA,
  type EstadoAsistencia,
  type ProfesorResumen,
  type ReservaResumen,
  type SalaResumen,
  type TipoUsoResumen,
} from '../api/tiposAdmin'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { capitalizar } from '../componentes/presentacion'
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
import { puedeOperar } from '../layout/menu'

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

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
  const puedeEscribir = puedeOperar(useUsuario())

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

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setReservas(
        await agenda({
          desde: dias[0],
          hasta: dias[6],
          idSala: idSala === '' ? undefined : idSala,
          incluirCanceladas,
        }),
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el calendario.')
    } finally {
      setCargando(false)
    }
  }, [dias, idSala, incluirCanceladas])

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
      const refrescadas = await agenda({
        desde: dias[0],
        hasta: dias[6],
        idSala: idSala === '' ? undefined : idSala,
        incluirCanceladas,
      })
      setReservas(refrescadas)
      setElegida(
        (previa) => refrescadas.find((r) => r.idReserva === previa?.idReserva) ?? null,
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo tomar lista.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Calendario</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : rangoLegible(dias)}
          </p>
        </div>
        {puedeEscribir && (
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
        )}
      </div>

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
          className="rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
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
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <div className="min-w-3xl">
          {/* Encabezado de días */}
          <div className="grid border-b border-linea" style={{ gridTemplateColumns: COLUMNAS }}>
            <div className="px-2 py-2" />
            {dias.map((dia, i) => (
              <div
                key={dia}
                className={`px-2 py-2 text-center text-xs uppercase tracking-wider ${
                  dia === hoy() ? 'font-semibold text-red' : 'text-tenue'
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
                        className="min-h-6 flex-1 rounded text-left text-[11px] text-transparent transition-colors hover:bg-papel hover:text-apagado focus:bg-papel focus:text-apagado focus:outline-none"
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
      className={`mb-1 block w-full border-l-4 bg-papel px-1.5 py-1 text-left text-[11px] leading-tight transition-colors hover:bg-bone-2/60 ${
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
      className={`mb-1 block w-full border-l-4 border-dashed bg-papel/50 px-1.5 py-0.5 text-left text-[10px] leading-tight text-apagado transition-colors hover:bg-bone-2/60 ${
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
}: {
  reserva: ReservaResumen
  puedeEscribir: boolean
  onCerrar: () => void
  onEditar: () => void
  onCancelar: () => void
  onAsistencia: (idParticipacion: number, estado: EstadoAsistencia) => void
}) {
  return (
    <div className="mb-6 rounded-lg border border-linea bg-white p-5">
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
        <button
          type="button"
          onClick={onCerrar}
          className="text-xs text-tenue underline underline-offset-2 hover:text-red"
        >
          Cerrar
        </button>
      </div>

      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tenue">
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
                  className="rounded border border-linea bg-white px-2 py-1 text-xs outline-none focus:border-red"
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
      else await altaReserva(cuerpo)
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
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-white p-5">
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
      </div>

      {/* El caso "se puede, pero ojo" de la matriz: una clase de DJ en la cabina
          de grabación es válida solo si es una práctica. */}
      {advertencia && <p className="mt-3 text-xs text-red">{advertencia}</p>}

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
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

