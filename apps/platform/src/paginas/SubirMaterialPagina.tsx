import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import {
  cambiarVisibilidad,
  miAgenda,
  misAlumnos,
  misMaterialesSubidos,
  subirMaterial,
} from '../api/docencia'
import type { ReservaResumen } from '../api/tiposAdmin'
import type { AlumnoDelProfesor, MaterialResumen } from '../api/tiposDocencia'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { cuando, NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { diaYMes, hhmm, hoy, sumarDias } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 5, pantalla 4 — subir material.
 *
 * **Hoy el material es un link y no un archivo**, y no es un campo que falte: el
 * `StorageService` de §2.4 todavía no existe. La tabla acepta las dos formas
 * desde `V1`, así que el módulo entra entero sin arrastrar la infraestructura de
 * archivos — que el Módulo 6 va a tener que construir igual para retener el
 * premaster. Cuando esté, esta pantalla gana una alternativa, no cambia.
 *
 * ⚠️ **El material se sube A UN CURSO, y opcionalmente a una clase de ese
 * curso** (`V23`, `mejoras.md` §12 · C2).
 *
 * Antes el control decía *"¿Para quién? → Todos mis alumnos / un alumno"*, y
 * ese "todos" **no filtraba por nada**: el material le llegaba a todos los
 * alumnos del estudio, incluidos los que nunca tuvieron a este profesor. La
 * pantalla del alumno lo mostraba como *"para todo el curso"* y la lista de acá
 * como *"Para todos"*: tres textos para una cosa que nadie había decidido.
 *
 * **La lista de clases sale del curso elegido**, no de un pedido nuevo: son las
 * clases que ese alumno cursó con esa inscripción, que es la misma condición que
 * el backend exige. Elegir el curso primero es lo que hace que la segunda lista
 * no pueda ofrecer una clase ajena.
 *
 * **Se ve todo lo subido, publicado o no.** Es la diferencia con la pantalla del
 * alumno: el profesor necesita ver qué tiene preparado, y el interruptor es la
 * regla dura *"el alumno lo ve solo si el profesor lo habilitó"*.
 */
/** Ventana de clases que se ofrecen, igual que la de las notas y por lo mismo. */
const DIAS_DE_HISTORIAL = 60

export function SubirMaterialPagina() {
  const [alumnos, setAlumnos] = useState<AlumnoDelProfesor[]>([])
  const [materiales, setMateriales] = useState<MaterialResumen[]>([])
  const [clases, setClases] = useState<ReservaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const hasta = hoy()
      const [mios, subidos, dictadas] = await Promise.all([
        misAlumnos(),
        misMaterialesSubidos(),
        miAgenda(sumarDias(hasta, -DIAS_DE_HISTORIAL), hasta),
      ])
      setAlumnos(mios)
      setMateriales(subidos)
      setClases(dictadas)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu material.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <div className="max-w-3xl">
      <CabeceraDePagina
        titulo="Subir material"
        aclaracion={<>Un link con un título: un pack de samples, un proyecto, un video. Podés
          dejarlo sin publicar y habilitarlo después.</>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <Formulario
        alumnos={alumnos}
        clases={clases}
        alSubir={(nuevo) => setMateriales([nuevo, ...materiales])}
      />

      <h3 className="t-seccion mt-8 mb-3">Lo que subiste</h3>

      {cargando && <p className="text-sm text-tenue">Cargando…</p>}

      {!cargando && materiales.length === 0 && (
        <EstadoVacio titulo="Todavía no subiste nada." />
      )}

      <ul className="space-y-2">
        {materiales.map((m) => (
          <Fila
            key={m.idMaterial}
            material={m}
            alCambiar={(cambiado) =>
              setMateriales(
                materiales.map((otro) =>
                  otro.idMaterial === cambiado.idMaterial ? cambiado : otro,
                ),
              )
            }
          />
        ))}
      </ul>
    </div>
  )
}

function Formulario({
  alumnos,
  clases,
  alSubir,
}: {
  alumnos: AlumnoDelProfesor[]
  /** Las clases que di en los últimos 60 días, para elegir de cuál es. */
  clases: ReservaResumen[]
  alSubir: (material: MaterialResumen) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('')
  const [urlExterna, setUrlExterna] = useState('')
  const [curso, setCurso] = useState('')
  const [clase, setClase] = useState('')
  const [publicar, setPublicar] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault()
    setEnviando(true)
    setError(null)
    setErrores({})
    try {
      const nuevo = await subirMaterial({
        idInscripcion: Number(curso),
        // Vacío = de todo el curso, que es material del programa y no de un día.
        idReserva: clase === '' ? undefined : Number(clase),
        titulo: titulo.trim(),
        tipo: tipo.trim() === '' ? undefined : tipo.trim(),
        urlExterna: urlExterna.trim(),
        visibleAlumno: publicar,
      })
      alSubir(nuevo)
      setTitulo('')
      setTipo('')
      setUrlExterna('')
      // El curso NO se limpia: subir tres materiales seguidos al mismo curso es
      // lo normal, y volver a elegirlo cada vez es trabajo que la pantalla puede
      // ahorrar. La clase sí, porque es lo que cambia entre uno y otro.
      setClase('')
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        setErrores(e.errores ?? {})
      } else {
        setError('No se pudo subir el material.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Título"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          error={errores.titulo}
        />

        <Campo
          etiqueta="Tipo"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          error={errores.tipo}
          ayuda="Opcional: sample pack, proyecto, video…"
        />

        <Campo
          etiqueta="Link"
          required
          value={urlExterna}
          onChange={(e) => setUrlExterna(e.target.value)}
          error={errores.urlExterna ?? errores.urlConEsquema}
          ayuda="Tiene que empezar con http:// o https://"
          className="sm:col-span-2"
        />

        {/* El curso dice a la vez de quién es el material y de qué programa:
            una inscripción es el contrato de un alumno. */}
        <CampoSelect
          etiqueta="¿Para qué curso?"
          required
          value={curso}
          onChange={(e) => {
            setCurso(e.target.value)
            // La clase elegida pertenece al curso anterior: dejarla puesta arma
            // un pedido que el backend rechaza y que nadie escribió a propósito.
            setClase('')
          }}
          error={errores.idInscripcion}
        >
          <option value="">Elegí un curso</option>
          {alumnos.flatMap((a) =>
            a.cursos.map((c) => (
              <option key={c.idInscripcion} value={c.idInscripcion}>
                {a.nombre} {a.apellido} · {NOMBRE_DE_DISCIPLINA[c.disciplina]}
                {c.nivel && ` ${c.nivel.toLowerCase()}`}
              </option>
            )),
          )}
        </CampoSelect>

        <CampoSelect
          etiqueta="¿De qué clase?"
          value={clase}
          onChange={(e) => setClase(e.target.value)}
          error={errores.idReserva}
          disabled={curso === ''}
        >
          {/* El vacío es una opción válida y no un "elegí algo": material de todo
              el curso —la bibliografía, el programa— no es de ningún día. */}
          <option value="">De todo el curso</option>
          {clasesDe(clases, curso).map((r) => (
            <option key={r.idReserva} value={r.idReserva}>
              {diaYMes(r.fecha)} {hhmm(r.horaInicio)} · {r.tipoUso}
            </option>
          ))}
        </CampoSelect>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={publicar}
          onChange={(e) => setPublicar(e.target.checked)}
        />
        Publicarlo ahora
      </label>
      <p className="mt-1 text-xs text-apagado">
        Sin publicar queda preparado y el alumno no lo ve hasta que lo habilites.
      </p>

      {error && (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-4">
        <Boton type="submit" disabled={enviando}>
          Subir material
        </Boton>
      </div>
    </form>
  )
}

function Fila({
  material,
  alCambiar,
}: {
  material: MaterialResumen
  alCambiar: (material: MaterialResumen) => void
}) {
  const [error, setError] = useState<string | null>(null)

  async function alternar() {
    setError(null)
    try {
      alCambiar(await cambiarVisibilidad(material.idMaterial, !material.visibleAlumno))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar la visibilidad.')
    }
  }

  return (
    <li className="rounded-md border border-linea bg-superficie px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-40 grow">
          <div className="text-sm font-medium">{material.titulo}</div>
          <div className="text-xs text-tenue">
            {material.alumno} · {material.curso}
            {material.clase && ` · clase del ${material.clase.slice(0, 10)}`}
            {material.tipo && ` · ${material.tipo}`} · {cuando(material.fechaSubida)}
            {material.urlExterna && (
              <>
                {' · '}
                <a
                  href={material.urlExterna}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-acento"
                >
                  Abrir
                </a>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs ${material.visibleAlumno ? 'text-tenue' : 'text-apagado'}`}>
            {material.visibleAlumno ? 'Publicado' : 'No publicado'}
          </span>
          <Boton
            variante="secundario"
            onClick={() => {
              void alternar()
            }}
          >
            {material.visibleAlumno ? 'Ocultar' : 'Publicar'}
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mt-2">
          <Aviso>{error}</Aviso>
        </div>
      )}
    </li>
  )
}

/**
 * Las clases de un curso, de la más nueva a la más vieja.
 *
 * ⚠️ **Se filtra por la inscripción del participante y no por el alumno**, y es
 * la misma condición que exige el backend: una clase es de este curso sólo si ese
 * alumno la cursó *con esta inscripción*. Filtrar por alumno ofrecería sus clases
 * de DJ cuando el material es de producción — que es exactamente la mezcla que
 * `V22` acaba de eliminar del otro lado.
 */
function clasesDe(clases: ReservaResumen[], idInscripcion: string): ReservaResumen[] {
  if (idInscripcion === '') return []

  return clases
    .filter((r) => r.participantes.some((p) => p.idInscripcion === Number(idInscripcion)))
    .sort((a, b) => (b.fecha + b.horaInicio).localeCompare(a.fecha + a.horaInicio))
}
