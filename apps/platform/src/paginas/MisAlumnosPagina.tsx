import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { misAlumnos } from '../api/docencia'
import type { AlumnoDelProfesor, CursoDelAlumno } from '../api/tiposDocencia'
import { Aviso } from '../componentes/Boton'
import { Semaforo } from '../componentes/Semaforo'
import { NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 5, pantalla 2 — mis alumnos.
 *
 * **Es una lista de trabajo, no una agenda de contactos.** Por eso no trae
 * teléfono ni email: los datos de contacto son de administración, que es quien
 * llama cuando alguien deja de venir. Acá el profesor mira dos cosas —cómo va
 * cada uno y cuánto le queda— y entra a la ficha a anotar.
 *
 * **Quién aparece son dos caminos**, y conviene que la pantalla lo diga: los de
 * una inscripción asignada a mí, **y** los de cualquier clase que yo haya
 * dictado. El segundo es el del suplente, que es justo cuando más falta hace
 * poder dejar la nota de esa clase.
 *
 * ⚠️ **Un grupo es UNA tarjeta, no tres filas sueltas** (P95, Ignacio
 * 2026-09-20: *"que el profe en sus alumnos no vea los alumnos separados si
 * están en grupo, sino que vea el grupo"*). Es el modelo de `V35` visto desde la
 * pantalla del profesor: **el grupo es el alumno** —una inscripción, un precio,
 * una bolsa de clases— y quien le da clase a los tres juntos los ve juntos. Con
 * tres filas sueltas, cada una decía las mismas "6 clases restantes" y parecían
 * dieciocho.
 *
 * <p><b>Lo que sigue siendo por persona no se toca</b>: el semáforo, las notas y
 * el material son de cada alumno (§8), así que adentro de la tarjeta cada uno
 * tiene su marca y su link a su propia ficha. La tarjeta agrupa; no fusiona.
 */
export function MisAlumnosPagina() {
  const [alumnos, setAlumnos] = useState<AlumnoDelProfesor[]>([])
  const [cargando, setCargando] = useState(true)
  // `useState` pelado y no `useErrorPasajero`: abajo esto se dibuja como
  // `if (error) return <Aviso>`, o sea que el mensaje NO acompaña al contenido,
  // lo reemplaza. Limpiarlo a los veinte segundos deja la pantalla en blanco.
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vigente = true
    misAlumnos()
      .then((datos) => {
        if (vigente) setAlumnos(datos)
      })
      .catch((e: unknown) => {
        if (vigente) {
          setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus alumnos.')
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

  const filas = agruparPorGrupo(alumnos)

  return (
    <div>
      <CabeceraDePagina
        titulo="Mis alumnos"
        aclaracion={<>Los de tus cursos y los de las clases que diste. Entrá a cada uno para ver
          tus notas y marcar cómo viene.</>}
      />

      {alumnos.length === 0 && (
        <EstadoVacio titulo="Todavía no tenés alumnos.">
          Aparecen acá cuando te asignan una inscripción o cuando das una clase.
        </EstadoVacio>
      )}

      <ul className="space-y-3">
        {filas.map((fila) =>
          fila.grupo === null ? (
            <li key={fila.clave}>
              <Solo alumno={fila.integrantes[0]} />
            </li>
          ) : (
            <li key={fila.clave}>
              <Grupo fila={fila} />
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

/**
 * Una fila de la lista: un alumno solo, o un grupo con los suyos adentro.
 *
 * `clave` es la inscripción cuando es grupo y el alumno cuando no: dos grupos
 * distintos nunca comparten inscripción, y un alumno sin curso vigente no tiene
 * ninguna.
 */
type Fila = {
  clave: string
  /** El curso compartido, o null si la fila es una persona sola. */
  grupo: CursoDelAlumno | null
  integrantes: AlumnoDelProfesor[]
}

/**
 * Junta en una fila a los alumnos que comparten una inscripción de grupo.
 *
 * ⚠️ **Agrupa por `idInscripcion` y no por `numeroGrupo`**, aunque el número sea
 * lo que se muestra: el grupo **es** la inscripción (`V35`, P87), así que el id
 * es la identidad y el número es el nombre. Agrupar por el nombre sería juntar
 * dos cosas porque se llaman igual.
 *
 * <p><b>El orden se conserva</b> —el servidor los manda por apellido— y el grupo
 * toma el lugar de su primer integrante, así que la lista no se reordena sola
 * cuando alguien se anota a un grupo.
 *
 * <p>⚠️ **Un grupo puede aparecer incompleto y es correcto.** Esta lista es *mis*
 * alumnos: si di una sola clase como suplente y sólo dos de los tres vinieron,
 * los otros no son míos. La tarjeta muestra a los que son.
 */
function agruparPorGrupo(alumnos: AlumnoDelProfesor[]): Fila[] {
  const filas: Fila[] = []
  const porInscripcion = new Map<number, Fila>()

  for (const a of alumnos) {
    const enGrupo = a.cursos.find((c) => c.numeroGrupo !== null)
    if (!enGrupo) {
      filas.push({ clave: `a:${a.idAlumno}`, grupo: null, integrantes: [a] })
      continue
    }
    const ya = porInscripcion.get(enGrupo.idInscripcion)
    if (ya) {
      ya.integrantes.push(a)
      continue
    }
    const fila: Fila = {
      clave: `i:${enGrupo.idInscripcion}`,
      grupo: enGrupo,
      integrantes: [a],
    }
    porInscripcion.set(enGrupo.idInscripcion, fila)
    filas.push(fila)
  }

  return filas
}

const TARJETA =
  'rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4 transition-colors'

/** Un alumno que cursa solo: la fila de siempre. */
function Solo({ alumno }: { alumno: AlumnoDelProfesor }) {
  return (
    <Link to={`/mis-alumnos/${alumno.idAlumno}`} className={`${TARJETA} flex flex-wrap items-center gap-4 hover:border-red`}>
      <div className="min-w-40 grow">
        <div className="font-medium">
          {alumno.nombre} {alumno.apellido}
        </div>
        <div className="text-xs text-tenue">
          {/* Sale de `cursos`, que desde `V23` trae el id de cada
              inscripción además de su disciplina: es el mismo dato que
              antes viajaba suelto como `disciplinas`. */}
          {alumno.cursos.length === 0
            ? 'Sin curso vigente'
            : alumno.cursos.map((c) => NOMBRE_DE_DISCIPLINA[c.disciplina]).join(' · ')}
        </div>
      </div>

      <div className="w-40 shrink-0">
        <Semaforo estado={alumno.estadoSeguimiento} />
      </div>

      <Restantes cantidad={alumno.clasesRestantes} />
    </Link>
  )
}

/**
 * El grupo: el curso arriba, sus integrantes adentro.
 *
 * ⚠️ **La tarjeta NO es un link y cada integrante sí**, al revés que la de un
 * alumno solo. Un grupo no tiene ficha propia —las notas, el semáforo y el
 * material son por persona (§8)— así que un link al grupo tendría que elegir a
 * cuál de los tres llevar, y elegir en silencio es exactamente lo que este
 * sistema no hace.
 *
 * <p><b>Las clases restantes se dicen una sola vez, arriba</b>: son las del
 * curso, que es uno. Repetirlas por integrante es lo que hacía que seis
 * parecieran dieciocho.
 */
function Grupo({ fila }: { fila: Fila }) {
  const curso = fila.grupo!
  return (
    <div className={TARJETA}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-40 grow">
          <div className="font-medium">Grupo {curso.numeroGrupo}</div>
          <div className="text-xs text-tenue">
            {NOMBRE_DE_DISCIPLINA[curso.disciplina]}
            {' · '}
            {fila.integrantes.length === 1
              ? '1 alumno tuyo'
              : `${fila.integrantes.length} alumnos, cursan juntos`}
          </div>
        </div>

        <Restantes cantidad={curso.clasesRestantes} />
      </div>

      <ul className="mt-3 divide-y divide-linea border-t border-linea">
        {fila.integrantes.map((a) => (
          <li key={a.idAlumno}>
            <Link
              to={`/mis-alumnos/${a.idAlumno}`}
              className="flex flex-wrap items-center gap-4 py-2.5 transition-colors hover:text-acento"
            >
              <span className="min-w-40 grow text-sm">
                {a.nombre} {a.apellido}
              </span>
              <span className="w-40 shrink-0">
                <Semaforo estado={a.estadoSeguimiento} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Cuánto queda, escrito igual en las dos formas de fila. */
function Restantes({ cantidad }: { cantidad: number }) {
  return (
    <div className="w-24 shrink-0 text-right">
      <div className="font-semibold tabular-nums">{cantidad}</div>
      <div className="text-xs text-tenue">
        {cantidad === 1 ? 'clase restante' : 'clases restantes'}
      </div>
    </div>
  )
}
