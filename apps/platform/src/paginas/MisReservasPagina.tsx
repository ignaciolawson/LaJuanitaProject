import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { misReprogramaciones, misReservas } from '../api/portal'
import type { ReprogramacionResumen, ReservaDelPortal } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { PedirOtroDia } from '../componentes/PedirOtroDia'
import { diaYMes, hhmm, hoy, lunesDe, sumarDias } from '../componentes/semana'

/**
 * Módulo 4 — mis clases y mis cabinas.
 *
 * **No es el calendario del portal, y la diferencia importa.** Administración
 * mira una grilla de tres salas por ocho horas porque su pregunta es *"qué está
 * pasando"*; acá la pregunta es *"cuándo tengo que venir"*, y para eso una lista
 * en orden es mejor que una grilla llena de huecos ajenos.
 *
 * **Las canceladas se muestran, tachadas.** Es la decisión menos obvia de esta
 * pantalla: esconderlas haría que la clase del martes desaparezca sin que nadie
 * explique nada, y enterarse de que se cayó una clase es justamente para lo que
 * el alumno abre esto.
 *
 * **Y es la pantalla donde se pide mover una clase** (Fase 2.4). No hay una
 * "mis pedidos de cambio": el pedido se hace y se sigue acá, sobre la clase, que
 * es lo único que lo hace entendible — ver `PedirOtroDia`.
 */
export function MisReservasPagina() {
  const [desde, setDesde] = useState(() => lunesDe(hoy()))
  const [reservas, setReservas] = useState<ReservaDelPortal[]>([])
  const [pedidos, setPedidos] = useState<ReprogramacionResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cuatro semanas: es el horizonte con el que se piensa la cursada, y entra
  // holgado en el techo de 62 días que pone el backend.
  const hasta = sumarDias(desde, 27)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Las dos juntas: sin los pedidos, una clase con uno pendiente ofrecería
      // el botón otra vez y el backend contestaría que ya hay uno esperando.
      const [agenda, mios] = await Promise.all([misReservas(desde, hasta), misReprogramaciones()])
      setReservas(agenda)
      setPedidos(mios)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus reservas.')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    void cargar()
  }, [cargar])

  /**
   * El pedido de cada clase. La lista viene de lo más nuevo a lo más viejo, así
   * que el primero que aparece por reserva es el vigente: una clase que se pidió
   * mover, se rechazó y se volvió a pedir tiene dos, y el que importa es el
   * último.
   */
  const pedidoDe = new Map<number, ReprogramacionResumen>()
  for (const p of pedidos) {
    if (!pedidoDe.has(p.idReserva)) pedidoDe.set(p.idReserva, p)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mis reservas</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : `Del ${diaYMes(desde)} al ${diaYMes(hasta)}`}
          </p>
        </div>

        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setDesde(sumarDias(desde, -28))}>
            ← Anterior
          </Boton>
          <Boton variante="secundario" onClick={() => setDesde(lunesDe(hoy()))}>
            Hoy
          </Boton>
          <Boton variante="secundario" onClick={() => setDesde(sumarDias(desde, 28))}>
            Siguiente →
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && reservas.length === 0 && (
        <p className="rounded-lg border border-linea bg-white px-5 py-8 text-center text-sm text-tenue">
          No tenés nada agendado en estas cuatro semanas.
        </p>
      )}

      <ul className="space-y-3">
        {reservas.map((r) => {
          const caida = r.estado === 'CANCELADA' || r.estado === 'REPROGRAMADA'

          return (
            <li
              key={r.idReserva}
              className={`flex flex-wrap items-center gap-4 rounded-lg border border-linea bg-white px-5 py-4 ${
                caida ? 'text-apagado' : ''
              }`}
            >
              {/* El color sale del tipo de uso, igual que en el calendario de
                  administración: es el mismo dato, no una paleta propia. */}
              <span
                aria-hidden
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: caida ? '#d4d0c8' : (r.color ?? '#1a1a1a') }}
              />

              <div className="w-28 shrink-0">
                <div className="font-medium">{diaYMes(r.fecha)}</div>
                <div className="text-xs text-tenue">
                  {hhmm(r.horaInicio)} a {hhmm(r.horaFin)}
                </div>
              </div>

              <div className="min-w-40 grow">
                <div className={`font-medium ${caida ? 'line-through' : ''}`}>{r.tipoUso}</div>
                <div className="text-xs text-tenue">
                  {r.sala}
                  {r.profesor && ` · con ${r.profesor}`}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right text-xs">
                {caida ? (
                  <span className="font-medium text-acento">
                    {r.estado === 'CANCELADA' ? 'Cancelada' : 'Reprogramada'}
                  </span>
                ) : (
                  <Asistencia estado={r.miAsistencia} />
                )}

                <PedirOtroDia
                  reserva={r}
                  pedido={pedidoDe.get(r.idReserva)}
                  onPedido={() => void cargar()}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Cómo quedó registrada la asistencia.
 *
 * `null` es normal y no se dibuja: pasa cuando la reserva es tuya porque la
 * pagaste y no porque estés anotado —un alquiler de cabina— y ahí no hay lista
 * que tomar.
 */
function Asistencia({ estado }: { estado: ReservaDelPortal['miAsistencia'] }) {
  if (estado === null || estado === 'PENDIENTE') return null

  if (estado === 'PRESENTE') return <span className="text-tenue">Asististe</span>
  if (estado === 'AUSENTE') return <span className="text-acento">Faltaste</span>
  if (estado === 'AUSENTE_JUSTIFICADO')
    return <span className="text-tenue">Falta justificada</span>

  return <span className="text-apagado">Diste de baja</span>
}
