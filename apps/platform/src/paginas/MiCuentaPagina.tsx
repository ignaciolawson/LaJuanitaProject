import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { abrirMiComprobante, miEstadoDeCuenta } from '../api/portal'
import type { EstadoDeCuenta } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { DetalleDeCuenta } from '../componentes/DetalleDeCuenta'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

/**
 * Módulo 4 — mi estado de cuenta.
 *
 * **Es el mismo detalle que ve administración**, dibujado por el mismo
 * componente. No hay una versión recortada para el alumno porque no hay nada
 * adentro que su dueño no pueda ver, y dos lecturas del mismo saldo son la forma
 * más fácil de que un día no coincidan — con la mala suerte de que la que se
 * equivocaría es la que ve el cliente.
 *
 * **El alumno no modifica nada acá** (regla dura de §7): mira — pero desde el
 * 2026-08-30 **sí baja sus comprobantes**, que era lo que el Módulo 4 dejó
 * anotado como pendiente esperando al `StorageService` de §2.4. Los baja por
 * `/api/me/**`, donde su id sale del token: el ajeno contesta "no existe".
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

  async function abrir(idComprobante: number) {
    try {
      await abrirMiComprobante(idComprobante)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo abrir el comprobante.')
    }
  }

  if (cargando) return <p className="text-sm text-tenue">Cargando…</p>
  if (error) return <Aviso>{error}</Aviso>
  if (!cuenta) return null

  return (
    <div>
      <CabeceraDePagina
        titulo="Mis pagos"
        aclaracion={<>Lo que contrataste, lo que pagaste y lo que debés.</>}
      />

      <DetalleDeCuenta cuenta={cuenta} onVerComprobante={(_, c) => void abrir(c.idComprobante)} />

      <p className="mt-6 text-xs leading-relaxed text-apagado">
        Si ves algo que no cuadra, escribinos: los pagos los registra
        administración y desde acá no se editan.
      </p>
    </div>
  )
}
