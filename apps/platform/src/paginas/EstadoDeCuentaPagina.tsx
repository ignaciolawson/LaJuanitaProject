import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { estadoDeCuenta } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { type EstadoDeCuenta } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { DetalleDeCuenta } from '../componentes/DetalleDeCuenta'

/**
 * Módulo 3, pantalla 2 — qué contrató una persona, qué pagó y qué debe.
 *
 * <p><b>No hay un saldo único, y no puede haberlo.</b> §3.3 lo dejó dicho desde
 * el principio: *"el estado de pago de Juan" no es un valor único*. Un alumno
 * puede tener el curso de DJ al día y el de producción con deuda, y puede haber
 * pagado uno en pesos y otro en dólares. Esta pantalla muestra tres cosas
 * distintas —saldos por moneda, contratos y movimientos— en vez de un semáforo
 * que tendría que elegir cuál de las tres miente.
 *
 * <p>Las monedas nunca se restan entre sí (§2.3): unificarlas exigiría elegir
 * una cotización y el número resultante no correspondería a ninguna caja real.
 */
export function EstadoDeCuentaPagina() {
  const { idUsuario } = useParams()

  const [cuenta, setCuenta] = useState<EstadoDeCuenta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setCuenta(await estadoDeCuenta(Number(idUsuario)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el estado de cuenta.')
      setCuenta(null)
    } finally {
      setCargando(false)
    }
  }, [idUsuario])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (cargando) return <p className="text-sm text-tenue">Cargando…</p>

  if (error) return <Aviso>{error}</Aviso>

  if (!cuenta) return null

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {cuenta.apellido}, {cuenta.nombre}
        </h2>
        <p className="mt-1 text-sm text-tenue">{cuenta.email}</p>
      </div>

      <DetalleDeCuenta cuenta={cuenta} />
    </div>
  )
}
