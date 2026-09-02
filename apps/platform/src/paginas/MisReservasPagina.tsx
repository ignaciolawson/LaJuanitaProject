import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { misReprogramaciones, misReservas } from '../api/portal'
import type { ReprogramacionResumen, ReservaDelPortal } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { PedirOtroDia } from '../componentes/PedirOtroDia'
import { diaYMes, hhmm, hoy, lunesDe, sumarDias } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'
import { cuando } from '../componentes/presentacion'
import { Proxima } from '../componentes/Proxima'

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
 * ⚠️ **Las clases y las salas van en dos listas** (`mejoras.md` §12 · B1). Es
 * la misma pantalla que Ignacio describió del otro lado —*"hacer divisiones por
 * donde se pueda"*— y acá el corte es el más fuerte del sistema: una clase de DJ
 * y una cabina alquilada para practicar **no se cancelan igual, no se pagan
 * igual y no descuentan lo mismo**. Mezcladas en una lista por fecha, la única
 * forma de saber cuál es cuál era leer el nombre del tipo de uso en la fila.
 *
 * El dato ya existía: `esClase` viaja en `ReservaDelPortal` desde el Módulo 4, y
 * es el mismo `tipo_uso.es_clase` que usa el resto del sistema. **Un grupo vacío
 * no se dibuja** —quien nunca alquiló una cabina no tiene por qué ver un título
 * que le habla de algo que no hizo—, que es lo contrario de la regla del Inicio
 * y por un motivo: allá el vacío es "no tenés nada pendiente", que es
 * información; acá sería el nombre de un servicio que no compró.
 *
 * **Y es la pantalla donde se pide mover una clase** (Fase 2.4). No hay una
 * "mis pedidos de cambio": el pedido se hace y se sigue acá, sobre la clase, que
 * es lo único que lo hace entendible — ver `PedirOtroDia`.
 */
export function MisReservasPagina() {
  // ⚠️ El día se fija UNA vez y no se relee en cada render. Es la lección de
  // `CajaPagina`: una pantalla que consulta el reloj mientras dibuja tiene un
  // caso que sólo falla algunos días del año, y no hay forma de escribirle una
  // prueba estable.
  const [ahora] = useState(hoy)
  const [desde, setDesde] = useState(() => lunesDe(ahora))
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

  /**
   * La primera que todavía no pasó y que sigue en pie.
   *
   * Una cancelada o reprogramada **no** es la próxima aunque figure primera en
   * la lista: la lista las muestra porque son historia de la persona, y esta
   * pieza contesta otra pregunta.
   */
  const proxima = reservas
    .filter((r) => r.estado !== 'CANCELADA' && r.estado !== 'REPROGRAMADA')
    .filter((r) => r.fecha >= ahora)
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))[0]

  /**
   * Las dos listas (§12 · B1): las clases y lo que alquilaste.
   *
   * ⚠️ **`Proxima` sigue siendo UNA sola y mira las dos**, y eso es a propósito:
   * la pregunta que contesta es "cuándo tengo que venir al estudio", y venir a
   * una clase o venir a la cabina que reservaste es venir igual. Partirla en dos
   * próximas obligaría a comparar dos fechas para saber cuál es antes, que es
   * exactamente el trabajo que esa pieza vino a ahorrar.
   *
   * **Un grupo sin filas no se dibuja**: quien nunca alquiló una cabina no tiene
   * por qué leer un título sobre algo que no hizo.
   */
  const grupos = (
    [
      ['Mis clases', reservas.filter((r) => r.esClase)],
      ['Salas y cabina', reservas.filter((r) => !r.esClase)],
    ] as [string, ReservaDelPortal[]][]
  ).filter(([, suyas]) => suyas.length > 0)

  /*
   * ⚠️ **La reserva destacada SIGUE en la lista, y el duplicado es el precio.**
   *
   * Se probó sacarla —la pieza arriba, la lista con el resto— y rompía seis
   * casos por la misma causa: **la fila lleva los controles**. "Pedir otro
   * día", el estado de ese pedido y la asistencia viven en el renglón, no en la
   * pieza. Sacar la fila destacada le sacaba a la persona el botón para pedir
   * que muevan justo la clase que tiene más cerca, que es la única sobre la que
   * alguien lo pide de verdad.
   *
   * Así que la pieza es un resumen y no un reemplazo: contesta "¿cuándo es?" de
   * un vistazo y la lista sigue siendo el registro completo del período.
   */

  return (
    <div>
      <CabeceraDePagina
        titulo="Mis reservas"
        aclaracion={<>{cargando ? 'Cargando…' : `Del ${diaYMes(desde)} al ${diaYMes(hasta)}`}</>}
        acciones={<><Boton variante="secundario" onClick={() => setDesde(sumarDias(desde, -28))}>
            ← Anterior
          </Boton>
          <Boton variante="secundario" onClick={() => setDesde(lunesDe(ahora))}>
            Hoy
          </Boton>
          <Boton variante="secundario" onClick={() => setDesde(sumarDias(desde, 28))}>
            Siguiente →
          </Boton></>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && reservas.length === 0 && (
        <EstadoVacio titulo="No tenés nada agendado en estas cuatro semanas." />
      )}

      {/* La respuesta va ANTES que la lista. Ver `Proxima`: quien abre esta
          pantalla quiere saber cuándo es la próxima, no leer catorce filas
          ordenadas por fecha con todas pesando lo mismo. */}
      {proxima && (
        <Proxima
          className="mb-6"
          hoy={ahora}
          fecha={proxima.fecha}
          horaInicio={proxima.horaInicio}
          horaFin={proxima.horaFin}
          titulo={proxima.tipoUso}
          detalle={[proxima.sala, proxima.profesor && `con ${proxima.profesor}`]
            .filter(Boolean)
            .join(' · ')}
        />
      )}

      {grupos.map(([titulo, suyas]) => (
        <section key={titulo} className="mb-8 last:mb-0">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="t-mono shrink-0 text-tenue">{titulo}</h2>
            <span aria-hidden className="h-px grow bg-linea" />
          </div>

          <ul className="space-y-3">
        {suyas.map((r) => {
          const caida = r.estado === 'CANCELADA' || r.estado === 'REPROGRAMADA'

          return (
            <li
              key={r.idReserva}
              className={`flex flex-wrap items-center gap-4 rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4 transition-colors hover:border-tenue ${
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
                ) : r.estado === 'PRECONFIRMADA' ? (
                  <Apartada venceEn={r.venceEn} />
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
        </section>
      ))}
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

/**
 * El horario está apartado y falta abonarlo (`mejoras.md` §13 · C1).
 *
 * **Dice el plazo con la hora y no sólo el día**, y no es un detalle: el plazo es
 * el menor entre 24 horas y el inicio de la franja, así que puede vencer esta
 * misma tarde. "Vence el 03/09" sobre algo que se cae a las 10 de la mañana es
 * información que hace perder el horario.
 *
 * ⚠️ **Va en rojo a propósito.** En el resto del sistema el acento es un bisturí,
 * pero acá lo que se está diciendo es *tenés algo que hacer y hay un reloj
 * corriendo*: es exactamente el caso para el que ese color existe. Sin esto, una
 * prereserva se lee igual que una reserva confirmada y la persona se entera de que
 * no lo estaba cuando el horario ya se liberó.
 */
function Apartada({ venceEn }: { venceEn: string | null }) {
  return (
    <span className="font-medium text-acento">
      Falta abonarla
      {venceEn && (
        <span className="block font-normal text-tenue">
          Vence el {cuando(venceEn)}
        </span>
      )}
    </span>
  )
}
