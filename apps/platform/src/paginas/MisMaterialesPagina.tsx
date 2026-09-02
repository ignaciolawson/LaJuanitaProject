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
 * **Se divide por curso y, dentro, por clase** — que es exactamente lo que pidió
 * Ignacio (`mejoras.md` §12 · C2: *"dividirlo por programa, por clase"*).
 *
 * ⚠️ **Cuando lo pidió, ese dato no existía.** `material` colgaba de `profesor` y
 * de `alumno`, sin ninguna columna de curso ni de clase, así que la primera
 * versión de esta pantalla agrupó por profesor —lo único que se sabía— y el punto
 * se movió al grupo C. `V23` agregó las dos columnas; esto es la otra mitad.
 *
 * **El material sin clase va último y junto**, bajo "De todo el curso": es
 * material del programa y no de un día, y ordenarlo por fecha entre las clases lo
 * escondería entre ellas.
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
        {porCursoYClase(materiales).map((grupo) => (
          <Bloque
            key={grupo.curso}
            titulo={grupo.curso}
            relleno="ninguno"
            accion={
              <span className="t-mono text-tenue">
                {contar(grupo)} {contar(grupo) === 1 ? 'material' : 'materiales'}
              </span>
            }
          >
            {grupo.clases.map(([clase, suyos]) => (
              <div key={clase} className="border-b border-linea last:border-0">
                <p className="t-mono bg-superficie-2 px-5 py-1.5 text-tenue">{clase}</p>

                <ul className="divide-y divide-linea">
                  {suyos.map((m) => (
                    <li
                      key={m.idMaterial}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                    >
                      <div className="min-w-40 grow">
                        <div className="font-medium">{m.titulo}</div>
                        <div className="text-xs text-tenue">
                          {/* El curso ya lo dice el bloque y la clase la franja:
                              acá va lo que no está dicho todavía. */}
                          {m.profesor}
                          {m.tipo && ` · ${m.tipo}`} · {cuando(m.fechaSubida)}
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
            ))}
          </Bloque>
        ))}
      </div>
    </div>
  )
}

/**
 * Los materiales agrupados por curso y, dentro de cada uno, por clase.
 *
 * **El orden de los cursos es el del material más reciente de cada uno**, y no
 * alfabético: el curso en el que te dieron algo ayer va primero. Dentro, las
 * clases van de la más nueva a la más vieja y **"De todo el curso" va última**,
 * porque no es un día — es el material que vale para el programa entero.
 */
type Grupo = { curso: string; clases: [string, MaterialResumen[]][] }

const SIN_CLASE = 'De todo el curso'

function porCursoYClase(materiales: MaterialResumen[]): Grupo[] {
  const nuevoPrimero = [...materiales].sort((a, b) =>
    b.fechaSubida.localeCompare(a.fechaSubida),
  )

  const cursos = new Map<string, Map<string, MaterialResumen[]>>()
  for (const m of nuevoPrimero) {
    const clases = cursos.get(m.curso) ?? new Map<string, MaterialResumen[]>()
    cursos.set(m.curso, clases)

    const clave = m.clase ? `Clase del ${m.clase.slice(0, 10)}` : SIN_CLASE
    clases.set(clave, [...(clases.get(clave) ?? []), m])
  }

  return [...cursos.entries()].map(([curso, clases]) => ({
    curso,
    // Se ordenan las claves y no el Map: la inserción ya vino por fecha, pero
    // "De todo el curso" tiene que caer al final aunque su material sea el más
    // nuevo de todos.
    clases: [...clases.entries()].sort(([a], [b]) => {
      if (a === SIN_CLASE) return 1
      if (b === SIN_CLASE) return -1
      return 0
    }),
  }))
}

/** Cuántos materiales tiene un curso, sumando sus clases. */
function contar(grupo: Grupo): number {
  return grupo.clases.reduce((total, [, suyos]) => total + suyos.length, 0)
}
