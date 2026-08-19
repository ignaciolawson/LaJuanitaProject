import { pedir } from './cliente'
import type { ReservaResumen } from './tiposAdmin'
import type {
  AltaMaterial,
  AltaNota,
  AlumnoDelProfesor,
  ClasesDictadas,
  FijarSeguimiento,
  MaterialResumen,
  NotaResumen,
  SeguimientoResumen,
} from './tiposDocencia'

/**
 * Los pedidos del portal del profesor (Módulo 5).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ ESCRITO ANTES QUE SUS PANTALLAS. Ver la cabecera de `tiposDocencia.ts`.
 *
 * **Todo cuelga de `/api/me/profesor/**`, y ese tramo es la decisión de diseño
 * del módulo**: una misma persona puede ser alumna Y profesora —Ghezz da clases
 * y también alquila cabina—, así que `/api/me/materiales` sería ambiguo: ¿los
 * que subí o los que me dieron? El tramo dice **desde qué relación estoy
 * mirando**. Lo que uno recibe COMO ALUMNO está en `portal.ts`.
 *
 * Ninguna función recibe un id de persona: el backend saca la identidad del
 * token. Las que sí llevan un id —`idAlumno`, `idNota`— llevan el del objeto, y
 * el backend verifica que sea mío antes de tocarlo.
 * ─────────────────────────────────────────────────────────────────────────
 */

// == Mi agenda ==============================================================

/**
 * Las clases que doy en el rango, con sus participantes.
 *
 * Devuelve el mismo `ReservaResumen` que el calendario de administración, y acá
 * está bien que traiga los alumnos: son los míos.
 *
 * **El profesor NO modifica reservas** (regla dura de §8): no existe ningún
 * endpoint para eso en este módulo, y no hay que agregarlo — mover una clase es
 * de administración porque arrastra la seña.
 */
export function miAgenda(desde: string, hasta: string): Promise<ReservaResumen[]> {
  return pedir(`/api/me/profesor/agenda?desde=${desde}&hasta=${hasta}`)
}

/** Cuántas clases di. Cuenta, no liquida: P20 sigue abierta. */
export function misClasesDictadas(desde: string, hasta: string): Promise<ClasesDictadas> {
  return pedir(`/api/me/profesor/clases?desde=${desde}&hasta=${hasta}`)
}

// == Mis alumnos ============================================================

export function misAlumnos(): Promise<AlumnoDelProfesor[]> {
  return pedir('/api/me/profesor/alumnos')
}

/**
 * Poner o mover el semáforo de un alumno.
 *
 * Es un PUT porque hay **uno solo por par profesor-alumno**: ponerlo y moverlo
 * son el mismo gesto, así que la pantalla no necesita distinguir "crear" de
 * "editar".
 */
export function fijarSeguimiento(
  idAlumno: number,
  datos: FijarSeguimiento,
): Promise<SeguimientoResumen> {
  return pedir(`/api/me/profesor/alumnos/${idAlumno}/seguimiento`, {
    metodo: 'PUT',
    cuerpo: datos,
  })
}

// == Notas privadas =========================================================

/** Las que YO escribí sobre ese alumno. Nunca las de otro profesor. */
export function misNotas(idAlumno: number): Promise<NotaResumen[]> {
  return pedir(`/api/me/profesor/alumnos/${idAlumno}/notas`)
}

export function anotar(datos: AltaNota): Promise<NotaResumen> {
  return pedir('/api/me/profesor/notas', { metodo: 'POST', cuerpo: datos })
}

/**
 * Corregir una nota propia. La de otro contesta 404, no 403 — confirmar que
 * existe una nota ajena sobre un alumno ya diría algo.
 *
 * Solo viaja el texto: sobre qué alumno es la nota ya lo sabe el servidor.
 */
export function corregirNota(idNota: number, contenido: string): Promise<NotaResumen> {
  return pedir(`/api/me/profesor/notas/${idNota}`, { metodo: 'PUT', cuerpo: { contenido } })
}

// == Material ===============================================================

/** Lo que subí. Con `idAlumno`, lo de ese alumno. Incluye lo no publicado. */
export function misMaterialesSubidos(idAlumno?: number): Promise<MaterialResumen[]> {
  const filtro = idAlumno === undefined ? '' : `?idAlumno=${idAlumno}`
  return pedir(`/api/me/profesor/materiales${filtro}`)
}

/** Sin `idAlumno` queda grupal. Ver `AltaMaterial`. */
export function subirMaterial(datos: AltaMaterial): Promise<MaterialResumen> {
  return pedir('/api/me/profesor/materiales', { metodo: 'POST', cuerpo: datos })
}

/** Publicar o esconder. Es la regla dura "solo si el profesor lo habilitó". */
export function cambiarVisibilidad(
  idMaterial: number,
  visible: boolean,
): Promise<MaterialResumen> {
  return pedir(`/api/me/profesor/materiales/${idMaterial}/visibilidad?visible=${visible}`, {
    metodo: 'PATCH',
  })
}
