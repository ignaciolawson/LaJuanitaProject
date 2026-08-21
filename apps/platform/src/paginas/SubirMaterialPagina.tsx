import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { cambiarVisibilidad, misAlumnos, misMaterialesSubidos, subirMaterial } from '../api/docencia'
import type { AlumnoDelProfesor, MaterialResumen } from '../api/tiposDocencia'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { cuando } from '../componentes/presentacion'

/**
 * Módulo 5, pantalla 4 — subir material.
 *
 * **Hoy el material es un link y no un archivo**, y no es un campo que falte: el
 * `StorageService` de §2.4 todavía no existe. La tabla acepta las dos formas
 * desde `V1`, así que el módulo entra entero sin arrastrar la infraestructura de
 * archivos — que el Módulo 6 va a tener que construir igual para retener el
 * premaster. Cuando esté, esta pantalla gana una alternativa, no cambia.
 *
 * ⚠️ **Un solo control de destinatario, y es la decisión de forma del módulo.**
 * "¿Para quién? → todos / un alumno" es un `select`, no un checkbox más un
 * buscador: mandar los dos campos por separado permite armar un pedido
 * contradictorio —para todos Y para Juan— que la base rechaza y que el
 * formulario no debería haber dejado escribir.
 *
 * **Se ve todo lo subido, publicado o no.** Es la diferencia con la pantalla del
 * alumno: el profesor necesita ver qué tiene preparado, y el interruptor es la
 * regla dura *"el alumno lo ve solo si el profesor lo habilitó"*.
 */
export function SubirMaterialPagina() {
  const [alumnos, setAlumnos] = useState<AlumnoDelProfesor[]>([])
  const [materiales, setMateriales] = useState<MaterialResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [mios, subidos] = await Promise.all([misAlumnos(), misMaterialesSubidos()])
      setAlumnos(mios)
      setMateriales(subidos)
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
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Subir material</h2>
        <p className="mt-1 text-sm text-tenue">
          Un link con un título: un pack de samples, un proyecto, un video. Podés
          dejarlo sin publicar y habilitarlo después.
        </p>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <Formulario
        alumnos={alumnos}
        alSubir={(nuevo) => setMateriales([nuevo, ...materiales])}
      />

      <h3 className="mt-8 mb-3 font-semibold">Lo que subiste</h3>

      {cargando && <p className="text-sm text-tenue">Cargando…</p>}

      {!cargando && materiales.length === 0 && (
        <p className="rounded-lg border border-linea bg-white px-5 py-8 text-center text-sm text-tenue">
          Todavía no subiste nada.
        </p>
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
  alSubir,
}: {
  alumnos: AlumnoDelProfesor[]
  alSubir: (material: MaterialResumen) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('')
  const [urlExterna, setUrlExterna] = useState('')
  const [destinatario, setDestinatario] = useState('')
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
        // Vacío es grupal: esa traducción la hace el backend, y por eso el
        // formulario tiene un solo control.
        idAlumno: destinatario === '' ? undefined : Number(destinatario),
        titulo: titulo.trim(),
        tipo: tipo.trim() === '' ? undefined : tipo.trim(),
        urlExterna: urlExterna.trim(),
        visibleAlumno: publicar,
      })
      alSubir(nuevo)
      setTitulo('')
      setTipo('')
      setUrlExterna('')
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
    <form onSubmit={enviar} className="rounded-lg border border-linea bg-white p-5">
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

        <CampoSelect
          etiqueta="¿Para quién?"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          className="sm:col-span-2"
        >
          <option value="">Todos mis alumnos</option>
          {alumnos.map((a) => (
            <option key={a.idAlumno} value={a.idAlumno}>
              {a.nombre} {a.apellido}
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
    <li className="rounded-md border border-linea bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-40 grow">
          <div className="text-sm font-medium">{material.titulo}</div>
          <div className="text-xs text-tenue">
            {material.esGrupal ? 'Para todos' : `Para ${material.alumno ?? 'un alumno'}`}
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
