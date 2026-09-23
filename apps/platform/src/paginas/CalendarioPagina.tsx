import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  adjuntarComprobante,
  agenda,
  agregarParticipante,
  altaReserva,
  cambiarAsistencia,
  cambiarEstadoReserva,
  editarReserva,
  listarBloqueos,
  listarProfesores,
  listarSalas,
  listarTiposUso,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  HORA_APERTURA,
  NOMBRE_DE_MEDIO,
  type BloqueoResumen,
  type Disciplina,
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
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque } from '../componentes/Bloque'
import { Movida } from '../componentes/Movida'
import { CASILLA_EN_LINEA, CONTROL_DE_FILTRO } from '../componentes/controles'
import { DeslizableAlCostado } from '../componentes/DeslizableAlCostado'
import { Campo, CampoSelect } from '../componentes/Campo'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'
import {
  diaYMes,
  fecha,
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
import { importe } from '../componentes/dinero'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { BuscadorDePersonas } from '../componentes/BuscadorDePersonas'
import { SelectorDeCurso } from '../componentes/SelectorDeCurso'
import { TraerALaVista } from '../componentes/TraerALaVista'

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
  const [bloqueos, setBloqueos] = useState<BloqueoResumen[]>([])
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [tipos, setTipos] = useState<TipoUsoResumen[]>([])
  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

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
  }, [setError])

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
  }, [traerAgenda, setError])

  /**
   * Las salas fuera de servicio de esta semana (P98).
   *
   * ⚠️ **Va en su propio pedido y su propio estado, y un fallo acá no vacía el
   * calendario**: si `/api/bloqueos` se cae, la semana se dibuja igual sin las
   * bandas —que es exactamente como se dibujaba hasta hoy— en vez de dejar la
   * pantalla en blanco. Es el criterio del Inicio: un bloque caído no puede
   * llevarse el resto.
   *
   * <p>El endpoint acota por `desde` (trae todo lo que termina de ahí en
   * adelante) y no tiene `hasta`, así que el recorte por el otro lado lo hace
   * esta pantalla. Es una lista corta por definición —"qué salas están fuera de
   * servicio"— y no vale una migración de la consulta.
   */
  useEffect(() => {
    let vigente = true
    listarBloqueos({ desde: dias[0], idSala: idSala === '' ? undefined : idSala })
      .then((filas) => {
        if (vigente) setBloqueos(filas.filter((b) => b.fechaInicio <= dias[6]))
      })
      .catch(() => {
        if (vigente) setBloqueos([])
      })
    return () => {
      vigente = false
    }
  }, [dias, idSala])

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

      <AvisoSoloLectura />

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
          className={CONTROL_DE_FILTRO}
        >
          <option value="">Todas las salas</option>
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </select>

        <label className={`${CASILLA_EN_LINEA} text-sm text-tenue`}>
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
        <TraerALaVista>
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
        </TraerALaVista>
      )}

      {editando && puedeEscribir && (
        <TraerALaVista>
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
        </TraerALaVista>
      )}

      {elegida && (
        <TraerALaVista>
          <Detalle
            reserva={elegida}
            tipos={tipos}
            puedeEscribir={puedeEscribir}
            onCerrar={() => setElegida(null)}
            onEditar={() => setEditando(elegida)}
            onCancelar={() => void cancelar(elegida)}
            onAsistencia={marcarAsistencia}
            onAnotado={() => void refrescarTrasAnotar()}
          />
        </TraerALaVista>
      )}

      <DeslizableAlCostado
        hasta="lg"
        que="la semana entera"
        className="rounded-lg border border-linea bg-superficie shadow-tarjeta"
      >
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
                const cerradas = bloqueos.filter((b) => bloquea(b, dia, hora))

                // Una celda ocupada NO es una celda llena: son tres salas. Lo
                // que la cierra es que no quede ninguna libre a esa hora.
                //
                // ⚠️ **La sala bloqueada tampoco está libre** (P98). Antes el hueco
                // se ofrecía igual y el trigger de `V1` rechazaba al guardar, con
                // el formulario ya lleno: el sistema sabía que no se podía y no lo
                // decía hasta el final. Es la misma decisión que `permitidos` con
                // la matriz de §2.6 —no ofrecer lo que la base va a rechazar.
                const libres = salasActivas.filter(
                  (s) =>
                    !ocupan.some((r) => r.idSala === s.idSala && !cayo(r)) &&
                    !cerradas.some((b) => b.idSala === s.idSala),
                )
                const sePuedeCargar = puedeEscribir && libres.length > 0

                return (
                  <div key={dia + hora} className="flex min-h-14 flex-col border-l border-linea p-1">
                    {empiezan.map((r) => (
                      <ReservaEnGrilla key={r.idReserva} reserva={r} onElegir={() => setElegida(r)} />
                    ))}
                    {vienen.map((r) => (
                      <Continuacion key={r.idReserva} reserva={r} onElegir={() => setElegida(r)} />
                    ))}
                    {cerradas.map((b) => (
                      <SalaBloqueada key={b.idBloqueo} bloqueo={b} />
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
                        // El `min-h-11` es el piso tocable de P108 debajo de
                        // `lg`; `lg:min-h-6` devuelve el de hoy. Importa el
                        // piso y no el `flex-1`: en una celda vacía el botón ya
                        // se estiraba a los 48px de la fila, pero en una celda
                        // que ya tiene una reserva se quedaba con lo que
                        // sobrara, y el piso eran 24px.
                        //
                        // ⚠️ **Lo que sigue sin resolverse es que es invisible
                        // hasta el hover, y en un teléfono no hay hover.** Se
                        // deja anotado y no se toca a ciegas: revelarlo abajo de
                        // `lg` es cambiarle el color, o sea `text-apagado`
                        // peleando con `text-transparent`, y cuál gana depende
                        // del orden en que Tailwind emita las variantes — la
                        // misma dependencia no verificable bajo jsdom que la
                        // Etapa 1 evitó en el `whitespace-nowrap`. Tocar la
                        // celda igual abre el formulario, que no crea nada.
                        className="min-h-11 flex-1 rounded text-left text-[11px] text-transparent transition-colors hover:bg-superficie-2 hover:text-apagado focus:bg-superficie-2 focus:text-apagado lg:min-h-6"
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
      </DeslizableAlCostado>

      {/* Este NO es un `EstadoVacio` y es a propósito: la grilla de la semana ya
          está dibujada arriba, así que la pantalla no se lee como rota ni como
          que faltó cargar algo. Acá la frase aclara, no rescata. */}
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

/**
 * Si ese bloqueo cierra esa sala en ese día y esa hora.
 *
 * ⚠️ **Una fila de `bloqueo_sala` es una FRANJA QUE SE REPITE todos los días
 * del rango**, no un intervalo continuo: "de 9 a 13 toda la semana" deja la sala
 * libre de 13 en adelante todos esos días. Es la lectura que `V7` tuvo que
 * rescatar de una migración que la había perdido, y la que `/api/me/disponibilidad`
 * ya expande día por día. Leerlo al revés acá taparía de gris una semana entera.
 *
 * <p>El día se compara como texto porque las fechas viajan en ISO (`AAAA-MM-DD`),
 * donde el orden alfabético **es** el cronológico; los dos extremos son
 * inclusivos, como el CHECK de la tabla. La hora usa el mismo criterio que
 * {@link ocupaLaHora}: fin exclusivo.
 */
function bloquea(bloqueo: BloqueoResumen, dia: string, hora: number): boolean {
  if (dia < bloqueo.fechaInicio || dia > bloqueo.fechaFin) {
    return false
  }
  return bloqueo.diaCompleto || ocupaLaHora(bloqueo, hora)
}

/**
 * La sala fuera de servicio, dibujada en la grilla (P98, Ignacio 2026-09-20).
 *
 * <p><b>Es el único dato del calendario que se veía sólo en otra pantalla.</b>
 * `/admin/bloqueos` lista los bloqueos y el calendario —que es donde alguien
 * decide dónde poner una clase— no los mostraba: la sala se veía libre, y lo
 * único que avisaba era el trigger, al guardar.
 *
 * <p><b>No es un botón ni lleva a ningún lado</b>, al revés que una reserva: no
 * hay nada que hacerle desde acá —se quita desde Bloqueos— y un bloque
 * clickeable que no hace nada es peor que uno que no lo parece. Y va sin color
 * propio: el rojo de esta pantalla es de la reserva que caóó, y una sala en
 * mantenimiento no es una alarma.
 */
function SalaBloqueada({ bloqueo }: { bloqueo: BloqueoResumen }) {
  return (
    <div
      className="mb-1 rounded border border-dashed border-linea bg-superficie-2 px-1.5 py-1 text-[11px] leading-tight text-apagado"
      title={`${bloqueo.sala} bloqueada: ${bloqueo.motivo}`}
    >
      <div className="truncate font-medium">{bloqueo.sala} bloqueada</div>
      <div className="truncate">{bloqueo.motivo}</div>
    </div>
  )
}

/** Un bloque del calendario. El color lo manda el backend desde `tipo_uso`. */
/**
 * Una reserva dibujada dentro de la grilla de la semana.
 *
 * Se llamaba `Bloque`, que acá significaba otra cosa que en el resto del
 * sistema —y encima una tercera distinta de `bloqueo_sala`, que es cuando una
 * sala no se puede usar—. Tres cosas con el mismo nombre en una pantalla que
 * las muestra a las tres juntas.
 */
function ReservaEnGrilla({ reserva, onElegir }: { reserva: ReservaResumen; onElegir: () => void }) {
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
      // ⚠️ 44px con el dedo debajo de `lg`, y desde ahí exactamente lo de hoy
      // (P108, §26 · Etapa 2). Este era **el control más chico que quedaba en
      // el sistema**: una línea de `text-[10px]` con `py-0.5` da unos 17px, y
      // P108 no lo alcanzó porque no es un `Boton` sino un `<button>` a mano
      // dentro de la grilla. El `flex` es lo que centra el texto dentro de esa
      // altura —reemplaza al `block`, como en `Boton`— y de paso hace que el
      // `truncate` del `<span>` funcione: sobre contenido en línea no hacía
      // nada, porque `overflow` pide una caja.
      className={`mb-1 flex w-full items-center border-l-4 border-dashed bg-superficie-2/50 px-1.5 py-0.5 text-left text-[10px] leading-tight text-apagado transition-colors hover:bg-superficie-2 min-h-11 lg:min-h-0 ${
        cayo(reserva) ? 'opacity-50 line-through' : ''
      }`}
    >
      <span className="min-w-0 truncate">↳ {reserva.sala} · sigue</span>
    </button>
  )
}

function Detalle({
  reserva,
  tipos,
  puedeEscribir,
  onCerrar,
  onEditar,
  onCancelar,
  onAsistencia,
  onAnotado,
}: {
  reserva: ReservaResumen
  /** Para saber de qué curso descuenta esta clase (`V22`). */
  tipos: TipoUsoResumen[]
  puedeEscribir: boolean
  onCerrar: () => void
  onEditar: () => void
  onCancelar: () => void
  onAsistencia: (idParticipacion: number, estado: EstadoAsistencia) => void
  onAnotado: () => void
}) {
  return (
    <div className="mb-6 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="t-seccion">
            {reserva.tipoUso} · {reserva.sala}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-tenue">
            <span>
              {fecha(reserva.fecha)} · {hhmm(reserva.horaInicio)}–{hhmm(reserva.horaFin)} ·{' '}
              {capitalizar(reserva.estado)}
            </span>
            <Movida veces={reserva.vecesMovida} />
          </p>
          <p className="text-sm text-tenue">
            {reserva.profesor ?? <span className="text-apagado">Sin profesor asignado</span>}
          </p>
          {/* El precio (`V33`), sólo en lo que no es clase. Una de antes de la
              migración lo dice en vez de omitirlo: cargarlo es editarla, y lo que
              falte después de la seña se ve en Deudores. */}
          {!reserva.esClase && (
            <p className="text-sm text-tenue">
              {reserva.precioTotal !== null && reserva.moneda !== null ? (
                <>Precio total {importe(reserva.precioTotal, reserva.moneda)}</>
              ) : (
                <span className="text-apagado">Sin precio cargado — editala para ponerlo</span>
              )}
            </p>
          )}
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
                  className={CONTROL_DE_FILTRO}
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
        <FormularioParticipante reserva={reserva} tipos={tipos} onAnotado={onAnotado} />
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
 * Elegir **quién toma la clase**: un curso —un alumno solo o un grupo— y, si es
 * un grupo, quiénes de sus integrantes vienen.
 *
 * **Está acá afuera porque lo usan dos formularios**: el alta de la clase, que
 * los manda en el mismo pedido que la reserva (paso 2 de la seña), y el "anotar
 * a alguien" del detalle, para quien se suma después. Duplicarlo serían dos
 * lugares donde arreglar lo mismo.
 *
 * ⚠️ **Se elige EL CURSO, no una persona** (P101, Ignacio 2026-09-20: *"no
 * quiero anotar a Alvarez Julian — Grupo 41, quiero anotar AL GRUPO 41"*).
 * Hasta acá se elegía un alumno y después aparecía un checkbox *"anotar a todo
 * el grupo"*: **anotaba a los tres igual**, o sea que el resultado era correcto
 * y la pantalla decía otra cosa de la que hacía — presentába al grupo como una
 * etiqueta de Julián en vez de como la unidad que es. Era la lectura anterior a
 * `V35` sobreviviendo en el último lugar donde todavía se la podía escribir.
 *
 * <p><b>Y el checkbox se dio vuelta con el modelo.</b> Antes marcabas para
 * incluir a los otros dos; ahora **vienen todos y desmarcás al que falta**, que
 * es lo que pasa de verdad: un grupo cursa junto y la excepción es el día que
 * uno no puede. El caso que eso habilita —la recuperación de uno solo— sigue
 * entrando por el mismo control.
 *
 * <p><b>De qué curso descuenta ya no hay que calcularlo</b>: es el curso
 * elegido. El buscador lo filtra por la disciplina del tipo de uso (`V22`) y
 * sólo ofrece ACTIVA, así que el caso *"no tiene una inscripción vigente de
 * DJ"* —que antes se avisaba después de elegir— ya no se puede armar.
 */
function useParticipante(disciplina: string | null) {
  const [curso, setCurso] = useState<InscripcionResumen | null>(null)
  /** Los integrantes que HOY no vienen. Vacío casi siempre: el grupo cursa junto. */
  const [ausentes, setAusentes] = useState<number[]>([])

  // Cambiar de tipo de uso cambia la disciplina, y el curso elegido puede ser de
  // otra: se suelta en vez de quedar mostrando algo que ya no corresponde.
  useEffect(() => {
    setCurso((previo) => (previo && previo.disciplina !== disciplina ? null : previo))
  }, [disciplina])

  const integrantes = curso?.integrantes ?? []
  const elegidos = integrantes
    .filter((x) => !ausentes.includes(x.idUsuario))
    .map((x) => ({ idUsuario: x.idUsuario }))

  return {
    curso,
    elegirCurso(nuevo: InscripcionResumen | null) {
      setCurso(nuevo)
      setAusentes([])
    },
    disciplina,
    integrantes,
    ausentes,
    alternar(idUsuario: number) {
      setAusentes((previos) =>
        previos.includes(idUsuario)
          ? previos.filter((x) => x !== idUsuario)
          : [...previos, idUsuario],
      )
    },
    /** Quien ya está anotado en esa reserva arranca destildado (ver abajo). */
    marcarAusentes(ids: number[]) {
      setAusentes(ids)
    },
    limpiar() {
      setCurso(null)
      setAusentes([])
    },
    /** Los que se anotan. Vacía sin curso, o con todo el grupo desmarcado. */
    elegidos,
  }
}

/**
 * El buscador de curso y, si es un grupo, quiénes vienen.
 *
 * ⚠️ **La lista de integrantes NO es un selector de participantes**: es el
 * grupo, ya anotado, con la posibilidad de sacar al que falta. Por eso arranca
 * todo tildado y por eso no aparece para un alumno solo — ahí no hay nada que
 * elegir y un checkbox suelto invitaría a destildarlo.
 */
function CamposDeParticipante({
  selector,
  error,
  yaAnotados,
}: {
  selector: ReturnType<typeof useParticipante>
  error?: string
  /** Los que ya están en esa reserva: se marcan para que no parezca un olvido. */
  yaAnotados?: number[]
}) {
  const { curso } = selector
  return (
    <>
      <SelectorDeCurso
        etiqueta="Quién toma la clase"
        disciplina={(selector.disciplina as Disciplina | null) ?? null}
        elegido={curso}
        onElegir={selector.elegirCurso}
        error={error}
      />

      <div>
        <span className="t-mono text-tenue">Descuenta de</span>
        <div className="mt-1.5 py-2 text-sm">
          {selector.disciplina === null ? (
            // Un alquiler de cabina, una grabación, un mastering. No descuenta.
            <span className="text-tenue">No descuenta clases</span>
          ) : !curso ? (
            <span className="text-apagado">Elegí el curso</span>
          ) : (
            <>
              {NOMBRE_DE_DISCIPLINA[curso.disciplina]}
              {curso.numeroGrupo !== null && ` · Grupo ${curso.numeroGrupo}`}
              <span className="text-tenue"> — le{curso.numeroGrupo !== null ? 's' : ''} quedan {curso.clasesRestantes}</span>
            </>
          )}
        </div>
      </div>

      {curso && curso.numeroGrupo !== null && (
        <div className="sm:col-span-2">
          <span className="t-mono text-tenue">Vienen</span>
          <p className="mt-1 text-xs text-apagado">
            Cursan juntos: se anotan los {curso.integrantes.length}. Desmarcá al que falte.
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1.5">
            {curso.integrantes.map((x) => (
              <label key={x.idUsuario} className={`${CASILLA_EN_LINEA} text-sm`}>
                <input
                  type="checkbox"
                  checked={!selector.ausentes.includes(x.idUsuario)}
                  onChange={() => selector.alternar(x.idUsuario)}
                />
                {x.nombre} {x.apellido}
                {yaAnotados?.includes(x.idUsuario) && (
                  <span className="text-xs text-apagado">ya está</span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}
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
 * <p><b>De qué curso descuenta lo decide el tipo de uso de la reserva</b>
 * (`mejoras.md` §12 · C1, `V22`), y por eso este formulario necesita el
 * catálogo: la reserva trae su {@code idTipoUso} y la disciplina vive ahí. Antes
 * se elegía con un {@code <select>} que ofrecía todos los cursos vigentes del
 * alumno sin mirar para qué era la reserva.
 */
function FormularioParticipante({
  reserva,
  tipos,
  onAnotado,
}: {
  reserva: ReservaResumen
  tipos: TipoUsoResumen[]
  onAnotado: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)
  const tipo = tipos.find((t) => t.idTipoUso === reserva.idTipoUso)
  const selector = useParticipante(tipo?.disciplina ?? null)

  /**
   * ⚠️ **El que YA está anotado arranca destildado** (P101).
   *
   * <p>Acá la clase ya existe, así que el caso normal es *"faltaba uno del
   * grupo"*: se elige el grupo y los otros dos ya están. Sin esto el formulario
   * los mandaría de nuevo, el backend rechazaría al primero —está bien que lo
   * haga, `V1` no deja anotar dos veces a la misma persona— y el bucle cortaría
   * ahí sin llegar al que falta. O sea: el camino más común terminaba en un
   * error que no es de quien carga.
   *
   * <p>Sigue siendo **destildado y no invisible**: quien mira tiene que ver que
   * el grupo son tres y que dos ya están.
   */
  const curso = selector.curso
  useEffect(() => {
    if (!curso) return
    const yaEstan = curso.integrantes
      .filter((x) => reserva.participantes.some((p) => p.idUsuario === x.idUsuario))
      .map((x) => x.idUsuario)
    selector.marcarAusentes(yaEstan)
    // Sobre el curso elegido y esta reserva: no depende del selector entero,
    // que cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curso, reserva.participantes])

  async function anotar(evento: React.FormEvent) {
    evento.preventDefault()
    if (selector.elegidos.length === 0) {
      setError(selector.curso ? 'Marcá al menos a uno.' : 'Elegí el curso.')
      return
    }

    setError(null)
    setEnviando(true)
    try {
      // Uno, o el grupo entero (`V35`): un pedido por persona, en orden. Si el
      // segundo falla, el primero ya quedó — y se ve en la lista, que es lo que
      // hace obvio a quién le faltó.
      for (const persona of selector.elegidos) {
        await agregarParticipante(reserva.idReserva, persona)
      }
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
        <CamposDeParticipante
          selector={selector}
          yaAnotados={reserva.participantes.map((p) => p.idUsuario)}
        />
      </div>

      {error && (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
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
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
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
  // De qué curso descuenta lo dice el catálogo, no quien carga (`V22`).
  const participante = useParticipante(tipo?.disciplina ?? null)

  /**
   * ⚠️ **El profe del curso se pone solo** (P97, Ignacio 2026-09-20: *"cuando se
   * agende una clase a una persona/grupo que tiene un profe asignado que se
   * rellene de forma automática"*).
   *
   * <p>El dato ya estaba: la inscripción tiene su profesor desde `V1` —es el que
   * da ese curso— y el formulario lo hacía elegir igual, de una lista de todos.
   * Elegir mal ahí **no falla**: la clase se dicta, la sala se ocupa, y en la
   * agenda del profe aparece una clase que no dio (o falta la que sí). Es el
   * mismo modo de falla que "Descuenta de" tenía antes de `V22`.
   *
   * <p><b>Se prellena, no se fija</b>, y ésa es la diferencia con el curso: ahí
   * el dato se muestra porque lo decide el servidor; acá lo decide quien carga,
   * porque el suplente existe —dar la clase de otro es un caso real y frecuente,
   * y es justamente cuando hay que poder cambiarlo—. Por eso `profesorTocado`:
   * una vez que alguien lo eligió a mano, cambiar de alumno no se lo pisa.
   *
   * <p>Sólo en el alta. Editar una reserva no toca participantes, así que no hay
   * curso del que sacarlo.
   */
  const [profesorTocado, setProfesorTocado] = useState(false)
  const profesorDelCurso = participante.curso?.idProfesor ?? null
  useEffect(() => {
    if (reserva || profesorTocado || profesorDelCurso === null) return
    setDatos((previo) => ({ ...previo, idProfesor: String(profesorDelCurso) }))
  }, [reserva, profesorTocado, profesorDelCurso])

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
  /**
   * El precio (`V33`, P83): lo lleva lo mismo que lleva seña —un alquiler o una
   * grabación—, **también al editar**, que es por donde una reserva de antes de
   * `V33` lo recibe. Con él Deudores sabe cuánto falta, y la seña se prellena al
   * 50%: la regla de P8 que hasta hoy sostenía quien cargaba.
   */
  const pidePrecio = tipo != null && !tipo.esClase && tipo.codigo !== 'MIX_MASTERING'
  const [precio, setPrecio] = useState({
    total: reserva?.precioTotal != null ? String(reserva.precioTotal) : '',
    moneda: (reserva?.moneda ?? 'ARS') as Moneda,
  })
  /** Quién paga la seña: se busca entre las cuentas (§17 · H8), no se lista. */
  const [pagador, setPagador] = useState<UsuarioResumen | null>(null)
  const [sena, setSena] = useState({
    monto: '',
    moneda: 'ARS' as Moneda,
    cotizacionDolar: '',
    medioPago: 'EFECTIVO' as MedioPago,
  })
  /** Si alguien escribió la seña a mano, el 50% deja de pisarla. */
  const [senaTocada, setSenaTocada] = useState(false)

  function cambiarPrecio(campo: 'total' | 'moneda') {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const valor = e.target.value
      setPrecio((previo) => ({ ...previo, [campo]: valor }))
      // La seña sigue al precio: su moneda es la de la reserva (`V33` §2) y
      // su monto la mitad, salvo que ya lo hayan escrito.
      if (campo === 'moneda') setSena((previo) => ({ ...previo, moneda: valor as Moneda }))
      if (campo === 'total' && !senaTocada) {
        setSena((previo) => ({ ...previo, monto: valor ? String(Number(valor) / 2) : '' }))
      }
    }
  }
  /**
   * El comprobante de la seña, si lo hay.
   *
   * **No viaja con el alta**: desde `V21` es un archivo y no una ruta escrita a
   * mano, así que va en un segundo pedido contra el pago que el alta devuelve
   * (`idPagoSena`). Se pide igual acá y no después, porque quien carga el alquiler
   * está mirando la transferencia en ese momento — `mejoras.md` §9.9.
   */
  const [comprobante, setComprobante] = useState<File | null>(null)

  function cambiarSena(campo: keyof typeof sena) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (campo === 'monto') setSenaTocada(true)
      setSena((previo) => ({ ...previo, [campo]: e.target.value }))
    }
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
    if (pideParticipante && participante.elegidos.length === 0) {
      locales.idUsuario = participante.curso
        ? 'Marcá al menos a uno de los que vienen.'
        : 'Elegí el curso: una clase se carga junto con quién la toma.'
    }
    // La misma regla por el otro camino: sin inscripción que lo cubra, lo que
    // sostiene la reserva es el pago, y `V10` lo exige al COMMIT.
    if (pidePrecio && (!precio.total || Number(precio.total) <= 0)) {
      locales.precioTotal = 'Poné el precio total: sin él no se sabe cuánto falta cobrar.'
    }
    if (pideSena) {
      if (!pagador) locales.senaIdUsuario = 'Decí quién paga la seña.'
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
      // Sólo lo que no es clase lo lleva; una clase con precio la rechaza el
      // servidor, así que no se manda ni vacío.
      precioTotal: pidePrecio ? Number(precio.total) : undefined,
      moneda: pidePrecio ? precio.moneda : undefined,
    }

    try {
      if (reserva) await editarReserva(reserva.idReserva, cuerpo)
      else {
        // Un participante, o el grupo entero si el alumno cursa en grupo (`V35`).
        // Una clase con gente suelta se completa desde el detalle con "Anotar a
        // alguien" -- lo que la seña necesita es que la reserva no nazca vacía.
        const creada = await altaReserva({
          ...cuerpo,
          participantes: participante.elegidos.length > 0 ? participante.elegidos : undefined,
          sena: pideSena
            ? {
                idUsuario: pagador!.id,
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
    <Bloque titulo={reserva ? 'Mover la reserva' : 'Nueva reserva'} className="mb-6">
      <form onSubmit={onSubmit} noValidate>
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

          <CampoSelect
            etiqueta="Profesor"
            value={datos.idProfesor}
            onChange={(e) => {
              // Tocarlo apaga el prellenado: de acá en adelante manda la persona.
              setProfesorTocado(true)
              cambiar('idProfesor')(e)
            }}
            ayuda={
              !profesorTocado && profesorDelCurso !== null && datos.idProfesor === String(profesorDelCurso)
                ? 'Es el de su curso. Cambialo si la da un suplente.'
                : undefined
            }
          >
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

          {/* El precio (`V33`): es lo que deja a Deudores decir cuánto falta. Va
              antes que la seña porque la seña sale de acá. */}
          {pidePrecio && (
            <>
              <p className="mt-2 sm:col-span-2">
                <span className="text-xs font-semibold text-tenue">El precio</span>
                <span className="ml-2 text-xs text-tenue">
                  Lo que cuesta entero. Lo que falte después de la seña aparece en Deudores.
                </span>
              </p>
              <Campo
                etiqueta="Precio total"
                type="number"
                step="0.01"
                value={precio.total}
                onChange={cambiarPrecio('total')}
                error={errores.precioTotal}
              />
              <CampoSelect
                etiqueta="Moneda de la reserva"
                value={precio.moneda}
                onChange={cambiarPrecio('moneda')}
              >
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares</option>
              </CampoSelect>
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
                  Sin seña no se aparta el horario. Es el 50% del total, en la moneda de la reserva.
                </span>
              </p>

              {/* Quien alquila puede no ser alumno de nada —es la decisión de
                  `usuario` como raíz— así que se busca entre las cuentas y no
                  entre los alumnos. */}
              <div className="sm:col-span-2">
                <BuscadorDePersonas
                  elegida={pagador}
                  onElegir={setPagador}
                  etiqueta="Quién paga"
                />
                {errores.senaIdUsuario && (
                  <p className="mt-1 text-xs text-red">{errores.senaIdUsuario}</p>
                )}
              </div>

              <Campo
                etiqueta="Monto"
                type="number"
                step="0.01"
                value={sena.monto}
                onChange={cambiarSena('monto')}
                error={errores.senaMonto}
              />

              {/* La moneda de la seña es la de la reserva (`V33` §2): se dice, no se
                  elige — ofrecer el selector era ofrecer el bug de §17 · H4. */}
              <div>
                <span className="t-mono text-tenue">Moneda</span>
                <div className="mt-1.5 py-2 text-sm">
                  {sena.moneda === 'USD' ? 'Dólares' : 'Pesos'}
                  <span className="text-tenue"> — la de la reserva</span>
                </div>
              </div>

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

        {/* El fallo al traer los cursos lo muestra el propio buscador, debajo de
            su campo (§23 · P101): ahí es donde se ve la lista vacía que hay que
            explicar. */}
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
    </Bloque>
  )
}

