import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { listarSalas } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { resumenFinanciero, tableroCompleto } from '../api/tablero'
import type { CajaDelPeriodo, SalaResumen } from '../api/tiposAdmin'
import type {
  CobrosPendientes,
  Franja,
  Ocupacion,
  Retencion,
  Tablero,
} from '../api/tiposTablero'
import { DIAS_DE_LA_SEMANA, NOMBRE_DE_LINEA } from '../api/tiposTablero'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { importe } from '../componentes/dinero'
import { capitalizar, NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { hoy, sumarDias } from '../componentes/semana'
import { puedeVerElTableroCompleto } from '../layout/menu'

/**
 * Módulo 8 — el tablero de dirección.
 *
 * **Solo lectura, y cada número se abre en su módulo.** No hay un botón que
 * modifique nada: si un número está mal, se corrige donde ese dato se carga. Los
 * enlaces "ver detalle" son el drill-down que pide §11 y llevan el mismo período
 * que está en pantalla, para que el detalle no conteste sobre otro mes.
 *
 * **Dos lecturas, dos endpoints.** ADMIN y DIRECTIVO ven el tablero entero;
 * STAFF ve el resumen financiero básico. La pantalla es la misma y lo que
 * cambia es qué pide — no un tablero completo con partes escondidas, porque un
 * campo escondido con un `if` viaja igual por HTTP y se lee con las
 * herramientas del navegador.
 *
 * **Y la distinción que la pantalla tiene que decir en voz alta: no todo es del
 * período.** Los alumnos activos, la deuda y la retención son fotos de hoy; los
 * ingresos, la ocupación y las entregas son del período elegido. Mezclarlos sin
 * aclararlo es la forma más barata que tiene un tablero de mentir — alguien
 * mira agosto, ve la deuda y cree que se generó en agosto.
 */
export function TableroPagina() {
  // `useUsuario` y no `useAuth`: esta pantalla vive dentro de una ruta
  // protegida, así que el usuario ya está y no hay `null` que discriminar.
  const completo = puedeVerElTableroCompleto(useUsuario())

  const [desde, setDesde] = useState(() => primerDiaDelMes())
  const [hasta, setHasta] = useState(() => hoy())
  const [idSala, setIdSala] = useState<number | ''>('')

  const [tablero, setTablero] = useState<Tablero | null>(null)
  const [caja, setCaja] = useState<CajaDelPeriodo[]>([])
  const [pendientes, setPendientes] = useState<CobrosPendientes[]>([])
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!completo) return
    listarSalas(true)
      .then(setSalas)
      .catch(() => setError('No se pudo cargar el catálogo de salas.'))
  }, [completo])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      if (completo) {
        const datos = await tableroCompleto({
          desde,
          hasta,
          idSala: idSala === '' ? undefined : idSala,
        })
        setTablero(datos)
        setCaja(datos.caja)
        setPendientes(datos.pendientes)
      } else {
        const datos = await resumenFinanciero(desde, hasta)
        setCaja(datos.caja)
        setPendientes(datos.pendientes)
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el tablero.')
      // Igual que el informe de uso: sin esto quedan en pantalla los números del
      // período anterior con un error arriba, y se leen como si fueran los
      // pedidos. Un tablero equivocado es peor que ninguno.
      setTablero(null)
      setCaja([])
      setPendientes([])
    } finally {
      setCargando(false)
    }
  }, [completo, desde, hasta, idSala])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const rango = `desde=${desde}&hasta=${hasta}`

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {completo ? 'Tablero de dirección' : 'Resumen financiero'}
        </h2>
        <p className="mt-1 text-sm text-tenue">
          {cargando ? 'Cargando…' : `Del ${legible(desde)} al ${legible(hasta)}`}
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="w-40"
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="w-40"
        />
        {completo && (
          <select
            value={idSala}
            onChange={(e) => setIdSala(e.target.value === '' ? '' : Number(e.target.value))}
            aria-label="Filtrar la ocupación por sala"
            className="rounded-md border border-linea bg-white px-3 py-2.5 text-sm outline-none focus:border-red"
          >
            <option value="">Todas las salas</option>
            {salas.map((s) => (
              <option key={s.idSala} value={s.idSala}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}

        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => mes(setDesde, setHasta)}>
            Este mes
          </Boton>
          <Boton
            variante="secundario"
            onClick={() => {
              setDesde(sumarDias(hoy(), -90))
              setHasta(hoy())
            }}
          >
            90 días
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {/* -- La plata del período, que es lo que ven los dos ------------------ */}
      <Seccion titulo="La caja del período" detalle={`/admin/caja?${rango}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          {caja.map((c) => (
            <div key={c.moneda} className="rounded-lg border border-linea bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h4 className="font-semibold">{c.moneda === 'USD' ? 'Dólares' : 'Pesos'}</h4>
                <span className="text-sm text-tenue">
                  {c.cantidadDePagos} {c.cantidadDePagos === 1 ? 'cobro' : 'cobros'}
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {importe(c.neto, c.moneda)}
              </p>
              <p className="text-xs text-tenue">
                {importe(c.ingresos, c.moneda)} entraron · {importe(c.egresos, c.moneda)} salieron
              </p>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion
        titulo="Cobros pendientes"
        aclaracion="Toda la deuda viva, no solo la del período"
        detalle="/admin/deudores"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {pendientes.map((p) => (
            <div key={p.moneda} className="rounded-lg border border-linea bg-white p-5">
              <div className="flex items-baseline justify-between">
                <h4 className="font-semibold">{p.moneda === 'USD' ? 'Dólares' : 'Pesos'}</h4>
                <span className="text-sm text-tenue">
                  {p.cantidad} {p.cantidad === 1 ? 'renglón' : 'renglones'}
                </span>
              </div>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {importe(p.monto, p.moneda)}
              </p>
              {p.cantidadVencida > 0 ? (
                <p className="text-xs text-red">
                  {importe(p.vencido, p.moneda)} vencidos ({p.cantidadVencida})
                </p>
              ) : (
                <p className="text-xs text-tenue">Nada vencido</p>
              )}
            </div>
          ))}
        </div>
      </Seccion>

      {/* -- Y lo que es solo de dirección ----------------------------------- */}
      {completo && tablero && (
        <>
          <Seccion titulo="De dónde salió la plata" aclaracion="Del período elegido">
            <div className="grid gap-4 sm:grid-cols-2">
              {['ARS', 'USD'].map((moneda) => {
                const lineas = tablero.ingresos.filter((i) => i.moneda === moneda)
                const total = lineas.reduce((suma, l) => suma + l.monto, 0)
                return (
                  <div key={moneda} className="rounded-lg border border-linea bg-white p-5">
                    <h4 className="font-semibold">{moneda === 'USD' ? 'Dólares' : 'Pesos'}</h4>
                    <ul className="mt-3 space-y-2">
                      {lineas.map((l) => (
                        <li key={l.linea} className="text-sm">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate">{NOMBRE_DE_LINEA[l.linea]}</span>
                            <span className="whitespace-nowrap text-tenue">
                              {importe(l.monto, l.moneda)}
                            </span>
                          </div>
                          <div className="mt-1 h-1 rounded bg-papel">
                            <div
                              style={{ width: `${total > 0 ? (l.monto / total) * 100 : 0}%` }}
                              className="h-1 rounded bg-red"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </Seccion>

          <Seccion
            titulo="Alumnos cursando"
            aclaracion="Al día de hoy, no del período"
            detalle="/admin/alumnos"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {tablero.alumnos.map((a) => (
                <div
                  key={`${a.disciplina}-${a.nivel ?? 'sin'}`}
                  className="rounded-lg border border-linea bg-white p-5"
                >
                  <h4 className="font-semibold">{NOMBRE_DE_DISCIPLINA[a.disciplina]}</h4>
                  {a.nivel && a.nivel !== 'SIN_NIVEL' && (
                    <p className="text-xs text-tenue">{capitalizar(a.nivel)}</p>
                  )}
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{a.alumnos}</p>
                  <p className="text-xs text-tenue">
                    {a.inscripciones} {a.inscripciones === 1 ? 'inscripción' : 'inscripciones'}
                  </p>
                </div>
              ))}
            </div>
          </Seccion>

          <Seccion
            titulo="Cuándo se llena el estudio"
            aclaracion="Reservas que empiezan en cada franja, del período elegido"
            detalle={`/admin/uso-salas?${rango}`}
          >
            <Grilla ocupacion={tablero.ocupacion} />
          </Seccion>

          <Seccion titulo="Retención" aclaracion="Al día de hoy, sobre ventanas ya cerradas">
            <TarjetaDeRetencion retencion={tablero.retencion} />
          </Seccion>

          <div className="grid gap-4 md:grid-cols-2">
            <Seccion titulo="Mix & Mastering" detalle="/admin/mix-mastering">
              <div className="rounded-lg border border-linea bg-white p-5">
                <ul className="space-y-1 text-sm">
                  {tablero.mixMastering.porEstado.map((e) => (
                    <li key={e.estado} className="flex justify-between gap-3">
                      <span>{capitalizar(e.estado.replace('_', ' '))}</span>
                      <span className="text-tenue">{e.cantidad}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-linea pt-3 text-xs text-tenue">
                  {tablero.mixMastering.entregadosEnElPeriodo} entregados en el período
                </p>
                {tablero.mixMastering.conRevisionesDeMas > 0 && (
                  <p className="text-xs text-red">
                    {tablero.mixMastering.conRevisionesDeMas} pasaron las revisiones incluidas
                  </p>
                )}
              </div>
            </Seccion>

            <Seccion titulo="El sello" detalle="/admin/sello">
              <div className="rounded-lg border border-linea bg-white p-5">
                <ul className="space-y-1 text-sm">
                  {tablero.sello.porEstado.map((e) => (
                    <li key={e.estado} className="flex justify-between gap-3">
                      <span>{capitalizar(e.estado.replace('_', ' '))}</span>
                      <span className="text-tenue">{e.cantidad}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 border-t border-linea pt-3 text-xs text-tenue">
                  {tablero.sello.publicadosEnElPeriodo} publicados en el período
                </p>
                {/* Una excepción firmada a una regla dura es exactamente lo que
                    la dirección tiene que poder ver. No se esconde. */}
                {tablero.sello.publicadosSinContrato > 0 && (
                  <p className="text-xs text-red">
                    {tablero.sello.publicadosSinContrato} publicados sin contrato
                  </p>
                )}
                <p className="mt-2 text-xs text-tenue">
                  {tablero.sello.apariciones.length === 0
                    ? 'Sin apariciones cargadas en el período.'
                    : tablero.sello.apariciones
                        .map((a) => `${a.cantidad} en ${capitalizar(a.tipo)}`)
                        .join(' · ')}
                </p>
              </div>
            </Seccion>
          </div>
        </>
      )}

      {/* Lo que STAFF no ve, dicho en vez de omitido: el mismo criterio que los
          bloques "todavía no disponible" de la ficha del alumno. Una pantalla
          más corta sin explicación se lee como un sistema a medio hacer. */}
      {!completo && !cargando && (
        <p className="mt-8 text-sm text-apagado">
          El tablero completo —ocupación, retención y actividad del sello— es de dirección.
        </p>
      )}
    </div>
  )
}

/** Un bloque con su título, su aclaración de período y su enlace al detalle. */
function Seccion({
  titulo,
  aclaracion,
  detalle,
  children,
}: {
  titulo: string
  aclaracion?: string
  detalle?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">{titulo}</h3>
          {aclaracion && <p className="text-xs text-tenue">{aclaracion}</p>}
        </div>
        {detalle && (
          <Link to={detalle} className="whitespace-nowrap text-sm text-red hover:underline">
            Ver detalle
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * La grilla de ocupación: días en filas, franjas en columnas.
 *
 * La intensidad del color es relativa a la casilla más ocupada del período, no a
 * un máximo absoluto: lo que se viene a mirar acá es *cuál* es la franja
 * cargada, no cuántas reservas entran en una hora.
 */
function Grilla({ ocupacion }: { ocupacion: Ocupacion }) {
  const maximo = Math.max(1, ...ocupacion.franjas.map((f) => f.reservas))

  return (
    <div className="overflow-x-auto rounded-lg border border-linea bg-white p-4">
      <table className="w-full min-w-[32rem] border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="w-10" />
            {ocupacion.horas.map((h) => (
              <th key={h} className="font-normal text-tenue">
                {String(h).padStart(2, '0')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIAS_DE_LA_SEMANA.map((nombre, indice) => (
            <tr key={nombre}>
              <th scope="row" className="pr-1 text-right font-normal text-tenue">
                {nombre}
              </th>
              {ocupacion.horas.map((hora) => (
                <Casilla
                  key={hora}
                  franja={ocupacion.franjas.find((f) => f.dia === indice + 1 && f.hora === hora)}
                  dia={nombre}
                  hora={hora}
                  maximo={maximo}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Casilla({
  franja,
  dia,
  hora,
  maximo,
}: {
  franja: Franja | undefined
  dia: string
  hora: number
  maximo: number
}) {
  const reservas = franja?.reservas ?? 0

  return (
    <td
      // El título es lo que hace legible la casilla vacía: sin él, un cuadrado
      // gris no dice si no hubo nada o si el dato no llegó.
      title={`${dia} ${String(hora).padStart(2, '0')}:00 — ${reservas} ${
        reservas === 1 ? 'reserva' : 'reservas'
      }`}
      className="h-6 rounded text-center"
      style={{
        backgroundColor:
          reservas === 0 ? 'var(--color-papel, #f4f4f4)' : `rgba(214, 40, 40, ${reservas / maximo})`,
      }}
    >
      <span className="sr-only">
        {dia} {hora}: {reservas}
      </span>
    </td>
  )
}

/**
 * La tasa de retención.
 *
 * **Con denominador cero dice que no hay a quién medir, no "0%".** Un cero se
 * lee como que se fueron todos, y lo que pasa es lo contrario: nadie cerró
 * todavía su ventana de 10 meses.
 */
function TarjetaDeRetencion({ retencion }: { retencion: Retencion }) {
  return (
    <div className="rounded-lg border border-linea bg-white p-5">
      {retencion.tasa === null ? (
        <>
          <p className="text-2xl font-semibold tracking-tight text-apagado">Sin datos todavía</p>
          <p className="mt-1 text-sm text-tenue">
            Nadie cumplió aún los 10 meses desde su primer servicio, así que todavía no hay a quién
            medir.
          </p>
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold tracking-tight">{retencion.tasa}%</p>
          <p className="mt-1 text-sm text-tenue">
            {retencion.retenidos} de {retencion.conVentanaCerrada} contrataron un segundo servicio
            dentro de los 10 meses del primero.
          </p>
        </>
      )}
      <p className="mt-3 border-t border-linea pt-3 text-xs text-apagado">
        Se calcula solo sobre quienes ya cumplieron los 10 meses: quien contrató hace poco todavía
        puede volver.
      </p>
    </div>
  )
}

function primerDiaDelMes(): string {
  return `${hoy().slice(0, 7)}-01`
}

function mes(setDesde: (v: string) => void, setHasta: (v: string) => void) {
  setDesde(primerDiaDelMes())
  setHasta(hoy())
}

function legible(iso: string): string {
  return iso.split('-').reverse().join('/')
}
