import { useCallback, useEffect, useState } from 'react'

import {
  abrirComprobanteDeEgreso,
  adjuntarComprobanteDeEgreso,
  anularEgreso,
  invalidarComprobanteDeEgreso,
  listarEgresos,
  listarProfesores,
  registrarEgreso,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type {
  ComprobanteResumen,
  DestinoDeEgreso,
  EgresoResumen,
  Moneda,
  ProfesorResumen,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque } from '../componentes/Bloque'
import { AdjuntarComprobante, Comprobantes } from '../componentes/Comprobantes'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Filtros, FiltroSelect, FiltroTexto } from '../componentes/Filtros'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { importe } from '../componentes/dinero'
import { hoy } from '../componentes/semana'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { Tabla, Celda } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { fecha } from '../componentes/semana'

/**
 * Módulo 3, pantalla 5 — la plata que sale.
 *
 * <p>Sueldos de profesores, alquiler, equipamiento. Es la otra mitad de la caja:
 * sin esto, *"¿cuánto quedó?"* se sigue contestando cruzando el Excel con el
 * Notion a mano.
 *
 * <p><b>Se carga, se lista y se anula.</b> No hay edición ni borrado: `V9`
 * prohíbe el DELETE sobre {@code egreso}, así que **corregir uno mal cargado es
 * anularlo y volver a cargarlo**, con el primero quedando firmado por quien lo dio
 * de baja. Por eso el botón dice "Anular" y no "Eliminar", igual que en Pagos.
 */
