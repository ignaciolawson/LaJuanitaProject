import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { misMateriales } from '../api/portal'
import type { MaterialResumen } from '../api/tiposDocencia'
import { Aviso } from '../componentes/Boton'
import { cuando } from '../componentes/presentacion'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 5, pantalla 6 — mis materiales, **como alumno**.
 *
 * Es la que salda la deuda que el Módulo 4 dejó anotada: `MisCursosPagina`
 * dibujaba un bloque *"todavía no disponible"* que ahora apunta acá.
 *
 * **Solo llega lo que el profesor publicó**, y esa condición vive en la consulta
 * del backend, no en esta pantalla: no hay forma de pedir esto sin ella. Lo que
 * uno sube, si además da clases, está en *Subir material* — el tramo `/profesor`
 * de la ruta dice desde qué relación se mira, porque una misma persona puede ser
 * alumna y profesora.
 *
 * **No hay interruptores acá**: el alumno recibe material, no lo administra.
 */
export function MisMaterialesPagina() {
  const [materiales, setMateriales] = useState<MaterialResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    misMateriales()
      .then((datos) => {
        if (vigente) setMateriales(datos)
      })
      .catch((e: unknown) => {
        if (vigente) {
          setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus materiales.')
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
      <CabeceraDePagina
        titulo="Mis materiales"
        aclaracion={<>Lo que subieron tus profesores para vos.</>}
      />

      {materiales.length === 0 && (
        <EstadoVacio titulo="Todavía no tenés materiales.">
          Los sube tu profesor cuando los tiene listos.
        </EstadoVacio>
      )}

      <ul className="space-y-2">
        {materiales.map((m) => (
          <li
            key={m.idMaterial}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4"
          >
            <div className="min-w-40 grow">
              <div className="font-medium">{m.titulo}</div>
              <div className="text-xs text-tenue">
                {m.profesor}
                {m.tipo && ` · ${m.tipo}`} · {cuando(m.fechaSubida)}
                {/* Lo grupal se dice: saber que algo es para todo el curso y no
                    para uno cambia cómo se lee. */}
                {m.esGrupal && ' · para todo el curso'}
              </div>
            </div>

            {m.urlExterna && (
              <a
                href={m.urlExterna}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline underline-offset-2 hover:text-acento"
              >
                Abrir
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
