import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { adjuntarComprobante } from '../api/administracion'
import { aprobarSolicitud, listarSolicitudes, rechazarSolicitud } from '../api/portal'
import { NOMBRE_DE_MEDIO, type MedioPago, type Moneda } from '../api/tiposAdmin'
import {
  NOMBRE_DE_ESTADO_SOLICITUD,
  type EstadoSolicitud,
  type SolicitudResumen,
} from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { diaYMes, hhmm } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 4 — la bandeja de pedidos de sala.
 *
 * **Esta pantalla es la que hace que el portal exista.** Sin alguien que lea las
 * solicitudes, el portal escribe en una tabla que nadie mira — que es justo lo
 * que el cierre del Módulo 2 enseñó a no repetir: el endpoint existía, la
 * pantalla no lo llamaba, y ningún test cruzaba el puente.
 *
 * **Aprobar es cobrar.** La reserva no puede existir sin plata detrás (`V10`), y
 * el usuario no tiene cómo ponerla: la carga quien aprueba, en el mismo gesto. Por
 * eso el formulario de aprobación es un formulario de pago y no un botón de "sí".
 *
 * **No se puede aprobar cambiando el horario**, y es deliberado: la reserva nace
 * con lo que se pidió. Si la franja no sirve, se rechaza diciendo por qué y la
 * persona pide de nuevo — así lo aprobado es siempre algo que alguien eligió.
 */