export function EgresosPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [egresos, setEgresos] = useState<EgresoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  /** La división por dentro de §12 · C3: sueldos o el resto de los gastos. */
  const [destino, setDestino] = useState<DestinoDeEgreso | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [anulando, setAnulando] = useState<EgresoResumen | null>(null)
  const [invalidando, setInvalidando] = useState<{
    egreso: EgresoResumen
    comprobante: ComprobanteResumen
  } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarEgresos({ buscar, destino, pagina })
      setEgresos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, destino, pagina])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  /**
   * Adjuntar el comprobante de una salida de plata (§14 · C1).
   *
   * Se recarga la lista porque la fila tiene que mostrar el archivo recién
   * subido, y el `catch` recarga también: si el archivo entró y falló otra cosa,
   * la pantalla no puede quedar diciendo que no hay nada.
   */
  async function adjuntar(idEgreso: number, archivo: File) {
    try {
      await adjuntarComprobanteDeEgreso(idEgreso, archivo)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo adjuntar el comprobante.'
      await cargar()
      setError(mensaje)
    }
  }

  async function abrir(idEgreso: number, comprobante: ComprobanteResumen) {
    try {
      await abrirComprobanteDeEgreso(idEgreso, comprobante.idComprobante)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo abrir el comprobante.')
    }
  }

  /**
   * Marcar un comprobante como inválido. <b>No lo borra.</b>
   *
   * Cuesta escribir un motivo y queda firmado con el nombre de quien lo marcó,
   * porque es una decisión sobre la prueba de que esa plata salió. El correcto se
   * adjunta al lado y los dos quedan — que es toda la razón por la que `V25` hizo
   * una tabla en vez de dejar la columna.
   */
  async function confirmarInvalidacion(motivo: string) {
    if (!invalidando) return
    try {
      await invalidarComprobanteDeEgreso(
        invalidando.egreso.idEgreso,
        invalidando.comprobante.idComprobante,
        motivo,
      )
      setInvalidando(null)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo invalidar el comprobante.'
      setInvalidando(null)
      await cargar()
      setError(mensaje)
    }
  }

  async function confirmarAnulacion(motivo: string) {
    if (!anulando) return
    try {
      await anularEgreso(anulando.idEgreso, motivo)
      setAnulando(null)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo anular el egreso.'
      setAnulando(null)
      // Recargar antes de mostrar: `cargar` arranca limpiando el error.
      await cargar()
      setError(mensaje)
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Egresos"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'egreso' : 'egresos'}`}</>}
        acciones={<>{puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Registrar egreso</Boton>}</>}
      />

      <AvisoSoloLectura />

      <Filtros>
        <FiltroTexto
          etiqueta="Buscar"
          valor={buscar}
          onCambio={(v: string) => {
            setBuscar(v)
            setPagina(0)
          }}
          placeholder="Buscar por concepto o destinatario…"
        />
        {/* §12 · C3. Los rubros de verdad —alquiler, servicios, equipamiento—
            necesitan una columna nueva y la lista confirmada con el cliente
            (`platform.md` §18 · P42); este corte es el grande y sale del dato
            que ya existe. */}
        <FiltroSelect
          etiqueta="Filtrar por tipo de gasto"
          valor={destino}
          onCambio={(v: string) => {
            setDestino(v as DestinoDeEgreso | '')
            setPagina(0)
          }}
        >
          <option value="">Todo lo que salió</option>
          <option value="PROFESOR">Pagos a profesores</option>
          <option value="OTRO">Otros gastos</option>
        </FiltroSelect>
      </Filtros>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && puedeEscribir && (
        <FormularioEgreso
          onCerrar={() => setMostrandoAlta(false)}
          onGuardado={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {invalidando && (
        <PedirMotivo
          key={invalidando.comprobante.idComprobante}
          titulo="Marcar el comprobante como inválido"
          ayuda="El archivo no se borra: queda listado como inválido, con tu nombre y el motivo. Después adjuntá el que corresponde — el egreso admite varios."
          onCerrar={() => setInvalidando(null)}
          onConfirmar={confirmarInvalidacion}
        />
      )}

      {anulando && (
        <PedirMotivo
          key={anulando.idEgreso}
          titulo="Anular el egreso"
          ayuda="El egreso no se borra: queda registrado como anulado, con tu nombre y la fecha. Deja de contar en la caja."
          onCerrar={() => setAnulando(null)}
          onConfirmar={confirmarAnulacion}
        />
      )}

      <Tabla columnas={['Concepto', 'A quién', { etiqueta: 'Monto', alineacion: 'derecha' }, 'Fecha', 'Comprobante', '']}>
            {egresos.map((e) => (
              <tr key={e.idEgreso} className={e.anulado ? 'text-apagado' : undefined}>
                <Celda className="font-medium">
                  {/* Tachado y con el motivo: la fila anulada es la que explica
                      por qué el total de la caja cambió, así que se queda. */}
                  <span className={e.anulado ? 'line-through' : undefined}>{e.concepto}</span>
                  {e.anulado && (
                    <div className="text-xs text-acento">Anulado · {e.motivoAnulacion}</div>
                  )}
                </Celda>
                <Celda className="text-tenue">
                  {e.destinatario ?? <span className="text-apagado">—</span>}
                  {/* La misma palabra que el filtro, para que la fila y el
                      desplegable no nombren distinto la misma cosa. Antes decía
                      "tiene cuenta en el sistema", que es el dato técnico y no
                      lo que significa. */}
                  {e.esPagoAProfesor && (
                    <div className="text-xs text-tenue">Pago a profesor</div>
                  )}
                </Celda>
                <Celda numerica className="whitespace-nowrap font-medium">
                  {importe(e.monto, e.moneda)}
                </Celda>
                <Celda className="whitespace-nowrap text-tenue">
                  {fecha(e.fechaEgreso)}
                </Celda>

                {/* ⚠️ **Acá había un campo de texto con placeholder
                    `/comprobantes/…`**, o sea que la pantalla le pedía a alguien
                    que tipeara una ruta y después mostraba eso como si hubiera un
                    archivo detrás. Desde `V25` es un archivo real, con la firma de
                    quién lo subió y de quién lo rechazó (§14 · C1).

                    **Del lado del egreso esto pesa más que del lado del pago**: un
                    cobro sin comprobante lo reclama el que pagó; una salida de
                    plata sin comprobante no la reclama nadie — el que la cobró
                    está contento y el que la firmó es el mismo que la cargó.

                    Adjuntar sigue disponible sobre un egreso anulado, al revés que
                    corregirlo: aparece el respaldo de algo que se había anulado
                    justamente por no encontrarlo. */}
                <Celda className="align-top">
                  <Comprobantes
                    comprobantes={e.comprobantes}
                    onVer={(c) => void abrir(e.idEgreso, c)}
                    onInvalidar={
                      puedeEscribir
                        ? (c) => setInvalidando({ egreso: e, comprobante: c })
                        : undefined
                    }
                  />
                  {puedeEscribir && (
                    <div className="mt-1">
                      <AdjuntarComprobante
                        onElegir={(archivo) => adjuntar(e.idEgreso, archivo)}
                        etiqueta={e.comprobantes.length === 0 ? 'Adjuntar' : 'Adjuntar otro'}
                      />
                    </div>
                  )}
                </Celda>

                <Celda className="text-right">
                  {puedeEscribir && !e.anulado && (
                    <Boton variante="enlace"
                      type="button"
                      onClick={() => setAnulando(e)}>
                      Anular
                    </Boton>
                  )}
                </Celda>
              </tr>
            ))}
          </Tabla>

      {!cargando && egresos.length === 0 && (
        <p className="mt-4 text-center text-sm text-tenue">No hay egresos cargados.</p>
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

function FormularioEgreso({
  onCerrar,
  onGuardado,
}: {
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])
  const [datos, setDatos] = useState({
    concepto: '',
    monto: '',
    moneda: 'ARS' as Moneda,
    cotizacionDolar: '',
    destinatario: '',
    idProfesor: '',
    fechaEgreso: hoy(),
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  // El caso más frecuente del negocio es el sueldo de un profesor, así que se
  // puede elegir de la lista; todo lo demás va como texto libre.
  useEffect(() => {
    listarProfesores(true)
      .then(setProfesores)
      .catch(() => setErrorGeneral('No se pudo cargar el listado de profesores.'))
  }, [])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  const profesor = profesores.find((p) => String(p.idProfesor) === datos.idProfesor)

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.concepto.trim()) locales.concepto = 'Escribí a qué corresponde el egreso.'
    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
    if (datos.moneda === 'USD' && !datos.cotizacionDolar) {
      locales.cotizacionPresenteSiEsUsd = 'Un egreso en dólares necesita la cotización del día.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await registrarEgreso({
        monto: Number(datos.monto),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : null,
        concepto: datos.concepto.trim(),
        destinatario: datos.destinatario || undefined,
        idUsuarioDestino: profesor?.idUsuario,
        fechaEgreso: datos.fechaEgreso,
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
    <Bloque titulo="Registrar egreso" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Concepto"
            value={datos.concepto}
            onChange={cambiar('concepto')}
            placeholder="Clases de marzo, alquiler, equipamiento…"
            error={errores.concepto}
            className="sm:col-span-2"
          />

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

          <CampoSelect etiqueta="Profesor" value={datos.idProfesor} onChange={cambiar('idProfesor')}>
            <option value="">No es un pago a un profesor</option>
            {profesores.map((p) => (
              <option key={p.idProfesor} value={p.idProfesor}>
                {p.nombreCompleto}
              </option>
            ))}
          </CampoSelect>

          {/* Solo cuando no es un profesor: los dos campos juntos invitan a
              llenar los dos, y el nombre de la cuenta gana igual. */}
          {!datos.idProfesor && (
            <Campo
              etiqueta="A quién"
              value={datos.destinatario}
              onChange={cambiar('destinatario')}
              placeholder="Inmobiliaria, proveedor…"
            />
          )}

          <Campo
            etiqueta="Fecha"
            type="date"
            value={datos.fechaEgreso}
            onChange={cambiar('fechaEgreso')}
          />

          {/* ⚠️ Acá había un campo "Comprobante" con placeholder
              `/comprobantes/…`: texto libre pidiéndole a alguien que tipeara una
              ruta, y después la pantalla lo mostraba como si hubiera un archivo
              detrás. Se fue con `V25` (§14 · C1).

              **El comprobante se adjunta desde la fila del listado, no acá**, y
              no es comodidad: un archivo no viaja adentro del JSON del alta, así
              que son dos pedidos. Es lo mismo que `V21` hizo del lado del pago. */}
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
    </Bloque>
  )
}
