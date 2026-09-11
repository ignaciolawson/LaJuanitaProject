import { useCallback, useEffect, useState } from 'react'

import { editarPrograma, listarProgramas } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { Cobro, EdicionPrograma, Moneda, ProgramaResumen } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { Campo, CampoSelect } from '../componentes/Campo'
import { importe } from '../componentes/dinero'
import { Etiqueta } from '../componentes/Etiqueta'
import { NOMBRE_DE_DISCIPLINA } from '../componentes/presentacion'
import { AvisoSoloLectura, usePuedeEscribir } from '../componentes/SoloLectura'
import { Tabla, Celda } from '../componentes/Tabla'

/**
 * El catálogo de programas (`V28`, `mejoras.md` §16 · C1, P63 — cierra P13).
 *
 * **Tres filas y ningún alta.** Una fila por disciplina, y las disciplinas son
 * un CHECK de la base: sumar una es una migración, y la fila del catálogo va
 * en ella. Lo que esta pantalla hace es lo que P63 pidió textual — *"intentemos
 * que sea todo modificable"*: el precio, la moneda, cómo se cobra, cuántas
 * clases trae y si se ofrece hoy.
 *
 * **Lo que se edita acá NO cambia las inscripciones que ya existen.** El
 * catálogo dice cuánto sale hoy; cada inscripción guarda cuánto se acordó ese
 * día (`precio_total`). Si el precio de DJ sube en marzo, el alumno de febrero
 * sigue debiendo lo de febrero. Es el mismo criterio por el que la historia de
 * la plata no se reescribe.
 *
 * **"A confirmar" es un dato, no un hueco.** La mentoría nace sin precio (P63:
 * el negocio no lo tiene todavía); el alta de inscripción no prellena nada y
 * quien inscribe lo tipea. Cero sería otra cosa: una beca.
 *
 * **No hay baja**: un programa se desactiva, y el alta deja de ofrecerlo. La
 * base rechaza el DELETE por su cuenta (`V28` §3).
 */
export function ProgramasPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [programas, setProgramas] = useState<ProgramaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()
  const [editando, setEditando] = useState<ProgramaResumen | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setProgramas(await listarProgramas())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.')
    } finally {
      setCargando(false)
    }
  }, [setError])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <div>
      <CabeceraDePagina
        titulo="Programas"
        aclaracion="Lo que se vende, a cuánto y cuántas clases trae. Cada inscripción copia el precio del día y guarda el suyo."
      />

      <AvisoSoloLectura />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {editando && puedeEscribir && (
        <Formulario
          programa={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      )}

      <Tabla
        columnas={[
          'Programa',
          'Se cobra',
          { etiqueta: 'Precio', alineacion: 'derecha' },
          { etiqueta: 'Clases', alineacion: 'derecha' },
          'Cada clase',
          'Estado',
          ...(puedeEscribir ? [''] : []),
        ]}
      >
        {cargando && programas.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-4 py-10 text-center text-sm text-apagado">
              Cargando…
            </td>
          </tr>
        ) : (
          programas.map((p) => (
            <tr key={p.idPrograma} className={p.activo ? '' : 'text-apagado'}>
              <Celda>
                <div className="font-medium">{p.nombre}</div>
                <div className="text-xs text-tenue">{NOMBRE_DE_DISCIPLINA[p.disciplina]}</div>
              </Celda>
              <Celda>{NOMBRE_DE_COBRO[p.cobro]}</Celda>
              <Celda numerica>
                {p.precio === null ? (
                  // "A confirmar" es un dato: el negocio no lo decidió todavía.
                  // Un cero acá sería una beca.
                  <span className="t-cifra text-apagado">A confirmar</span>
                ) : (
                  importe(p.precio, p.moneda)
                )}
              </Celda>
              <Celda numerica>
                {p.clasesEstandar === null ? (
                  <span className="text-apagado">a medida</span>
                ) : (
                  p.clasesEstandar
                )}
              </Celda>
              <Celda>{duracion(p.duracionMinutos)}</Celda>
              <Celda>
                {p.activo ? (
                  <Etiqueta>Se ofrece</Etiqueta>
                ) : (
                  <Etiqueta tono="apagada">Desactivado</Etiqueta>
                )}
              </Celda>
              {puedeEscribir && (
                <Celda className="text-right">
                  <Boton variante="enlace" type="button" onClick={() => setEditando(p)}>
                    Editar
                  </Boton>
                </Celda>
              )}
            </tr>
          ))
        )}
      </Tabla>
    </div>
  )
}

