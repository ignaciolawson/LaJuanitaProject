import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  anularPago,
  invalidarComprobante,
  listarAlumnos,
  listarInscripciones,
  listarPagos,
  registrarPago,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  NOMBRE_DE_ESTADO_PAGO,
  NOMBRE_DE_MEDIO,
  type AlumnoResumen,
  type EstadoPago,
  type InscripcionResumen,
  type MedioPago,
  type Moneda,
  type PagoResumen,
} from '../api/tiposAdmin'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { hoy } from '../componentes/semana'
import { puedeOperar } from '../layout/menu'
import { importe } from '../componentes/dinero'

const ESTADOS: EstadoPago[] = ['SENADO', 'PAGADO', 'DEBE', 'VENCIDO', 'ANULADO']
/** Los que se pueden elegir al cargar: un pago no se registra ya anulado. */
const ESTADOS_DE_ALTA: EstadoPago[] = ['PAGADO', 'SENADO', 'DEBE']
const MEDIOS: MedioPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'PAYPAL', 'CUENTA_EEUU', 'OTRO']

/**
 * Módulo 3, pantalla 1 — registrar pagos.
 *
 * <p>Es la pantalla que unifica el Excel financiero con el Notion operativo, y
 * su regla central es que <b>todo pago dice qué salda</b>: la columna "Qué
 * salda" no es decoración, es el problema que el sistema viene a resolver. El
 * backend la resuelve y la manda ya legible.
 *
 * <p><b>Nada se borra.</b> Un pago mal cargado se anula —con motivo, y el autor
 * lo pone el servidor— y un comprobante equivocado se marca inválido. Las dos
 * son reglas del esquema (`V6` y `V7`), no decisiones de esta pantalla, y por eso
 * los botones dicen "Anular" y no "Eliminar".
 */
