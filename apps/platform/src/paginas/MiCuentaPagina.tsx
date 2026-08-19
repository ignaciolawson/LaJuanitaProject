import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { miEstadoDeCuenta } from '../api/portal'
import type { EstadoDeCuenta } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { DetalleDeCuenta } from '../componentes/DetalleDeCuenta'

/**
 * Módulo 4 — mi estado de cuenta.
 *
 * **Es el mismo detalle que ve administración**, dibujado por el mismo
 * componente. No hay una versión recortada para el alumno porque no hay nada
 * adentro que su dueño no pueda ver, y dos lecturas del mismo saldo son la forma
 * más fácil de que un día no coincidan — con la mala suerte de que la que se
 * equivocaría es la que ve el cliente.
 *
 * **El alumno no modifica nada acá** (regla dura de §7): mira. Los comprobantes
 * descargables llegan cuando exista el `StorageService` de §2.4.
 */
export function MiCuentaPagina() {
  const [cuenta, setCuenta] = useState<EstadoDeCuenta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    miEstadoDeCuenta()
      .then((datos) => {
        if (vigente) setCuenta(datos)
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu cuenta.')
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => {
      vigente = false
    }
  }, [])

  if (cargando) return <p className="text-sm text-tenue">Cargando…</p>
  if (error) return <Aviso>{error}</Aviso>
  if (!cuenta) return null

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Mis pagos</h2>
        <p className="mt-1 text-sm text-tenue">Lo que contrataste, lo que pagaste y lo que debés.</p>
      </div>

      <DetalleDeCuenta cuenta={cuenta} />

      <p className="mt-6 text-xs leading-relaxed text-apagado">
        Si ves algo que no cuadra, escribinos: los pagos los registra
        administración y desde acá no se editan.
      </p>
    </div>
  )
}
