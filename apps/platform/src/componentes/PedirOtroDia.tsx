import { useState } from 'react'

import { ApiError } from '../api/cliente'
import { pedirMoverLaClase } from '../api/portal'
import type { EstadoReserva } from '../api/tiposAdmin'
import type { ReprogramacionResumen } from '../api/tiposPortal'
import { Aviso, Boton } from './Boton'
import { Campo } from './Campo'
import { hoy } from './semana'

/**
 * "No puedo ese día": el pedido de mover una clase, al lado de la clase.
 *
 * **Vive en `componentes/` porque lo dibujan dos pantallas** —Mis reservas y Mi
 * agenda del profesor— y son el mismo gesto visto desde los dos lados de la
 * clase. P9 se contestó así: el profesor pide con el mismo botón que el alumno,
 * y lo único que cambia es desde dónde se entra. Con dos copias, agregarle algo
 * al pedido lo agregaría en una sola.
 *
 * **No hay una pantalla "mis pedidos de cambio", y es deliberado.** El estado del
 * pedido se muestra acá, sobre la clase: un pedido de mover algo no se entiende
 * sin la cosa que se quiere mover, y una lista aparte obligaría a cruzar dos
 * pantallas para saber si el martes sigue siendo el martes.
 *
 * **Pedir no mueve nada.** El horario nuevo lo pone administración al aprobar,
 * porque es lo que quien pide no puede saber: qué sala queda libre, de qué
 * profesor depende. Por eso el formulario pide el motivo —obligatorio, es lo que
 * se evalúa— y como mucho un día preferido.
 */
export function PedirOtroDia({
  reserva,
  pedido,
  onPedido,
}: {
  reserva: { idReserva: number; fecha: string; estado: EstadoReserva }
  /** El pedido que ya existe sobre esta clase, si hay alguno. */
  pedido?: ReprogramacionResumen
  onPedido: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [fecha, setFecha] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (pedido) {
    return <EstadoDelPedido pedido={pedido} />
  }

  // Se pide mover algo que todavía va a pasar. El backend lo verifica igual —es
  // el que manda—; acá no se ofrece el botón para no ofrecer algo que va a
  // fallar, que es la misma razón por la que Pagos no ofrece cobrarle un curso a
  // un pagador externo.
  const ocupaSuFranja = reserva.estado !== 'CANCELADA' && reserva.estado !== 'REPROGRAMADA'
  if (!ocupaSuFranja || reserva.fecha < hoy()) {
    return null
  }

  if (!abierto) {
    return (
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Pedir otro día
      </Boton>
    )
  }

  async function enviar() {
    if (!motivo.trim()) {
      setError('Contanos por qué no podés, así podemos buscarte otro horario.')
      return
    }
    setEnviando(true)
    try {
      await pedirMoverLaClase({
        idReserva: reserva.idReserva,
        motivo: motivo.trim(),
        fechaAlternativa: fecha || undefined,
      })
      setAbierto(false)
      setMotivo('')
      setFecha('')
      setError(null)
      onPedido()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo mandar el pedido.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="w-full border-t border-linea pt-4">
      <h4 className="font-medium">Pedir otro día</h4>
      <p className="mt-1 text-sm text-tenue">
        Todavía no cambia nada: lo miramos y te confirmamos el horario nuevo. Si tenés un día
        que te viene bien, decilo — no siempre podemos darlo.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Por qué no podés"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Me cambiaron el turno del trabajo"
        />
        <Campo
          etiqueta="Día que te vendría bien (opcional)"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
      </div>

      {error && (
        <div className="mt-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <Boton type="button" disabled={enviando} onClick={() => void enviar()}>
          {enviando ? 'Mandando…' : 'Mandar el pedido'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  )
}

/**
 * En qué quedó el pedido.
 *
 * **El rechazo muestra el motivo**, que es lo único con lo que se puede hacer
 * algo: con "no se pudo" a secas no hay nada que decidir; con el porqué, se pide
 * otro día.
 */
function EstadoDelPedido({ pedido }: { pedido: ReprogramacionResumen }) {
  if (pedido.estado === 'PENDIENTE') {
    return <span className="text-xs text-tenue">Pediste moverla · esperando respuesta</span>
  }

  if (pedido.estado === 'APROBADA') {
    return <span className="text-xs text-tenue">La movimos a pedido tuyo</span>
  }

  return (
    <span className="text-xs text-acento">
      No se pudo mover
      {pedido.respuesta && <span className="text-tenue"> · {pedido.respuesta}</span>}
    </span>
  )
}
