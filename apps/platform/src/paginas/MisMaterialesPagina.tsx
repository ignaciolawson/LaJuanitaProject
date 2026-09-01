import { useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { misMateriales } from '../api/portal'
import type { MaterialResumen } from '../api/tiposDocencia'
import { Aviso } from '../componentes/Boton'
import { Bloque } from '../componentes/Bloque'
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
 *
 * ⚠️ **Se divide por profesor, y no por programa** (`mejoras.md` §12 · B1). El
 * pedido era *"dividirlo por programa, por clase"* y **ese dato no existe**:
 * `material` cuelga de `profesor` y de `alumno`, y no tiene `id_inscripcion` ni
 * `id_reserva` — se verificó contra la base, no contra el modelo. Agregarlos es
 * una migración, o sea grupo C, y está anotado en §12 como lo que le falta a
 * este punto.
 *
 * Lo que sí sale del dato es el profesor, que en la práctica es de quién es cada
 * curso, y **el encabezado dice el nombre de la persona en vez de inventar el
 * nombre de un programa**: es exactamente lo que se sabe, ni más ni menos.
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

      <div className="space-y-5">
        {porProfesor(materiales).map(([profesor, suyos]) => (
          <Bloque
            key={profesor}
            titulo={profesor}
            relleno="ninguno"
            accion={
              <span className="t-mono text-tenue">
                {suyos.length === 1 ? '1 material' : `${suyos.length} materiales`}
              </span>
            }
          >
            <ul className="divide-y divide-linea">
              {suyos.map((m) => (
                <li
                  key={m.idMaterial}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-40 grow">
                    <div className="font-medium">{m.titulo}</div>
                    <div className="text-xs text-tenue">
                      {/* El profesor ya lo dice el encabezado del bloque: acá
                          repetirlo en cada fila es ruido. */}
                      {m.tipo && `${m.tipo} · `}
                      {cuando(m.fechaSubida)}
                      {/* Lo grupal se dice: saber que algo es para todo el curso
                          y no para uno cambia cómo se lee. */}
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
          </Bloque>
        ))}
      </div>
    </div>
  )
}

/**
 * Los materiales agrupados por quién los subió, cada grupo del más nuevo al más
 * viejo.
 *
 * **El orden de los grupos es el del material más reciente de cada uno**, y no
 * alfabético: quien te dio algo ayer va primero. Alfabético haría que el
 * profesor que no sube nada hace tres meses encabece la pantalla por llamarse
 * Álvarez.
 */
function porProfesor(materiales: MaterialResumen[]): [string, MaterialResumen[]][] {
  const grupos = new Map<string, MaterialResumen[]>()
  for (const m of [...materiales].sort((a, b) => b.fechaSubida.localeCompare(a.fechaSubida))) {
    const suyos = grupos.get(m.profesor)
    if (suyos) suyos.push(m)
    else grupos.set(m.profesor, [m])
  }
  return [...grupos.entries()]
}
