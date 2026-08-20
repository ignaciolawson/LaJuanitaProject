import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { misTrabajos } from '../api/mastering'
import {
  NOMBRE_DE_ESTADO,
  NOMBRE_DE_TIPO,
  type TrabajoDelPortal,
} from '../api/tiposMastering'
import { Aviso } from '../componentes/Boton'
import { importe } from '../componentes/dinero'

/**
 * Módulo 6, el lado del cliente — mis trabajos de Mix & Mastering.
 *
 * **Es solo lectura, y es una decisión del 2026-08-19.** El canal para pedir un
 * trabajo es WhatsApp, y **la mayoría de los clientes de M&M no tienen cuenta en
 * el sistema**: un formulario de pedido acá serviría a una minoría y agregaría un
 * segundo ciclo de vida —como el de las solicitudes de sala— para sostenerlo. Si
 * algún día se construye, el estado "a confirmar" ya existe para eso.
 *
 * **Lo que esta pantalla sí hace es entregar el premaster.** Es el otro extremo de
 * la regla del módulo, y por eso lo importante acá no es lo que muestra sino
 * **cuándo**: el link no llega en la respuesta hasta que administración lo libera.
 * Esconderlo con un `if` en el front no habría servido de nada — viajaría igual y
 * se lee abriendo las herramientas del navegador.
 *
 * ⚠️ El texto de "todavía no disponible" **explica una regla, no decora**: dice por
 * qué no está y qué falta para que esté. Si un rediseño se lo lleva, el cliente
 * pasa a ver un botón que falta en vez de una condición que entiende.
 */
export function MisTrabajosPagina() {
  const [trabajos, setTrabajos] = useState<TrabajoDelPortal[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    misTrabajos()
      .then((datos) => {
        if (vigente) setTrabajos(datos)
      })
      .catch((e: unknown) => {
        if (vigente) {
          setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus trabajos.')
        }
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

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Mix &amp; Mastering</h2>
        <p className="mt-1 text-sm text-tenue">
          Tus trabajos, cómo vienen y dónde bajarlos.
        </p>
      </div>

      {trabajos.length === 0 && (
        <p className="rounded-lg border border-linea bg-white px-5 py-8 text-center text-sm text-tenue">
          Todavía no tenés trabajos cargados. Se piden por WhatsApp y aparecen acá cuando
          los damos de alta.
        </p>
      )}

      <ul className="space-y-3">
        {trabajos.map((t) => {
          const caido = t.estado === 'CANCELADO'

          return (
            <li
              key={t.idTrabajo}
              className={`rounded-lg border border-linea bg-white px-5 py-4 ${
                caido ? 'text-apagado' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className={`font-medium ${caido ? 'line-through' : ''}`}>
                    {t.nombreTrack}
                  </h3>
                  <p className="text-xs text-tenue">
                    {NOMBRE_DE_TIPO[t.tipoTrabajo]}
                    {t.profesorAsignado && ` · ${t.profesorAsignado}`}
                    {t.fechaEntregaReal
                      ? ` · entregado el ${fecha(t.fechaEntregaReal)}`
                      : t.fechaEstimada && ` · estimado para el ${fecha(t.fechaEstimada)}`}
                  </p>
                </div>

                <div className="text-right">
                  <span className="rounded-full border border-linea px-2 py-0.5 text-xs text-tenue">
                    {NOMBRE_DE_ESTADO[t.estado]}
                  </span>
                  {t.precioAcordado !== null && (
                    <div className="mt-1 text-xs text-tenue tabular-nums">
                      {importe(t.precioAcordado, t.moneda)}
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-3 text-xs text-tenue">
                {t.revisionesRealizadas} de {t.revisionesIncluidas} revisiones usadas
              </p>

              <div className="mt-3 flex flex-wrap gap-4 border-t border-linea pt-3 text-sm">
                {t.urlMaster && (
                  <a
                    href={t.urlMaster}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-red"
                  >
                    Bajar el master
                  </a>
                )}

                {t.premasterLiberado && t.urlPremaster ? (
                  <a
                    href={t.urlPremaster}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline underline-offset-2 hover:text-red"
                  >
                    Bajar el premaster
                  </a>
                ) : (
                  // Explica la regla en vez de mostrar un botón apagado: el
                  // premaster se entrega cuando el pago está registrado, y quien
                  // lee esto tiene que poder saber qué falta.
                  <span className="text-xs text-apagado">
                    El premaster se entrega una vez registrado el pago.
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function fecha(iso: string): string {
  const [anio, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${anio}`
}
