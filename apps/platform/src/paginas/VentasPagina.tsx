import { useCallback, useEffect, useState } from 'react'

import { anularVenta, listarUsuarios, listarVentas, registrarVenta } from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  NOMBRE_DE_MEDIO,
  type MedioPago,
  type Moneda,
  type UsuarioResumen,
  type VentaResumen,
} from '../api/tiposAdmin'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { importe } from '../componentes/dinero'
import { hoy } from '../componentes/semana'
import { puedeOperar } from '../layout/menu'

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
  const puedeEscribir = puedeOperar(useUsuario())

  const [ventas, setVentas] = useState<VentaResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Venta de equipos</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'venta' : 'ventas'}`}
          </p>
        </div>
        {puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Registrar venta</Boton>}
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value)
            setPagina(0)
          }}
          placeholder="Buscar por equipo, marca o comprador…"
          className="w-full rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
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

      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
              <th className="px-4 py-3 font-semibold">Equipo</th>
              <th className="px-4 py-3 font-semibold">Comprador</th>
              <th className="px-4 py-3 font-semibold">Vendió</th>
              <th className="px-4 py-3 font-semibold">Precio</th>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {ventas.map((v) => (
              <tr key={v.idVenta} className={v.anulada ? 'text-apagado' : undefined}>
                <td className="px-4 py-3">
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
                    <div className="text-xs text-red">Anulada · {v.motivoAnulacion}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-tenue">
                  {v.comprador}
                  {/* La misma distinción que en egresos: a un comprador con
                      cuenta se le puede cruzar el estado de cuenta; a un nombre
                      suelto, no. */}
                  {v.idUsuarioComprador == null && (
                    <div className="text-xs text-apagado">
                      sin cuenta{v.contactoCompradorExterno && ` · ${v.contactoCompradorExterno}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-tenue">{v.vendedor}</td>
                <td className="px-4 py-3 whitespace-nowrap font-medium tabular-nums">
                  {importe(v.precio, v.moneda)}
                  {/* Una venta sin cobrar que no se ve es una venta que nadie
                      reclama. Se marca solo lo que falta: lo cobrado es lo normal
                      y no necesita etiqueta. */}
                  {!v.cobrada && !v.anulada && (
                    <div className="text-xs font-normal text-red">sin cobrar</div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-tenue">
                  {v.fechaVenta.split('-').reverse().join('/')}
                </td>
                <td className="px-4 py-3 text-right">
                  {puedeEscribir && !v.anulada && (
                    <button
                      type="button"
                      onClick={() => setAnulando(v)}
                      className="text-xs text-tenue underline underline-offset-2 hover:text-red"
                    >
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
  const [personas, setPersonas] = useState<UsuarioResumen[]>([])
  const [conCuenta, setConCuenta] = useState(true)
  const [datos, setDatos] = useState({
    idUsuarioComprador: '',
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
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarUsuarios({ pagina: 0 })
      .then((r) => setPersonas(r.contenido))
      .catch(() => setErrorGeneral('No se pudo cargar el listado de personas.'))
  }, [])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.modeloEquipo.trim()) locales.modeloEquipo = 'Poné el modelo del equipo.'
    if (!datos.precio || Number(datos.precio) <= 0) locales.precio = 'Poné un precio mayor a cero.'
    if (!datos.idUsuarioVendedor) locales.idUsuarioVendedor = 'Decí quién hizo la venta.'
    // Espeja `venta_comprador_identificado`: una venta sin comprador es una fila
    // que después no se puede reclamar.
    if (conCuenta && !datos.idUsuarioComprador) {
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
        idUsuarioComprador: conCuenta ? Number(datos.idUsuarioComprador) : undefined,
        nombreCompradorExterno: conCuenta ? undefined : datos.nombreCompradorExterno.trim(),
        contactoCompradorExterno: conCuenta
          ? undefined
          : datos.contactoCompradorExterno.trim() || undefined,
        idUsuarioVendedor: Number(datos.idUsuarioVendedor),
        categoria: datos.categoria.trim() || undefined,
        marca: datos.marca.trim() || undefined,
        modeloEquipo: datos.modeloEquipo.trim(),
        precio: Number(datos.precio),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : undefined,
        fechaVenta: datos.fechaVenta,
        notas: datos.notas.trim() || undefined,
        // Sin cuenta no hay dónde colgar el pago: `pago.id_usuario` es NOT NULL.
        medioPago: datos.cobrada && conCuenta ? datos.medioPago : undefined,
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
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-white p-5">
      <h3 className="mb-4 font-semibold">Registrar venta</h3>

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

        <CampoSelect
          etiqueta="Vendió"
          value={datos.idUsuarioVendedor}
          onChange={cambiar('idUsuarioVendedor')}
          error={errores.idUsuarioVendedor}
        >
          <option value="">Elegí a la persona</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.apellido}, {p.nombre}
            </option>
          ))}
        </CampoSelect>

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
          <CampoSelect
            etiqueta="Quién compró"
            value={datos.idUsuarioComprador}
            onChange={cambiar('idUsuarioComprador')}
            error={errores.compradorIdentificado}
            className="sm:col-span-2"
          >
            <option value="">Elegí a la persona</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.apellido}, {p.nombre}
              </option>
            ))}
          </CampoSelect>
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
            caso normal: se vendió y se cobró. */}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={datos.cobrada}
              onChange={(e) => setDatos((previo) => ({ ...previo, cobrada: e.target.checked }))}
              disabled={!conCuenta}
            />
            Ya se cobró
          </label>
          {!conCuenta && (
            // No es un capricho de la pantalla: `pago.id_usuario` es NOT NULL, así
            // que un cobro necesita alguien a quien colgárselo.
            <p className="mt-1 text-xs text-apagado">
              Para registrar el cobro el comprador tiene que tener cuenta.
            </p>
          )}
        </div>

        {datos.cobrada && conCuenta && (
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
  )
}
