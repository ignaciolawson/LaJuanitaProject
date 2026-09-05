import { useCallback, useEffect, useState } from 'react'

import { anularEgreso, listarEgresos, listarProfesores, registrarEgreso } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { DestinoDeEgreso, EgresoResumen, Moneda, ProfesorResumen } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Bloque } from '../componentes/Bloque'
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
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [anulando, setAnulando] = useState<EgresoResumen | null>(null)

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

      {anulando && (
        <PedirMotivo
          key={anulando.idEgreso}
          titulo="Anular el egreso"
          ayuda="El egreso no se borra: queda registrado como anulado, con tu nombre y la fecha. Deja de contar en la caja."
          onCerrar={() => setAnulando(null)}
          onConfirmar={confirmarAnulacion}
        />
      )}

      <Tabla columnas={['Concepto', 'A quién', { etiqueta: 'Monto', alineacion: 'derecha' }, 'Fecha', '']}>
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
    comprobantePath: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
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

          <Campo
            etiqueta="Comprobante"
            value={datos.comprobantePath}
            onChange={cambiar('comprobantePath')}
            placeholder="/comprobantes/…"
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
    </Bloque>
  )
}