export function SolicitudesPagina() {
  const puedeResolver = usePuedeEscribir()

  const [estado, setEstado] = useState<EstadoSolicitud | ''>('PENDIENTE')
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Cuál está abierta y para qué. Una por vez: son dos formularios distintos. */
  const [abriendo, setAbriendo] = useState<{ id: number; accion: 'aprobar' | 'rechazar' } | null>(
    null,
  )

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const pagina = await listarSolicitudes(estado)
      setSolicitudes(pagina.contenido)
      setTotal(pagina.totalElementos)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la bandeja.')
    } finally {
      setCargando(false)
    }
  }, [estado])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function resolver(accion: () => Promise<unknown>) {
    try {
      await accion()
      setAbriendo(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo resolver el pedido.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Pedidos de sala"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'pedido' : 'pedidos'}`}</>}
        acciones={<><CampoSelect
          etiqueta="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value as EstadoSolicitud | '')}
          className="w-56"
        >
          <option value="PENDIENTE">Esperando respuesta</option>
          <option value="APROBADA">Confirmadas</option>
          <option value="RECHAZADA">Rechazadas</option>
          <option value="CANCELADA">Canceladas</option>
          <option value="">Todos</option>
        </CampoSelect></>}
      />

      <AvisoSoloLectura />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && solicitudes.length === 0 && (
        <EstadoVacio titulo={estado === 'PENDIENTE' ? 'No hay pedidos esperando respuesta.' : 'No hay pedidos acá.'} />
      )}

      <ul className="space-y-3">
        {solicitudes.map((s) => (
          <li key={s.idSolicitud} className="rounded-lg border border-linea bg-superficie px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="font-medium">
                  {s.apellido}, {s.nombre}
                </div>
                <div className="text-sm text-tenue">
                  {s.tipoUso} en {s.sala} · {diaYMes(s.fecha)} de {hhmm(s.horaInicio)} a{' '}
                  {hhmm(s.horaFin)}
                </div>
                <div className="text-xs text-apagado">
                  {s.email}
                  {s.comentario && ` · "${s.comentario}"`}
                </div>
              </div>

              <div className="text-right">
                <span className="rounded-full border border-linea px-2.5 py-1 text-xs text-tenue">
                  {NOMBRE_DE_ESTADO_SOLICITUD[s.estado]}
                </span>

                {s.estado === 'PENDIENTE' && puedeResolver && (
                  <div className="mt-2 flex justify-end gap-2">
                    <Boton
                      onClick={() => setAbriendo({ id: s.idSolicitud, accion: 'aprobar' })}
                    >
                      Confirmar y cobrar
                    </Boton>
                    <Boton
                      variante="secundario"
                      onClick={() => setAbriendo({ id: s.idSolicitud, accion: 'rechazar' })}
                    >
                      Rechazar
                    </Boton>
                  </div>
                )}
              </div>
            </div>

            {s.respuesta && (
              <p className="mt-3 border-t border-linea pt-3 text-sm text-tenue">
                {s.respuesta}
                {s.resueltaPor && <span className="text-apagado"> — {s.resueltaPor}</span>}
              </p>
            )}

            {abriendo?.id === s.idSolicitud && abriendo.accion === 'aprobar' && (
              <div className="mt-4 border-t border-linea pt-4">
                <FormularioDeSena
                  onCancelar={() => setAbriendo(null)}
                  onConfirmar={(sena, comprobante) =>
                    void resolver(async () => {
                      const hecha = await aprobarSolicitud(s.idSolicitud, sena)
                      // La reserva y su seña ya existen. El archivo va contra el
                      // pago recién creado: `V21` lo saca del JSON, y este es el
                      // momento en que quien aprueba está mirando la transferencia.
                      if (comprobante) {
                        await adjuntarComprobante(hecha.idPagoSena, comprobante)
                      }
                    })
                  }
                />
              </div>
            )}

            {abriendo?.id === s.idSolicitud && abriendo.accion === 'rechazar' && (
              <div className="mt-4 border-t border-linea pt-4">
                <PedirMotivo
                  titulo="Rechazar el pedido"
                  ayuda="Lo que escribas le llega a la persona como notificación. Decile qué puede hacer: otro horario, otra sala."
                  onCerrar={() => setAbriendo(null)}
                  onConfirmar={(motivo) =>
                    void resolver(() => rechazarSolicitud(s.idSolicitud, motivo))
                  }
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * La seña con la que nace la reserva.
 *
 * **Quién paga no está en el formulario**: es el que pidió, y lo pone el
 * servidor. Aceptarlo acá sería poder acreditar la seña de uno contra la cuenta
 * de otro.
 *
 * **El monto se escribe a mano y no se calcula.** El precio de un alquiler sale
 * de horas × una tarifa que el sistema todavía no tiene (P13, lo único que sigue
 * abierto del Módulo 3). Cuando exista, el 50% pasa a ser una cuenta.
 */
function FormularioDeSena({
  onCancelar,
  onConfirmar,
}: {
  onCancelar: () => void
  onConfirmar: (
    sena: {
      monto: number
      moneda: Moneda
      cotizacionDolar?: number
      medioPago: MedioPago
      respuesta?: string
    },
    /**
     * El comprobante viaja aparte porque **es un archivo desde `V21`** y no cabe
     * en el JSON de la aprobación: se sube en un segundo pedido, contra el pago
     * que la aprobación acaba de crear.
     */
    comprobante: File | null,
  ) => void
}) {
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [cotizacion, setCotizacion] = useState('')
  const [medioPago, setMedioPago] = useState<MedioPago>('TRANSFERENCIA')
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <h3 className="t-seccion mb-1">Confirmar el pedido</h3>
      <p className="mb-4 text-sm text-tenue">
        La reserva se crea con esta seña adentro. Sin ella la base no la acepta —
        no se aparta un horario sin pago por adelantado.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Monto de la seña"
          type="number"
          min="1"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <CampoSelect
          etiqueta="Moneda"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value as Moneda)}
        >
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </CampoSelect>

        {moneda === 'USD' && (
          <Campo
            etiqueta="Cotización del día"
            type="number"
            min="1"
            step="0.01"
            value={cotizacion}
            onChange={(e) => setCotizacion(e.target.value)}
            ayuda="Sin esto el importe no se puede reconstruir después."
          />
        )}

        <CampoSelect
          etiqueta="Cómo pagó"
          value={medioPago}
          onChange={(e) => setMedioPago(e.target.value as MedioPago)}
        >
          {(Object.keys(NOMBRE_DE_MEDIO) as MedioPago[]).map((m) => (
            <option key={m} value={m}>
              {NOMBRE_DE_MEDIO[m]}
            </option>
          ))}
        </CampoSelect>
      </div>

      {/* El comprobante de la seña. **Este es el circuito donde más se necesita**:
          la persona pidió por el portal, transfirió, y quien aprueba está mirando
          esa transferencia. Hasta el 2026-08-29 no había dónde anotarla y el
          respaldo se perdía en el momento mismo en que existía (hallazgo #5);
          desde `V21` lo que se guarda es el archivo y no una ruta escrita.
          Opcional a propósito: en efectivo no hay ninguno. */}
      <div className="mt-4">
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
          Si te transfirieron, adjuntá la captura o el PDF. En efectivo no hace falta.
        </p>
      </div>

      <Campo
        etiqueta="Mensaje (opcional)"
        className="mt-4"
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        placeholder="Te esperamos, vení 10 minutos antes…"
      />

      {error && (
        <div className="mt-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton
          type="button"
          onClick={() => {
            if (!monto || Number(monto) <= 0) {
              setError('Poné el monto de la seña.')
              return
            }
            if (moneda === 'USD' && !cotizacion) {
              setError('Un pago en dólares necesita la cotización del día.')
              return
            }
            onConfirmar(
              {
                monto: Number(monto),
                moneda,
                cotizacionDolar: cotizacion ? Number(cotizacion) : undefined,
                medioPago,
                respuesta: respuesta.trim() || undefined,
              },
              comprobante,
            )
          }}
        >
          Confirmar y crear la reserva
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
  )
}