export function PagosPagina() {
  const puedeEscribir = puedeOperar(useUsuario())

  const [pagos, setPagos] = useState<PagoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoPago | ''>('')
  const [moneda, setMoneda] = useState<Moneda | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  /** El pago sobre el que se está pidiendo un motivo, y para qué. */
  const [pidiendoMotivo, setPidiendoMotivo] = useState<
    { pago: PagoResumen; que: 'anular' | 'comprobante' } | null
  >(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarPagos({ buscar, estado, moneda, pagina })
      setPagos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, moneda, pagina])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  function filtrar<T>(set: (valor: T) => void) {
    return (valor: T) => {
      set(valor)
      setPagina(0)
    }
  }

  async function confirmarMotivo(motivo: string) {
    if (!pidiendoMotivo) return

    try {
      if (pidiendoMotivo.que === 'anular') {
        await anularPago(pidiendoMotivo.pago.idPago, motivo)
      } else {
        await invalidarComprobante(pidiendoMotivo.pago.idPago, motivo)
      }
      setPidiendoMotivo(null)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo completar la operación.'
      setPidiendoMotivo(null)
      // Recargar antes de mostrar: `cargar` arranca limpiando el error.
      await cargar()
      setError(mensaje)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Pagos</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'pago' : 'pagos'}`}
          </p>
        </div>
        {puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Registrar pago</Boton>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => filtrar(setBuscar)(e.target.value)}
          placeholder="Buscar por nombre, apellido o email…"
          className="min-w-64 flex-1 rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
        />
        <select
          value={estado}
          onChange={(e) => filtrar(setEstado)(e.target.value as EstadoPago | '')}
          aria-label="Filtrar por estado"
          className="rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO_PAGO[e]}
            </option>
          ))}
        </select>
        <select
          value={moneda}
          onChange={(e) => filtrar(setMoneda)(e.target.value as Moneda | '')}
          aria-label="Filtrar por moneda"
          className="rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Las dos monedas</option>
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && puedeEscribir && (
        <FormularioPago
          onCerrar={() => setMostrandoAlta(false)}
          onGuardado={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {pidiendoMotivo && (
        <PedirMotivo
          key={`${pidiendoMotivo.pago.idPago}-${pidiendoMotivo.que}`}
          titulo={
            pidiendoMotivo.que === 'anular'
              ? 'Anular el pago'
              : 'Marcar el comprobante como inválido'
          }
          ayuda={
            pidiendoMotivo.que === 'anular'
              ? 'El pago no se borra: queda registrado como anulado, con tu nombre y la fecha. Deja de contar en la caja.'
              : 'El comprobante no se borra: queda marcado como inválido, con tu nombre y la fecha.'
          }
          onCerrar={() => setPidiendoMotivo(null)}
          onConfirmar={confirmarMotivo}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
              <th className="px-4 py-3 font-semibold">Quién</th>
              <th className="px-4 py-3 font-semibold">Qué salda</th>
              <th className="px-4 py-3 font-semibold">Monto</th>
              <th className="px-4 py-3 font-semibold">Medio</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {pagos.map((p) => (
              <tr key={p.idPago} className={p.estadoPago === 'ANULADO' ? 'text-apagado' : ''}>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/estado-de-cuenta/${p.idUsuario}`}
                    className="font-medium underline underline-offset-2 hover:text-red"
                  >
                    {p.apellido}, {p.nombre}
                  </Link>
                  <div className="text-xs text-tenue">{p.email}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{p.queSalda}</div>
                  {p.concepto && <div className="text-xs text-tenue">{p.concepto}</div>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className={`font-medium ${p.estadoPago === 'ANULADO' ? 'line-through' : ''}`}>
                    {importe(p.monto, p.moneda)}
                  </div>
                  {p.descuentoPorcentaje > 0 && (
                    <div className="text-xs text-tenue" title={p.motivoDescuento ?? undefined}>
                      {p.descuentoPorcentaje}% de descuento
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-tenue">{NOMBRE_DE_MEDIO[p.medioPago]}</td>
                <td className="px-4 py-3 whitespace-nowrap text-tenue">{fechaCorta(p.fechaPago)}</td>
                <td className="px-4 py-3">
                  <EtiquetaDeEstado pago={p} />
                </td>
                <td className="px-4 py-3">
                  {puedeEscribir && p.estadoPago !== 'ANULADO' && (
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      {p.comprobantePath && !p.comprobanteInvalido && (
                        <button
                          type="button"
                          onClick={() => setPidiendoMotivo({ pago: p, que: 'comprobante' })}
                          className="text-xs text-tenue underline underline-offset-2 hover:text-red"
                        >
                          Invalidar comprobante
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPidiendoMotivo({ pago: p, que: 'anular' })}
                        className="text-xs text-tenue underline underline-offset-2 hover:text-red"
                      >
                        Anular
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!cargando && pagos.length === 0 && (
        <p className="mt-4 text-center text-sm text-tenue">No hay pagos que coincidan.</p>
      )}

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
 * El estado, y por qué se anuló si se anuló.
 *
 * <p>El motivo se muestra: una fila anulada sin explicación obliga a preguntarle
 * a quien la anuló, que es exactamente lo que `V7` quiso evitar al exigirlo.
 */
function EtiquetaDeEstado({ pago }: { pago: PagoResumen }) {
  const color =
    pago.estadoPago === 'VENCIDO' || pago.estadoPago === 'DEBE'
      ? 'border-red/30 bg-red/5 text-red'
      : pago.estadoPago === 'ANULADO'
        ? 'border-linea bg-papel text-apagado'
        : 'border-linea bg-papel text-tenue'

  return (
    <div>
      <span className={`inline-block rounded border px-2 py-0.5 text-xs ${color}`}>
        {NOMBRE_DE_ESTADO_PAGO[pago.estadoPago]}
      </span>
      {pago.motivoAnulacion && (
        <div className="mt-1 max-w-40 text-xs text-apagado">{pago.motivoAnulacion}</div>
      )}
      {pago.comprobanteInvalido && (
        <div className="mt-1 text-xs text-red">Comprobante inválido</div>
      )}
    </div>
  )
}

function fechaCorta(iso: string): string {
  return iso.split('-').reverse().join('/')
}

/**
 * Las dos operaciones de reversa piden lo mismo: un motivo.
 *
 * <p>Un formulario y no un {@code prompt()}: `V7` exige el motivo y lo guarda
 * para siempre, así que merece un campo con su explicación al lado y no una
 * ventanita del navegador que se cierra con Escape sin avisar.
 */
function PedirMotivo({
  titulo,
  ayuda,
  onCerrar,
  onConfirmar,
}: {
  titulo: string
  ayuda: string
  onCerrar: () => void
  onConfirmar: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!motivo.trim()) {
          setError('Escribí el motivo.')
          return
        }
        onConfirmar(motivo.trim())
      }}
      className="mb-6 rounded-lg border border-linea bg-white p-5"
    >
      <h3 className="mb-1 font-semibold">{titulo}</h3>
      <p className="mb-4 text-sm text-tenue">{ayuda}</p>

      <Campo
        etiqueta="Motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Se cargó dos veces, el monto era otro…"
        error={error ?? undefined}
      />

      <div className="mt-5 flex gap-3">
        <Boton type="submit">Confirmar</Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/**
 * Registrar un pago.
 *
 * <p><b>Hoy solo salda inscripciones</b>, y los otros tres destinos que el esquema
 * admite se cobran cada uno desde su propia pantalla, en la misma transacción que
 * crea lo que saldan:
 *
 * <ul>
 *   <li><b>Reserva</b> — la seña, desde el calendario (`V10` la exige al COMMIT,
 *       así que no puede llegar después).
 *   <li><b>Venta de equipo</b> — el cobro, desde `/admin/ventas` (2026-08-17).
 *   <li><b>Trabajo de mastering</b> — todavía no existe: llega con el Módulo 6.
 * </ul>
 *
 * <p><b>Lo que eso deja abierto, y conviene saberlo:</b> una venta cargada sin
 * cobro no tiene después por dónde cobrarse, porque esta pantalla no acepta ese
 * destino. Aceptarlo es rehacer este formulario —hoy es alumno → sus
 * inscripciones— y nadie pidió todavía la venta en cuotas.
 */
function FormularioPago({
  onCerrar,
  onGuardado,
}: {
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([])
  const [contratos, setContratos] = useState<InscripcionResumen[]>([])
  const [datos, setDatos] = useState({
    idAlumno: '',
    idInscripcion: '',
    monto: '',
    moneda: 'ARS' as Moneda,
    cotizacionDolar: '',
    medioPago: 'EFECTIVO' as MedioPago,
    estadoPago: 'PAGADO' as EstadoPago,
    fechaPago: hoy(),
    concepto: '',
    descuentoPorcentaje: '',
    motivoDescuento: '',
    comprobantePath: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarAlumnos({ pagina: 0 })
      .then((r) => setAlumnos(r.contenido))
      .catch(() => setErrorGeneral('No se pudo cargar el listado de alumnos.'))
  }, [])

  // Las inscripciones del alumno elegido: son las que puede saldar. Pedirlas al
  // elegir y no todas juntas evita traer cientos para llenar un selector de dos.
  useEffect(() => {
    if (!datos.idAlumno) {
      setContratos([])
      return
    }
    listarInscripciones({ idAlumno: Number(datos.idAlumno) })
      .then((r) => setContratos(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar las inscripciones.'))
  }, [datos.idAlumno])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  const alumno = alumnos.find((a) => String(a.idAlumno) === datos.idAlumno)

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.idAlumno) locales.idAlumno = 'Elegí de quién es el pago.'
    if (!datos.idInscripcion) locales.destinoUnico = 'Elegí qué curso salda este pago.'
    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
    // Las tres reglas del esquema, adelantadas para marcar el campo.
    if (datos.moneda === 'USD' && !datos.cotizacionDolar) {
      locales.cotizacionPresenteSiEsUsd = 'Un pago en dólares necesita la cotización del día.'
    }
    if (Number(datos.descuentoPorcentaje) > 0 && !datos.motivoDescuento.trim()) {
      locales.descuentoJustificado = 'Un descuento necesita una justificación escrita.'
    }
    if (Number(datos.descuentoPorcentaje) > 100) {
      locales.descuentoPorcentaje = 'El descuento es un porcentaje: no puede pasar de 100.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await registrarPago({
        idUsuario: alumno!.idUsuario,
        idInscripcion: Number(datos.idInscripcion),
        monto: Number(datos.monto),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : null,
        medioPago: datos.medioPago,
        estadoPago: datos.estadoPago,
        fechaPago: datos.fechaPago,
        concepto: datos.concepto || undefined,
        descuentoPorcentaje: datos.descuentoPorcentaje
          ? Number(datos.descuentoPorcentaje)
          : undefined,
        motivoDescuento: datos.motivoDescuento || undefined,
        comprobantePath: datos.comprobantePath || undefined,
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
      <h3 className="mb-4 font-semibold">Registrar pago</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Alumno"
          value={datos.idAlumno}
          onChange={(e) =>
            setDatos((previo) => ({ ...previo, idAlumno: e.target.value, idInscripcion: '' }))
          }
          error={errores.idAlumno}
        >
          <option value="">Elegí uno</option>
          {alumnos.map((a) => (
            <option key={a.idAlumno} value={a.idAlumno}>
              {a.apellido}, {a.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Qué salda"
          value={datos.idInscripcion}
          onChange={cambiar('idInscripcion')}
          error={errores.destinoUnico}
        >
          <option value="">
            {datos.idAlumno ? 'Elegí el curso' : 'Elegí primero el alumno'}
          </option>
          {contratos.map((i) => (
            <option key={i.idInscripcion} value={i.idInscripcion}>
              {NOMBRE_DE_DISCIPLINA[i.disciplina]}
              {i.nivel ? ` · ${i.nivel.toLowerCase()}` : ''} — {importe(i.precioTotal, i.moneda)}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Monto"
          type="number"
          step="0.01"
          value={datos.monto}
          onChange={cambiar('monto')}
          error={errores.monto}
        />

        <CampoSelect etiqueta="Moneda" value={datos.moneda} onChange={cambiar('moneda')}>
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </CampoSelect>

        {/* Solo cuando hace falta: un campo de cotización siempre visible en un
            estudio que cobra casi todo en pesos es ruido en cada carga. */}
        {datos.moneda === 'USD' && (
          <Campo
            etiqueta="Cotización del dólar"
            type="number"
            step="0.01"
            value={datos.cotizacionDolar}
            onChange={cambiar('cotizacionDolar')}
            ayuda="Sin esto el importe no se puede reconstruir después."
            error={errores.cotizacionPresenteSiEsUsd}
          />
        )}

        <CampoSelect etiqueta="Cómo pagó" value={datos.medioPago} onChange={cambiar('medioPago')}>
          {MEDIOS.map((m) => (
            <option key={m} value={m}>
              {NOMBRE_DE_MEDIO[m]}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect etiqueta="Estado" value={datos.estadoPago} onChange={cambiar('estadoPago')}>
          {ESTADOS_DE_ALTA.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO_PAGO[e]}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Fecha del pago"
          type="date"
          value={datos.fechaPago}
          onChange={cambiar('fechaPago')}
          ayuda="Puede ser anterior a hoy: es la del hecho, no la de la carga."
        />

        <Campo
          etiqueta="Concepto"
          value={datos.concepto}
          onChange={cambiar('concepto')}
          placeholder="Seña, segunda cuota…"
        />

        <Campo
          etiqueta="Descuento (%)"
          type="number"
          step="0.01"
          value={datos.descuentoPorcentaje}
          onChange={cambiar('descuentoPorcentaje')}
          ayuda="Es un porcentaje, no un importe. El monto de arriba es lo que se cobró."
          error={errores.descuentoPorcentaje}
        />

        {Number(datos.descuentoPorcentaje) > 0 && (
          <Campo
            etiqueta="Por qué el descuento"
            value={datos.motivoDescuento}
            onChange={cambiar('motivoDescuento')}
            error={errores.descuentoJustificado}
          />
        )}

        <Campo
          etiqueta="Comprobante"
          value={datos.comprobantePath}
          onChange={cambiar('comprobantePath')}
          placeholder="/comprobantes/…"
          className="sm:col-span-2"
        />
      </div>

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Registrar'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
