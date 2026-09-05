import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import {
  abrirComprobante,
  adjuntarComprobante,
  agenda,
  anularPago,
  cobrarPago,
  editarPago,
  invalidarComprobante,
  listarAlumnos,
  listarInscripciones,
  listarPagos,
  listarUsuarios,
  listarVentas,
  registrarPago,
  totalesPorLinea,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import { listarTrabajos } from '../api/mastering'
import type { TrabajoResumen } from '../api/tiposMastering'
import {
  NOMBRE_DE_GRUPO,
  NOMBRE_DE_ESTADO_PAGO,
  NOMBRE_DE_LINEA,
  NOMBRE_DE_MEDIO,
  type AlumnoResumen,
  type ComprobanteResumen,
  type DestinoDePago,
  type GrupoDePago,
  type EstadoPago,
  type InscripcionResumen,
  type MedioPago,
  type Moneda,
  type PagoResumen,
  type ReservaResumen,
  type TotalDeLinea,
  type UsuarioResumen,
  type VentaResumen,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Bloque } from '../componentes/Bloque'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Filtros, FiltroSelect, FiltroTexto } from '../componentes/Filtros'
import { AdjuntarComprobante, Comprobantes } from '../componentes/Comprobantes'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { fecha, hoy } from '../componentes/semana'
import { importe } from '../componentes/dinero'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { Tabla, Celda } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

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
  const puedeEscribir = usePuedeEscribir()

  const [pagos, setPagos] = useState<PagoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoPago | ''>('')
  const [moneda, setMoneda] = useState<Moneda | ''>('')
  /** La solapa elegida (§13 · B2). Vacío = todas. */
  const [grupo, setGrupo] = useState<GrupoDePago | ''>('')
  /** Los números de la barra de solapas. Vacío mientras no vuelvan. */
  const [totales, setTotales] = useState<TotalDeLinea[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  /** El pago que se está corrigiendo (`V19` §2). Null = no hay ninguno abierto. */
  const [editando, setEditando] = useState<PagoResumen | null>(null)
  /**
   * El pago sobre el que se está pidiendo un motivo, y para qué.
   *
   * Desde `V21` invalidar necesita además **cuál** comprobante: un pago puede
   * tener varios, y el que no sirve es uno solo.
   */
  const [pidiendoMotivo, setPidiendoMotivo] = useState<
    | { pago: PagoResumen; que: 'anular' }
    | { pago: PagoResumen; que: 'comprobante'; comprobante: ComprobanteResumen }
    | null
  >(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarPagos({ buscar, estado, moneda, grupo, pagina })
      setPagos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, moneda, grupo, pagina])

  /**
   * Los números de la barra, en un pedido aparte del listado.
   *
   * **No depende de `grupo` ni de `pagina`, y las dos ausencias son la decisión.**
   * De la solapa, porque la barra muestra TODAS —cada una con su número, sin que
   * haya que entrar a verla, que es lo que se pidió cuando estaba *"todo en la
   * misma bolsa"*—; de la página, porque un total que cambiara al pasar de página
   * no sería un total.
   *
   * Si falla, la barra queda sin números y las solapas siguen funcionando: es un
   * dato de más, no el contenido de la pantalla.
   */
  const cargarTotales = useCallback(async () => {
    try {
      setTotales(await totalesPorLinea({ buscar, estado, moneda }))
    } catch {
      setTotales([])
    }
  }, [buscar, estado, moneda])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  useEffect(() => {
    const id = setTimeout(cargarTotales, 250)
    return () => clearTimeout(id)
  }, [cargarTotales])

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
        await invalidarComprobante(
          pidiendoMotivo.pago.idPago,
          pidiendoMotivo.comprobante.idComprobante,
          motivo,
        )
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

  /**
   * Adjuntar es un pedido aparte del alta: el archivo no viaja adentro del JSON.
   * Se recarga el listado para que la fila muestre el comprobante recién subido.
   */
  async function adjuntar(idPago: number, archivo: File) {
    try {
      await adjuntarComprobante(idPago, archivo)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo adjuntar el comprobante.'
      await cargar()
      setError(mensaje)
    }
  }

  /**
   * Entró la plata que estaba anotada (`mejoras.md` §13 · C1).
   *
   * **Sin confirmación previa**, a diferencia de anular: cobrar no deshace nada y
   * lo que hace se ve enseguida en la fila. Y si esa deuda sostenía una prereserva,
   * el backend además confirma la reserva — por eso se recarga la lista y no se
   * parchea la fila en memoria: lo que cambió no es sólo este renglón.
   */
  async function cobrar(pago: PagoResumen) {
    try {
      await cobrarPago(pago.idPago)
      await cargar()
      await cargarTotales()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar el cobro.')
    }
  }

  async function abrir(idPago: number, comprobante: ComprobanteResumen) {
    try {
      await abrirComprobante(idPago, comprobante.idComprobante)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo abrir el comprobante.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Pagos"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'pago' : 'pagos'}`}</>}
        acciones={<>{puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Registrar pago</Boton>}</>}
      />

      <AvisoSoloLectura />

      <Filtros>
        <FiltroTexto
          etiqueta="Buscar"
          valor={buscar}
          onCambio={filtrar(setBuscar)}
          placeholder="Buscar por nombre, apellido o email…"
        />
        <FiltroSelect
          etiqueta="Filtrar por estado"
          valor={estado}
          onCambio={(v: string) => filtrar(setEstado)(v as EstadoPago | '')}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO_PAGO[e]}
            </option>
          ))}
        </FiltroSelect>
        <FiltroSelect
          etiqueta="Filtrar por moneda"
          valor={moneda}
          onCambio={(v: string) => filtrar(setMoneda)(v as Moneda | '')}
        >
          <option value="">Las dos monedas</option>
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </FiltroSelect>
      </Filtros>

      <SolapasDeLinea
        elegida={grupo}
        totales={totales}
        onElegir={(g) => filtrar(setGrupo)(g)}
      />

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

      {editando && puedeEscribir && (
        <FormularioCorreccion
          pago={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
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

      <Tabla columnas={['Quién', 'Qué salda', 'Monto', 'Medio', 'Fecha', 'Estado', 'Comprobante', '']}>
            {pagos.map((p) => (
              <tr key={p.idPago} className={p.estadoPago === 'ANULADO' ? 'text-apagado' : ''}>
                <Celda>
                  {/* **El pagador sin cuenta se muestra igual pero no se linkea**
                      (`V19`): no tiene estado de cuenta al que llevar. Se usa
                      `pagador`, que el servidor arma por el camino que sea y
                      siempre tiene valor — una fila de plata sin nombre es
                      justamente el problema que este sistema resuelve. */}
                  {p.pagadorSinCuenta ? (
                    <div className="font-medium">
                      {p.pagador}
                      <span className="ml-2 text-xs font-normal text-apagado">sin cuenta</span>
                    </div>
                  ) : (
                    <>
                      <Link
                        to={`/admin/estado-de-cuenta/${p.idUsuario}`}
                        className="font-medium underline underline-offset-2 hover:text-acento"
                      >
                        {p.apellido}, {p.nombre}
                      </Link>
                      <div className="text-xs text-tenue">{p.email}</div>
                    </>
                  )}
                </Celda>
                <Celda>
                  <div>{p.queSalda}</div>
                  {/* La línea de negocio, no el destino: una seña de clase apunta
                      a una reserva y es plata de cursos. La resuelve el servidor
                      con la misma expresión que usa el Tablero. */}
                  {p.lineaDeNegocio && (
                    <div className="t-mono mt-0.5 text-tenue">
                      {NOMBRE_DE_LINEA[p.lineaDeNegocio]}
                    </div>
                  )}
                  {p.concepto && <div className="text-xs text-tenue">{p.concepto}</div>}
                </Celda>
                <Celda className="whitespace-nowrap">
                  <div className={`font-medium ${p.estadoPago === 'ANULADO' ? 'line-through' : ''}`}>
                    {importe(p.monto, p.moneda)}
                  </div>
                  {p.descuentoPorcentaje > 0 && (
                    <div className="text-xs text-tenue" title={p.motivoDescuento ?? undefined}>
                      {p.descuentoPorcentaje}% de descuento
                    </div>
                  )}
                </Celda>
                <Celda className="text-tenue">{NOMBRE_DE_MEDIO[p.medioPago]}</Celda>
                <Celda className="whitespace-nowrap text-tenue">{fecha(p.fechaPago)}</Celda>
                <Celda>
                  <EtiquetaDeEstado pago={p} />
                </Celda>
                <Celda className="align-top">
                  <Comprobantes
                    comprobantes={p.comprobantes}
                    onVer={(c) => void abrir(p.idPago, c)}
                    onInvalidar={
                      puedeEscribir
                        ? (c) => setPidiendoMotivo({ pago: p, que: 'comprobante', comprobante: c })
                        : undefined
                    }
                  />
                  {/* Adjuntar sigue disponible en un pago anulado, al revés que
                      corregirlo: aparece el respaldo de algo que se había anulado
                      justamente por no encontrarlo, y esconderlo obligaría a
                      cargar el pago de nuevo para poder guardar el papel. */}
                  {puedeEscribir && (
                    <div className="mt-1">
                      <AdjuntarComprobante
                        onElegir={(archivo) => adjuntar(p.idPago, archivo)}
                        etiqueta={p.comprobantes.length === 0 ? 'Adjuntar' : 'Adjuntar otro'}
                      />
                    </div>
                  )}
                </Celda>
                <Celda>
                  {puedeEscribir && p.estadoPago !== 'ANULADO' && (
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      {/* **Corregir viene antes que anular, y ese orden importa.**
                          Hasta `V19` la única salida para un pago mal cargado era
                          anularlo y volver a cargarlo; ahora corregir el monto o la
                          fecha es una edición común. Anular queda para lo que de
                          verdad es una baja, no para arreglar un tipeo. */}
                      {/* **Cobrar sólo aparece sobre una deuda**, y es la acción
                          que faltaba: hasta §13 · C1 una fila en DEBE no tenía
                          forma de pasar a cobrada — el estado de un pago no se
                          edita— así que el único camino era anular y recargar. Va
                          primero porque es lo que se viene a hacer a esta fila.

                          ⚠️ Si esa deuda sostiene una prereserva, esto además
                          **confirma la reserva**: son un acto y no dos. */}
                      {(p.estadoPago === 'DEBE' || p.estadoPago === 'VENCIDO') && (
                        <Boton variante="enlace" type="button" onClick={() => void cobrar(p)}>
                          Cobrar
                        </Boton>
                      )}
                      <Boton variante="enlace"
                        type="button"
                        onClick={() => setEditando(p)}>
                        Corregir
                      </Boton>
                      <Boton variante="enlace"
                        type="button"
                        onClick={() => setPidiendoMotivo({ pago: p, que: 'anular' })}>
                        Anular
                      </Boton>
                    </div>
                  )}
                </Celda>
              </tr>
            ))}
          </Tabla>

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
      ? 'border-red/30 bg-red/5 text-acento'
      : pago.estadoPago === 'ANULADO'
        ? 'border-linea bg-superficie-2 text-apagado'
        : 'border-linea bg-superficie-2 text-tenue'

  return (
    <div>
      <span className={`inline-block rounded border px-2 py-0.5 text-xs ${color}`}>
        {NOMBRE_DE_ESTADO_PAGO[pago.estadoPago]}
      </span>
      {pago.motivoAnulacion && (
        <div className="mt-1 max-w-40 text-xs text-apagado">{pago.motivoAnulacion}</div>
      )}
    </div>
  )
}

/**
 * Las dos operaciones de reversa piden lo mismo: un motivo.
 *
 * <p>Un formulario y no un {@code prompt()}: `V7` exige el motivo y lo guarda
 * para siempre, así que merece un campo con su explicación al lado y no una
 * ventanita del navegador que se cierra con Escape sin avisar.
 */
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
/**
 * Corregir un pago mal cargado (`V19` §2, `mejoras.md` §9.3).
 *
 * **Hasta `V19` la única salida era anular y volver a cargar.** Ignacio pidió
 * edición directa, y la base nunca la había prohibido: `V6` §7 bloquea el DELETE,
 * no el UPDATE. Lo que faltaba era la condición con la que se abre — **queda
 * firmado quién lo hizo**, igual que editar una asistencia en `V7` §2, y con el
 * mismo argumento: si cambiar un PRESENTE por un AUSENTE decide cuántas clases le
 * quedan a un alumno, cambiar un monto decide la caja.
 *
 * **Lo que NO se edita es la primera línea de la pantalla, no una omisión.** Ni
 * quién pagó ni qué salda: son la identidad del pago y tienen tres reglas del
 * esquema colgadas. Se dice arriba de todo para que nadie abra esto buscando
 * cambiar el alumno y crea que el campo se perdió.
 */
function FormularioCorreccion({
  pago,
  onCerrar,
  onGuardado,
}: {
  pago: PagoResumen
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [datos, setDatos] = useState({
    monto: String(pago.monto),
    moneda: pago.moneda,
    cotizacionDolar: pago.cotizacionDolar ? String(pago.cotizacionDolar) : '',
    medioPago: pago.medioPago,
    fechaPago: pago.fechaPago,
    concepto: pago.concepto ?? '',
    descuentoPorcentaje: pago.descuentoPorcentaje ? String(pago.descuentoPorcentaje) : '',
    motivoDescuento: pago.motivoDescuento ?? '',
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

    // Las mismas tres reglas del esquema que adelanta el alta, por el mismo
    // motivo: el backend rechaza con un mensaje que no nombra ningún campo, y el
    // formulario tiene que pintar de rojo el input que está mal.
    const locales: Record<string, string> = {}
    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
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
      await editarPago(pago.idPago, {
        monto: Number(datos.monto),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : null,
        medioPago: datos.medioPago,
        fechaPago: datos.fechaPago,
        concepto: datos.concepto || undefined,
        descuentoPorcentaje: datos.descuentoPorcentaje
          ? Number(datos.descuentoPorcentaje)
          : undefined,
        motivoDescuento: datos.motivoDescuento || undefined,
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
    <Bloque titulo="Corregir el pago" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        {/* Lo que no se puede cambiar, dicho antes de que lo busquen. */}
        <p className="mb-4 text-xs leading-relaxed text-tenue">
          De <strong>{pago.pagador}</strong>, por <strong>{pago.queSalda}</strong>. De quién es el
          pago y qué salda no se editan: si eso está mal, el pago es otro — anulalo y cargá el
          correcto. Tu nombre y la fecha quedan guardados con la corrección.
        </p>

        {errorGeneral && (
          <div className="mb-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
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

          {datos.moneda === 'USD' && (
            <Campo
              etiqueta="Cotización del dólar"
              type="number"
              step="0.01"
              value={datos.cotizacionDolar}
              onChange={cambiar('cotizacionDolar')}
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

          <Campo
            etiqueta="Fecha del pago"
            type="date"
            value={datos.fechaPago}
            onChange={cambiar('fechaPago')}
            error={errores.fechaPago}
          />

          <Campo
            etiqueta="Concepto"
            value={datos.concepto}
            onChange={cambiar('concepto')}
            error={errores.concepto}
          />

          <Campo
            etiqueta="Descuento (%)"
            type="number"
            step="0.01"
            value={datos.descuentoPorcentaje}
            onChange={cambiar('descuentoPorcentaje')}
            error={errores.descuentoPorcentaje}
          />

          <Campo
            etiqueta="Por qué el descuento"
            value={datos.motivoDescuento}
            onChange={cambiar('motivoDescuento')}
            error={errores.descuentoJustificado}
          />

        </div>

        {/* El comprobante no se corrige acá: se adjunta y se invalida desde la fila
            del listado, porque es un archivo con su propia firma y no un campo de
            este formulario. Corregir un pago no toca su respaldo. */}

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar la corrección'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
          </form>
    </Bloque>
  )
}
/**
 * La barra de solapas de la pantalla (`mejoras.md` §13 · B2).
 *
 * Ignacio: *"no basta con saber de qué sección es, tener todo en una lista
 * gigante para abajo (…) siento que está todo en la misma bolsa"*.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **POR QUÉ SOLAPAS Y NO GRUPOS ADENTRO DE LA LISTA.** El listado pagina de a
 * veinte. Con encabezados por grupo dentro de la misma lista, la página 2
 * empieza a la mitad de un grupo, los encabezados se repiten y **el total de un
 * grupo no se puede calcular con lo que hay en pantalla**. La solapa filtra
 * contra el servidor, así que lo que se ve es el grupo entero.
 *
 * **CUATRO SOLAPAS Y NO LAS TRES QUE SE PIDIERON.** La cuarta —"Sin destino"—
 * son los pagos que no apuntan a nada, y no se puede esconder: es plata que
 * entró, y filtrarla haría que la suma de las solapas deje de dar la caja sin
 * que nadie pueda ver por qué. **Aparece sólo cuando tiene filas**, así que en
 * una base sana no se ve nunca.
 *
 * **LA SOLAPA CUENTA PAGOS Y NO SUMA PLATA** (§14 · A3). Abajo iba además un
 * *"Entraron $X"* por moneda, y se sacó: **cuánto entró es la pregunta de
 * `/admin/caja`**, que es la pantalla hecha para contestarla y la única que manda
 * en ese número. Dos lugares que suman plata del mismo período son dos lugares
 * que en algún momento no van a coincidir — es el mismo argumento por el que el
 * Tablero del Módulo 8 no recalcula la caja sino que la pide.
 *
 * La distinción que ese número hacía sigue siendo cierta y ahora vive donde
 * corresponde: *cuántos pagos* no es *cuánto entró*, porque una deuda anotada y
 * un pago anulado cuentan en el primero y no en el segundo. El campo
 * {@code entraron} sigue viajando en la respuesta y hoy no lo dibuja nadie.
 *
 * **QUÉ LÍNEA CAE EN QUÉ SOLAPA LO DICE EL SERVIDOR**, en cada fila. Tener el
 * mapa acá sería tenerlo dos veces, y el modo de falla es concreto: la solapa
 * mostraría un número que no coincide con lo que lista.
 * ─────────────────────────────────────────────────────────────────────────
 */
function SolapasDeLinea({
  elegida,
  totales,
  onElegir,
}: {
  elegida: GrupoDePago | ''
  totales: TotalDeLinea[]
  onElegir: (grupo: GrupoDePago | '') => void
}) {
  const cuantos = (grupo: GrupoDePago) =>
    totales.filter((t) => t.grupo === grupo).reduce((suma, t) => suma + t.cantidad, 0)

  // "Sin destino" sólo si tiene filas: en una base sana no existe, y una solapa
  // permanente en cero enseña a no mirar la barra.
  const solapas = (Object.keys(NOMBRE_DE_GRUPO) as GrupoDePago[]).filter(
    (g) => g !== 'SIN_DESTINO' || cuantos('SIN_DESTINO') > 0,
  )

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1 border-b border-linea" role="tablist">
        <Solapa activa={elegida === ''} onClick={() => onElegir('')}>
          Todos
          <Cuantos n={totales.reduce((suma, t) => suma + t.cantidad, 0)} />
        </Solapa>
        {solapas.map((g) => (
          <Solapa key={g} activa={elegida === g} onClick={() => onElegir(g)}>
            {NOMBRE_DE_GRUPO[g]}
            <Cuantos n={cuantos(g)} />
          </Solapa>
        ))}
      </div>
    </div>
  )
}

function Solapa({
  activa,
  onClick,
  children,
}: {
  activa: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={activa}
      onClick={onClick}
      className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors ${
        activa
          ? 'border-acento font-medium text-texto'
          : 'border-transparent text-tenue hover:text-texto'
      }`}
    >
      {children}
    </button>
  )
}

/** El número al lado del nombre de la solapa. Cero no se dibuja. */
function Cuantos({ n }: { n: number }) {
  if (n === 0) return null
  return (
    <span className="t-mono rounded-full bg-superficie-2 px-1.5 py-0.5 text-[10px] tabular-nums">
      {n}
    </span>
  )
}

const DESTINOS = [
  { valor: 'INSCRIPCION', etiqueta: 'Un curso' },
  { valor: 'RESERVA', etiqueta: 'Una reserva de sala' },
  { valor: 'TRABAJO_MASTERING', etiqueta: 'Un trabajo de Mix & Mastering' },
  { valor: 'VENTA_EQUIPO', etiqueta: 'Una venta de equipo' },
] as const

/** Ventana del picker de reservas. El backend corta la agenda en 62 días. */
const DIAS_ATRAS = 45
const DIAS_ADELANTE = 15

function haceDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Registrar un pago.
 *
 * <p><b>Acepta los cuatro destinos desde el 2026-08-29</b>, y eso cierra una deuda
 * que el Módulo 3 dejó anotada a propósito. Antes solo saldaba inscripciones —el
 * formulario era alumno → sus cursos— y los otros tres se cobraban cada uno desde
 * su propia pantalla, en la misma transacción que creaba lo que saldaban. La
 * consecuencia estaba escrita: <b>una venta cargada sin cobro no tenía después por
 * dónde cobrarse</b>. Es el hallazgo #4 de `docs/mejoras.md`.
 *
 * <p><b>La API ya aceptaba los cuatro</b> (`pago_tiene_destino` pide uno, no
 * inscripción): lo que faltaba era acá. Y con `V19` se sumó la otra mitad —
 * <b>quien paga puede no tener cuenta</b>.
 *
 * <h2>Por qué "qué salda" va primero</h2>
 *
 * <p>Porque decide el resto del formulario, y en un caso decide una regla: <b>un
 * curso solo se salda a nombre de la cuenta del alumno</b>. No es un capricho de
 * la pantalla — una `inscripcion` cuelga de un `alumno`, que cuelga de un
 * `usuario`, así que un pago externo se acreditaría en una cuenta que no es de
 * nadie; el backend lo rechaza. Para los otros tres el pagador es libre: quien
 * compra un CDJ por el acuerdo con Pioneer no se registra en un estudio de música,
 * y alguien puede pagar por otro.
 */
function FormularioPago({
  onCerrar,
  onGuardado,
}: {
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [destino, setDestino] = useState<DestinoDePago>('INSCRIPCION')

  // Catálogos. Cada uno se pide cuando su destino se elige, no todos al abrir:
  // traer la agenda, las ventas y los trabajos para cargar un pago de un curso son
  // tres viajes para llenar selectores que nadie va a abrir.
  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([])
  const [contratos, setContratos] = useState<InscripcionResumen[]>([])
  const [reservas, setReservas] = useState<ReservaResumen[]>([])
  const [trabajos, setTrabajos] = useState<TrabajoResumen[]>([])
  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [personas, setPersonas] = useState<UsuarioResumen[]>([])

  const [conCuenta, setConCuenta] = useState(true)
  const [datos, setDatos] = useState({
    idAlumno: '',
    idInscripcion: '',
    idReserva: '',
    idTrabajoMastering: '',
    idVentaEquipo: '',
    idUsuario: '',
    nombrePagadorExterno: '',
    contactoPagadorExterno: '',
    monto: '',
    moneda: 'ARS' as Moneda,
    cotizacionDolar: '',
    medioPago: 'EFECTIVO' as MedioPago,
    estadoPago: 'PAGADO' as EstadoPago,
    fechaPago: hoy(),
    concepto: '',
    descuentoPorcentaje: '',
    motivoDescuento: '',
  })
  /**
   * El comprobante elegido, si lo hay.
   *
   * **No viaja con el alta**: un archivo no entra en un JSON, así que se sube en
   * un segundo pedido contra el pago recién creado. Se pide acá igual —y no desde
   * el listado— porque quien carga el pago está mirando la transferencia justo en
   * ese momento, que es el argumento entero de `mejoras.md` §9.9.
   */
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const esCurso = destino === 'INSCRIPCION'

  useEffect(() => {
    if (!esCurso) return
    listarAlumnos({ pagina: 0 })
      .then((r) => setAlumnos(r.contenido))
      .catch(() => setErrorGeneral('No se pudo cargar el listado de alumnos.'))
  }, [esCurso])

  // Las inscripciones del alumno elegido: son las que puede saldar.
  useEffect(() => {
    if (!datos.idAlumno) {
      setContratos([])
      return
    }
    listarInscripciones({ idAlumno: Number(datos.idAlumno) })
      .then((r) => setContratos(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar las inscripciones.'))
  }, [datos.idAlumno])

  useEffect(() => {
    if (destino !== 'RESERVA') return
    agenda({ desde: haceDias(DIAS_ATRAS), hasta: haceDias(-DIAS_ADELANTE) })
      .then(setReservas)
      .catch(() => setErrorGeneral('No se pudo cargar la agenda.'))
  }, [destino])

  useEffect(() => {
    if (destino !== 'TRABAJO_MASTERING') return
    listarTrabajos({ pagina: 0 })
      .then((r) => setTrabajos(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar los trabajos.'))
  }, [destino])

  useEffect(() => {
    if (destino !== 'VENTA_EQUIPO') return
    listarVentas({ pagina: 0 })
      .then((r) => setVentas(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar las ventas.'))
  }, [destino])

  // Las personas con cuenta, para los tres destinos donde el pagador es libre.
  useEffect(() => {
    if (esCurso) return
    listarUsuarios({ pagina: 0 })
      .then((r) => setPersonas(r.contenido))
      .catch(() => setErrorGeneral('No se pudo cargar el listado de personas.'))
  }, [esCurso])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  const alumno = alumnos.find((a) => String(a.idAlumno) === datos.idAlumno)

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}

    if (esCurso) {
      if (!datos.idAlumno) locales.idAlumno = 'Elegí de quién es el pago.'
      if (!datos.idInscripcion) locales.destinoUnico = 'Elegí qué curso salda este pago.'
    } else {
      if (destino === 'RESERVA' && !datos.idReserva) {
        locales.destinoUnico = 'Elegí qué reserva salda este pago.'
      }
      if (destino === 'TRABAJO_MASTERING' && !datos.idTrabajoMastering) {
        locales.destinoUnico = 'Elegí qué trabajo salda este pago.'
      }
      if (destino === 'VENTA_EQUIPO' && !datos.idVentaEquipo) {
        locales.destinoUnico = 'Elegí qué venta salda este pago.'
      }
      // Espeja `pago_pagador_identificado` (`V19`): cuenta o nombre escrito.
      if (conCuenta && !datos.idUsuario) locales.pagadorIdentificado = 'Elegí quién paga.'
      if (!conCuenta && !datos.nombrePagadorExterno.trim()) {
        locales.pagadorIdentificado = 'Escribí el nombre de quien paga.'
      }
    }

    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
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
      const creado = await registrarPago({
        // Un curso va siempre a nombre del alumno: es la regla del backend, no
        // una comodidad del formulario.
        idUsuario: esCurso
          ? alumno!.idUsuario
          : conCuenta
            ? Number(datos.idUsuario)
            : undefined,
        nombrePagadorExterno:
          esCurso || conCuenta ? undefined : datos.nombrePagadorExterno.trim(),
        contactoPagadorExterno:
          esCurso || conCuenta ? undefined : datos.contactoPagadorExterno.trim() || undefined,

        // Exactamente uno de los cuatro: `pago_tiene_destino`.
        idInscripcion: esCurso ? Number(datos.idInscripcion) : undefined,
        idReserva: destino === 'RESERVA' ? Number(datos.idReserva) : undefined,
        idTrabajoMastering:
          destino === 'TRABAJO_MASTERING' ? Number(datos.idTrabajoMastering) : undefined,
        idVentaEquipo: destino === 'VENTA_EQUIPO' ? Number(datos.idVentaEquipo) : undefined,

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
      })

      // El pago ya entró: si el archivo falla, lo que se avisa es eso y no que
      // falló el pago. Adjuntarlo después, desde la fila, sigue disponible.
      if (comprobante) {
        try {
          await adjuntarComprobante(creado.idPago, comprobante)
        } catch (e) {
          setErrorGeneral(
            e instanceof ApiError
              ? `El pago quedó registrado, pero el comprobante no: ${e.message}`
              : 'El pago quedó registrado, pero el comprobante no se pudo subir.',
          )
          setEnviando(false)
          return
        }
      }

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
    <Bloque titulo="Registrar pago" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        {errorGeneral && (
          <div className="mb-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Va primero porque decide el resto del formulario. */}
          <CampoSelect
            etiqueta="Qué salda"
            value={destino}
            onChange={(e) => {
              setDestino(e.target.value as DestinoDePago)
              setErrores({})
            }}
            className="sm:col-span-2"
          >
            {DESTINOS.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.etiqueta}
              </option>
            ))}
          </CampoSelect>

          {esCurso && (
            <>
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
                etiqueta="Cuál curso"
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
            </>
          )}

          {destino === 'RESERVA' && (
            <CampoSelect
              etiqueta="Cuál reserva"
              value={datos.idReserva}
              onChange={cambiar('idReserva')}
              error={errores.destinoUnico}
              className="sm:col-span-2"
            >
              <option value="">Elegí una</option>
              {reservas.map((r) => (
                <option key={r.idReserva} value={r.idReserva}>
                  {fecha(r.fecha)} {r.horaInicio.slice(0, 5)} · {r.sala} · {r.tipoUso}
                </option>
              ))}
            </CampoSelect>
          )}

          {destino === 'TRABAJO_MASTERING' && (
            <CampoSelect
              etiqueta="Cuál trabajo"
              value={datos.idTrabajoMastering}
              onChange={cambiar('idTrabajoMastering')}
              error={errores.destinoUnico}
              className="sm:col-span-2"
            >
              <option value="">Elegí uno</option>
              {trabajos.map((t) => (
                <option key={t.idTrabajo} value={t.idTrabajo}>
                  {t.nombreTrack} — {t.cliente}
                  {t.precioAcordado ? ` · ${importe(t.precioAcordado, t.moneda)}` : ''}
                </option>
              ))}
            </CampoSelect>
          )}

          {destino === 'VENTA_EQUIPO' && (
            <CampoSelect
              etiqueta="Cuál venta"
              value={datos.idVentaEquipo}
              onChange={cambiar('idVentaEquipo')}
              error={errores.destinoUnico}
              className="sm:col-span-2"
            >
              <option value="">Elegí una</option>
              {ventas.map((v) => (
                <option key={v.idVenta} value={v.idVenta}>
                  {v.modeloEquipo} — {v.comprador} · {importe(v.precio, v.moneda)}
                </option>
              ))}
            </CampoSelect>
          )}

          {/* Quién paga. Para un curso no se pregunta: es el alumno, y el backend
              lo exige. Para los otros tres es libre, y desde `V19` puede no tener
              cuenta. */}
          {esCurso ? (
            <p className="text-xs leading-relaxed text-tenue sm:col-span-2">
              El pago va a nombre del alumno: un curso se acredita en su cuenta y no
              en otra.
            </p>
          ) : (
            <>
              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-medium">Quién paga</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pagador"
                      checked={conCuenta}
                      onChange={() => setConCuenta(true)}
                    />
                    Tiene cuenta
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pagador"
                      checked={!conCuenta}
                      onChange={() => setConCuenta(false)}
                    />
                    No tiene cuenta
                  </label>
                </div>
                {errores.pagadorIdentificado && (
                  <p className="mt-1 text-xs text-red">{errores.pagadorIdentificado}</p>
                )}
              </div>

              {conCuenta ? (
                <CampoSelect
                  etiqueta="Persona"
                  value={datos.idUsuario}
                  onChange={cambiar('idUsuario')}
                  className="sm:col-span-2"
                >
                  <option value="">Elegí una</option>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.apellido}, {p.nombre} — {p.email}
                    </option>
                  ))}
                </CampoSelect>
              ) : (
                <>
                  <Campo
                    etiqueta="Nombre de quien paga"
                    value={datos.nombrePagadorExterno}
                    onChange={cambiar('nombrePagadorExterno')}
                  />
                  <Campo
                    etiqueta="Contacto"
                    value={datos.contactoPagadorExterno}
                    onChange={cambiar('contactoPagadorExterno')}
                  />
                </>
              )}
            </>
          )}

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

          {datos.moneda === 'USD' && (
            <Campo
              etiqueta="Cotización del dólar"
              type="number"
              step="0.01"
              value={datos.cotizacionDolar}
              onChange={cambiar('cotizacionDolar')}
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
          />

          <Campo etiqueta="Concepto" value={datos.concepto} onChange={cambiar('concepto')} />

          <Campo
            etiqueta="Descuento (%)"
            type="number"
            step="0.01"
            value={datos.descuentoPorcentaje}
            onChange={cambiar('descuentoPorcentaje')}
            error={errores.descuentoPorcentaje}
          />

          <Campo
            etiqueta="Por qué el descuento"
            value={datos.motivoDescuento}
            onChange={cambiar('motivoDescuento')}
            error={errores.descuentoJustificado}
          />

          <div className="sm:col-span-2">
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
            <p className="mt-1 text-xs text-apagado">
              {/* Opcional a propósito: una seña en efectivo no tiene ninguno, y
                  exigirlo dejaría media caja sin poder cargarse. */}
              PDF o foto. Se puede adjuntar después, y un pago admite varios.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
          </form>
    </Bloque>
  )
}
