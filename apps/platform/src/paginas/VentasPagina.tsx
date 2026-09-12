import { useCallback, useEffect, useState } from 'react'

import {
  abrirComprobante,
  adjuntarComprobante,
  anularVenta,
  listarVentas,
  registrarVenta,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  NOMBRE_DE_MEDIO,
  type ComprobanteResumen,
  type MedioPago,
  type Moneda,
  type UsuarioResumen,
  type VentaResumen,
} from '../api/tiposAdmin'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque } from '../componentes/Bloque'
import { AdjuntarComprobante, Comprobantes } from '../componentes/Comprobantes'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { importe } from '../componentes/dinero'
import { hoy } from '../componentes/semana'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { Tabla, Celda } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { BuscadorDePersonas } from '../componentes/BuscadorDePersonas'
import { fecha } from '../componentes/semana'

const MEDIOS_DE_PAGO: MedioPago[] = [
  'EFECTIVO',
  'TRANSFERENCIA',
  'PAYPAL',
  'CUENTA_EEUU',
  'OTRO',
]

/**
 * Módulo 3, pantalla 6 — la venta de equipamiento. **La última del módulo.**
 *
 * **Esto no es un inventario.** No hay stock propio: hay un acuerdo con Pioneer
 * (AlphaTheta) y se vende contra el stock de ellos, así que no hay unidades que
 * descontar ni artículos que dar de alta antes de venderlos. Es el registro de una
 * operación que ya pasó. Es la línea más chica del negocio y el proceso es ad hoc.
 *
 * **Se carga, se lista y se anula**, igual que los egresos. No hay edición ni
 * borrado: `V9` prohíbe el DELETE, así que **corregir una venta mal cargada es
 * anularla y volver a cargarla**. Si tenía cobro hay que anular primero el pago —
 * una venta anulada con su pago vivo dejaría la plata contada contra una operación
 * que se declara inexistente, y el backend lo rechaza con ese mensaje.
 */