const NOMBRE_DE_COBRO: Record<Cobro, string> = {
  PAQUETE: 'Por paquete',
  SESION: 'Por sesión',
}

/** `90` → `1:30`. */
function duracion(minutos: number): string {
  return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`
}

/**
 * Editar una fila. La disciplina no se toca: es la identidad de la fila y la
 * unión con las inscripciones.
 *
 * El precio vacío se manda como `null` a propósito —"todavía no hay"—, y por
 * eso es un PUT con la fila entera y no un PATCH: borrar el precio tiene que
 * poder decirse.
 */
function Formulario({
  programa,
  onCerrar,
  onGuardado,
}: {
  programa: ProgramaResumen
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombre, setNombre] = useState(programa.nombre)
  const [descripcion, setDescripcion] = useState(programa.descripcion ?? '')
  const [precio, setPrecio] = useState(programa.precio === null ? '' : String(programa.precio))
  const [moneda, setMoneda] = useState<Moneda>(programa.moneda)
  const [cobro, setCobro] = useState<Cobro>(programa.cobro)
  const [clasesEstandar, setClasesEstandar] = useState(
    programa.clasesEstandar === null ? '' : String(programa.clasesEstandar),
  )
  const [duracionMinutos, setDuracionMinutos] = useState(String(programa.duracionMinutos))
  const [activo, setActivo] = useState(programa.activo)
  const [error, setError] = useErrorPasajero()
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setErrores({})

    // Un paquete sin cantidad de clases no es un precio (`V28` §2). El backend
    // lo rechaza igual; acá se dice antes, sobre el campo.
    if (cobro === 'PAQUETE' && clasesEstandar === '') {
      setErrores({ clasesEstandar: 'Un programa por paquete tiene que decir de cuántas clases es.' })
      setGuardando(false)
      return
    }

    const datos: EdicionPrograma = {
      nombre,
      descripcion: descripcion || null,
      precio: precio === '' ? null : Number(precio),
      moneda,
      cobro,
      clasesEstandar: clasesEstandar === '' ? null : Number(clasesEstandar),
      duracionMinutos: Number(duracionMinutos),
      activo,
    }

    try {
      await editarPrograma(programa.idPrograma, datos)
      onGuardado()
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        if (e.errores) setErrores(e.errores)
      } else {
        setError('No se pudo guardar.')
      }
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void guardar(e)}
      className="mb-4 space-y-4 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5"
    >
      <h3 className="font-medium">
        Editar {programa.nombre}{' '}
        <span className="text-sm font-normal text-tenue">· {NOMBRE_DE_DISCIPLINA[programa.disciplina]}</span>
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
          required
        />
        <Campo
          etiqueta="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <CampoSelect
          etiqueta="Se cobra"
          value={cobro}
          onChange={(e) => setCobro(e.target.value as Cobro)}
          error={errores.cobro}
        >
          <option value="PAQUETE">Por paquete (el precio es del curso entero)</option>
          <option value="SESION">Por sesión (el total es sesiones × precio)</option>
        </CampoSelect>
        <Campo
          etiqueta={cobro === 'SESION' ? 'Precio por sesión' : 'Precio del paquete'}
          type="number"
          min="0"
          step="0.01"
          value={precio}
          onChange={(e) => setPrecio(e.target.value)}
          error={errores.precio}
          ayuda="Vacío = a confirmar. Las inscripciones ya cargadas no cambian."
        />
        <CampoSelect
          etiqueta="Moneda"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value as Moneda)}
        >
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </CampoSelect>
        <Campo
          etiqueta="Clases estándar"
          type="number"
          min="1"
          value={clasesEstandar}
          onChange={(e) => setClasesEstandar(e.target.value)}
          error={errores.clasesEstandar}
          ayuda={
            cobro === 'SESION'
              ? 'Opcional: vacío quiere decir que se arma a medida.'
              : 'Cuántas clases trae el paquete. Quien inscribe lo puede cambiar.'
          }
        />
        <Campo
          etiqueta="Minutos por clase"
          type="number"
          min="1"
          value={duracionMinutos}
          onChange={(e) => setDuracionMinutos(e.target.value)}
          error={errores.duracionMinutos}
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          Se ofrece hoy
          <span className="block text-xs text-tenue">
            Desactivado, el alta de inscripción deja de ofrecerlo. Las inscripciones que ya
            existen siguen igual.
          </span>
        </span>
      </label>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <Boton variante="secundario" type="button" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