export function VentasPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [anulando, setAnulando] = useState<VentaResumen | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarVentas({ buscar, pagina })
      setVentas(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, pagina])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  /**
   * Adjuntar el comprobante del cobro de una venta (§14 · B2).
   *
   * **Va contra el pago y no contra la venta**: desde `V21` el respaldo se cuelga
   * del movimiento de plata, que es el pago. Se recarga la lista porque la fila
   * tiene que mostrar el comprobante recién subido, y el `catch` recarga también
   * — si el archivo entró y falló otra cosa, la pantalla no puede quedar
   * mostrando que no hay nada.
   *
   * **Invalidar NO se ofrece acá.** Marcar un comprobante como inválido pide un
   * motivo que queda firmado (`V7`), y ese flujo vive en Pagos, que es donde se
   * corrige un pago. Ofrecerlo en dos lugares serían dos formas de firmar el
   * mismo acto.
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

  async function abrir(idPago: number, comprobante: ComprobanteResumen) {
    try {
      await abrirComprobante(idPago, comprobante.idComprobante)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo abrir el comprobante.')
    }
  }

  async function confirmarAnulacion(motivo: string) {
    if (!anulando) return
    try {
      await anularVenta(anulando.idVenta, motivo)
      setAnulando(null)
      await cargar()
    } catch (e) {
      // Acá cae "anulá primero el pago", que es el rechazo esperable y el que
      // dice qué hacer. Llega tal cual lo escribió el backend.
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo anular la venta.'
      setAnulando(null)
      await cargar()
      setError(mensaje)
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Venta de equipos"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'venta' : 'ventas'}`}</>}
        acciones={<>{puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Registrar venta</Boton>}</>}
      />

      <AvisoSoloLectura />

      <div className="mb-4">
        <input
          type="search"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value)
            setPagina(0)
          }}
          placeholder="Buscar por equipo, marca o comprador…"
          className={`w-full ${CONTROL_DE_FILTRO}`}
        />
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && puedeEscribir && (
        <FormularioVenta
          onCerrar={() => setMostrandoAlta(false)}
          onGuardada={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {anulando && (
        <PedirMotivo
          key={anulando.idVenta}
          titulo="Anular la venta"
          ayuda="La venta no se borra: queda registrada como anulada, con tu nombre y la fecha. Si ya tenía un cobro, primero hay que anular el pago."
          onCerrar={() => setAnulando(null)}
          onConfirmar={confirmarAnulacion}
        />
      )}

      <Tabla columnas={['Equipo', 'Comprador', 'Vendió', { etiqueta: 'Precio', alineacion: 'derecha' }, 'Fecha', 'Comprobante', '']}>
            {ventas.map((v) => (
              <tr key={v.idVenta} className={v.anulada ? 'text-apagado' : undefined}>
                <Celda>
                  <span className={`font-medium ${v.anulada ? 'line-through' : ''}`}>
                    {v.modeloEquipo}
                  </span>
                  {(v.marca ?? v.categoria) && (
                    <div className="text-xs text-apagado">
                      {[v.marca, v.categoria].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {/* La fila anulada se queda: es la que explica por qué el total
                      del período cambió. */}
                  {v.anulada && (
                    <div className="text-xs text-acento">Anulada · {v.motivoAnulacion}</div>
                  )}
                </Celda>
                <Celda className="text-tenue">
                  {v.comprador}
                  {/* La misma distinción que en egresos: a un comprador con
                      cuenta se le puede cruzar el estado de cuenta; a un nombre
                      suelto, no. */}
                  {v.idUsuarioComprador == null && (
                    <div className="text-xs text-apagado">
                      sin cuenta{v.contactoCompradorExterno && ` · ${v.contactoCompradorExterno}`}
                    </div>
                  )}
                </Celda>
                <Celda className="text-tenue">{v.vendedor}</Celda>
                <Celda numerica className="whitespace-nowrap font-medium">
                  {importe(v.precio, v.moneda)}
                  {/* Una venta sin cobrar que no se ve es una venta que nadie
                      reclama. Se marca solo lo que falta: lo cobrado es lo normal
                      y no necesita etiqueta. */}
                  {!v.cobrada && !v.anulada && (
                    <div className="text-xs font-normal text-acento">sin cobrar</div>
                  )}
                </Celda>
                <Celda className="whitespace-nowrap text-tenue">
                  {fecha(v.fechaVenta)}
                </Celda>

                {/* ⚠️ **El comprobante se cuelga del PAGO, no de la venta**
                    (§14 · B2). Es la misma pieza, el mismo endpoint y las mismas
                    reglas de `V21` — un comprobante marcado inválido no se borra
                    ni se edita—, porque el papel respalda el movimiento de plata
                    y el movimiento de plata es el pago. Una tabla de archivos
                    propia de la venta sería una segunda definición de lo mismo.

                    Es lo que pidió Ignacio dicho como regla y no como dos
                    features: *"todo lo que sea pagos o cobros con slot de
                    comprobante"*. Del lado que entra ya existía desde `V21` y
                    faltaba esta pantalla; del lado que sale —los egresos— hace
                    falta una migración, y es C1. */}
                <Celda className="align-top">
                  {v.idPago === null ? (
                    // No se dibuja un "Adjuntar" que no puede funcionar: sin pago
                    // no hay dónde colgar el archivo. Y se dice qué hacer, porque
                    // una celda vacía acá se lee como que el sistema perdió algo.
                    <span className="text-xs text-apagado">
                      {v.anulada ? '—' : 'Sin pago registrado'}
                    </span>
                  ) : (
                    <>
                      <Comprobantes
                        comprobantes={v.comprobantes}
                        onVer={(c) => void abrir(v.idPago!, c)}
                      />
                      {puedeEscribir && (
                        <div className="mt-1">
                          <AdjuntarComprobante
                            onElegir={(archivo) => adjuntar(v.idPago!, archivo)}
                            etiqueta={v.comprobantes.length === 0 ? 'Adjuntar' : 'Adjuntar otro'}
                          />
                        </div>
                      )}
                    </>
                  )}
                </Celda>

                <Celda className="text-right">
                  {puedeEscribir && !v.anulada && (
                    <Boton variante="enlace"
                      type="button"
                      onClick={() => setAnulando(v)}>
                      Anular
                    </Boton>
                  )}
                </Celda>
              </tr>
            ))}
          </Tabla>

      {!cargando && ventas.length === 0 && (
        <p className="mt-4 text-center text-sm text-tenue">No hay ventas cargadas.</p>
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
 * Registrar una venta.
 *
 * **El comprador puede no tener cuenta**, y por eso el formulario tiene los dos
 * caminos en vez de obligar a crear un usuario: mucha gente llega por el acuerdo
 * con Pioneer y no se registra en el sistema por comprar un CDJ. Tener cuenta y
 * ser cliente son cosas distintas — es la contracara de `usuario` como raíz.
 */
function FormularioVenta({
  onCerrar,
  onGuardada,
}: {
  onCerrar: () => void
  onGuardada: () => void
}) {
  const actual = useUsuario()
  /**
   * Quién vendió y quién compró se BUSCAN entre las cuentas (§17 · H8). El
   * `<select>` que había cargaba la primera página del listado —veinte
   * personas— y el comprador veintiuno no existía para este formulario, sin
   * que nada avisara. Quien vendió viene puesto (es quien carga, casi siempre)
   * y se cambia buscando.
   */
  const [comprador, setComprador] = useState<UsuarioResumen | null>(null)
  const [vendedor, setVendedor] = useState<UsuarioResumen | null>(null)
  const [cambiandoVendedor, setCambiandoVendedor] = useState(false)
  const [conCuenta, setConCuenta] = useState(true)
  const [datos, setDatos] = useState({
    nombreCompradorExterno: '',
    contactoCompradorExterno: '',
    // Lo más común es que quien carga sea quien vendió, así que viene puesto. Es
    // un dato del negocio y se puede cambiar: Micaela carga lo que vendió Ghezz.
    idUsuarioVendedor: actual ? String(actual.id) : '',
    categoria: '',
    marca: '',
    modeloEquipo: '',
    precio: '',
    moneda: 'ARS' as Moneda,
    cotizacionDolar: '',
    fechaVenta: hoy(),
    notas: '',
    cobrada: true,
    medioPago: 'EFECTIVO' as MedioPago,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.modeloEquipo.trim()) locales.modeloEquipo = 'Poné el modelo del equipo.'
    if (!datos.precio || Number(datos.precio) <= 0) locales.precio = 'Poné un precio mayor a cero.'
    if (!datos.idUsuarioVendedor && !vendedor) locales.idUsuarioVendedor = 'Decí quién hizo la venta.'
    // Espeja `venta_comprador_identificado`: una venta sin comprador es una fila
    // que después no se puede reclamar.
    if (conCuenta && !comprador) {
      locales.compradorIdentificado = 'Elegí al comprador.'
    }
    if (!conCuenta && !datos.nombreCompradorExterno.trim()) {
      locales.compradorIdentificado = 'Escribí el nombre del comprador.'
    }
    if (datos.moneda === 'USD' && !datos.cotizacionDolar) {
      locales.cotizacionPresenteSiEsUsd = 'Una venta en dólares necesita la cotización del día.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await registrarVenta({
        idUsuarioComprador: conCuenta ? comprador!.id : undefined,
        nombreCompradorExterno: conCuenta ? undefined : datos.nombreCompradorExterno.trim(),
        contactoCompradorExterno: conCuenta
          ? undefined
          : datos.contactoCompradorExterno.trim() || undefined,
        idUsuarioVendedor: vendedor ? vendedor.id : Number(datos.idUsuarioVendedor),
        categoria: datos.categoria.trim() || undefined,
        marca: datos.marca.trim() || undefined,
        modeloEquipo: datos.modeloEquipo.trim(),
        precio: Number(datos.precio),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : undefined,
        fechaVenta: datos.fechaVenta,
        notas: datos.notas.trim() || undefined,
        // Desde `V19` el cobro no depende de que el comprador tenga cuenta: el
        // pago viaja con su nombre, el mismo que la venta ya guarda.
        medioPago: datos.cobrada ? datos.medioPago : undefined,
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
    <Bloque titulo="Registrar venta" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Modelo"
            value={datos.modeloEquipo}
            onChange={cambiar('modeloEquipo')}
            error={errores.modeloEquipo}
            ayuda="Lo único obligatorio del equipo: sin esto la fila no dice qué se vendió."
          />
          <Campo etiqueta="Marca" value={datos.marca} onChange={cambiar('marca')} />
          <Campo
            etiqueta="Categoría"
            value={datos.categoria}
            onChange={cambiar('categoria')}
            ayuda="Controladora, bandeja, mixer, monitores…"
          />

          <div>
            {actual && !cambiandoVendedor ? (
              <div>
                <span className="t-mono text-tenue">Vendió</span>
                <div className="mt-1.5 flex items-center justify-between gap-3 rounded-md border border-linea bg-superficie-2 px-3 py-2.5 text-sm">
                  <strong className="font-medium">
                    {actual.nombre} {actual.apellido}
                  </strong>
                  <Boton
                    variante="enlace"
                    type="button"
                    onClick={() => {
                      setCambiandoVendedor(true)
                      setDatos((previo) => ({ ...previo, idUsuarioVendedor: '' }))
                    }}
                  >
                    Cambiar
                  </Boton>
                </div>
              </div>
            ) : (
              <BuscadorDePersonas elegida={vendedor} onElegir={setVendedor} etiqueta="Vendió" />
            )}
            {errores.idUsuarioVendedor && (
              <p className="mt-1 text-xs text-red">{errores.idUsuarioVendedor}</p>
            )}
          </div>

          {/* -- El comprador ------------------------------------------------- */}
          <div className="sm:col-span-2">
            <span className="text-xs font-semibold text-tenue">Comprador</span>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="comprador"
                  checked={conCuenta}
                  onChange={() => setConCuenta(true)}
                />
                Tiene cuenta
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="comprador"
                  checked={!conCuenta}
                  onChange={() => setConCuenta(false)}
                />
                No tiene cuenta
              </label>
            </div>
          </div>

          {conCuenta ? (
            <div className="sm:col-span-2">
              <BuscadorDePersonas elegida={comprador} onElegir={setComprador} etiqueta="Quién compró" />
              {errores.compradorIdentificado && (
                <p className="mt-1 text-xs text-red">{errores.compradorIdentificado}</p>
              )}
            </div>
          ) : (
            <>
              <Campo
                etiqueta="Nombre del comprador"
                value={datos.nombreCompradorExterno}
                onChange={cambiar('nombreCompradorExterno')}
                error={errores.compradorIdentificado}
              />
              <Campo
                etiqueta="Contacto"
                value={datos.contactoCompradorExterno}
                onChange={cambiar('contactoCompradorExterno')}
                ayuda="Un teléfono o mail: es lo único que va a quedar para ubicarlo."
              />
            </>
          )}

          {/* -- La plata ------------------------------------------------------ */}
          <Campo
            etiqueta="Precio"
            type="number"
            step="0.01"
            value={datos.precio}
            onChange={cambiar('precio')}
            error={errores.precio}
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
              ayuda="Sin esto el importe no se puede reconstruir después."
              error={errores.cotizacionPresenteSiEsUsd}
              className="sm:col-span-2"
            />
          )}

          <Campo
            etiqueta="Fecha de la venta"
            type="date"
            value={datos.fechaVenta}
            onChange={cambiar('fechaVenta')}
          />

          <Campo etiqueta="Notas" value={datos.notas} onChange={cambiar('notas')} />

          {/* El cobro. Se registra en la misma transacción que la venta -- es el
              caso normal: se vendió y se cobró.

              **Ya no depende de que el comprador tenga cuenta.** Hasta `V19`,
              `pago.id_usuario` era NOT NULL y este checkbox estaba deshabilitado
              para el comprador externo, con un texto que explicaba por qué: o sea
              que una venta a alguien que compra por el acuerdo con Pioneer **no se
              podía cobrar nunca**. Era el hallazgo #1 de `docs/mejoras.md`. */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={datos.cobrada}
                onChange={(e) => setDatos((previo) => ({ ...previo, cobrada: e.target.checked }))}
              />
              Ya se cobró
            </label>
          </div>

          {datos.cobrada && (
            <CampoSelect
              etiqueta="Cómo pagó"
              value={datos.medioPago}
              onChange={cambiar('medioPago')}
              className="sm:col-span-2"
            >
              {MEDIOS_DE_PAGO.map((m) => (
                <option key={m} value={m}>
                  {NOMBRE_DE_MEDIO[m]}
                </option>
              ))}
            </CampoSelect>
          )}
        </div>

        {errorGeneral && (
          <div className="mt-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          {/* "Registrar" y no "Registrar venta": el botón de la cabecera ya se
              llama así y dos botones con el mismo nombre accesible son ambiguos
              para quien navega por lectores de pantalla, además de para los tests.
              Es la misma etiqueta que usa el alta de egresos. */}
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
          </form>
    </Bloque>
  )
}
