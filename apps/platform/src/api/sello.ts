import { cabeceraDeCredencial, pedir } from './cliente'
import type { Pagina } from './tiposAdmin'
import type {
  AltaAparicion,
  AltaArtista,
  AltaRelease,
  AparicionResumen,
  ArtistaResumen,
  ContratoResumen,
  EdicionRelease,
  EstadoRelease,
  ReleaseResumen,
} from './tiposSello'

/**
 * Los pedidos del Módulo 7 — el sello discográfico.
 *
 * **Un solo lado.** A diferencia de Mix & Mastering y del portal, acá no hay
 * `/api/me/...`: los artistas no entran al sistema (P24), así que todo es
 * administración. Eso hizo al módulo la mitad de grande.
 *
 * **Publicar es su propia operación y no un valor de `cambiarEstadoDelRelease`.**
 * Es la misma decisión que en M&M —cargar el link del premaster no es entregarlo—
 * y acá pesa más: publicar es lo único que la regla dura puede rechazar.
 */

// == Artistas ================================================================

export function listarArtistas(buscar?: string) {
  const query = buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''
  return pedir<ArtistaResumen[]>(`/api/artistas${query}`)
}

export function registrarArtista(datos: AltaArtista) {
  return pedir<ArtistaResumen>('/api/artistas', { metodo: 'POST', cuerpo: datos })
}

export function editarArtista(id: number, datos: AltaArtista) {
  return pedir<ArtistaResumen>(`/api/artistas/${id}`, { metodo: 'PUT', cuerpo: datos })
}

export function contratosDelArtista(id: number) {
  return pedir<ContratoResumen[]>(`/api/artistas/${id}/contratos`)
}

// == Releases ================================================================

export function listarReleases(opciones: {
  buscar?: string
  estado?: EstadoRelease
  pagina?: number
}) {
  const partes = Object.entries(opciones)
    .filter(([, valor]) => valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)

  return pedir<Pagina<ReleaseResumen>>(
    `/api/releases${partes.length > 0 ? `?${partes.join('&')}` : ''}`,
  )
}

export function obtenerRelease(id: number) {
  return pedir<ReleaseResumen>(`/api/releases/${id}`)
}

export function registrarRelease(datos: AltaRelease) {
  return pedir<ReleaseResumen>('/api/releases', { metodo: 'POST', cuerpo: datos })
}

/** El expediente. No el estado, no el código: los dos tienen su razón aparte. */
export function editarRelease(id: number, datos: EdicionRelease) {
  return pedir<ReleaseResumen>(`/api/releases/${id}`, { metodo: 'PUT', cuerpo: datos })
}

/**
 * Mueve el estado. **No acepta `PUBLICADO`** — el backend lo rechaza con 400 y su
 * explicación, para que la regla dura no se cruce eligiendo una opción de una
 * lista.
 *
 * Solo avanza, y de `CANCELADO` no se vuelve: las dos las sostiene un trigger, y
 * un intento vuelve como 409 con su texto.
 */
export function cambiarEstadoDelRelease(id: number, estado: EstadoRelease) {
  return pedir<ReleaseResumen>(`/api/releases/${id}/estado?estado=${estado}`, { metodo: 'PATCH' })
}

/**
 * Publica. **Es la regla del módulo.**
 *
 * Sin `motivo` y sin contrato adjunto, el backend rechaza con 409 y su explicación
 * — que es la que la pantalla muestra. Con `motivo`, publica igual y queda firmado
 * quién lo hizo y por qué.
 *
 * **El orden importa y es el diseño**: primero se ve la regla, después aparece la
 * salida. Un checkbox "publicar sin contrato" a mano desde el principio la
 * convertiría en una sugerencia.
 */
export function publicarRelease(id: number, motivo?: string) {
  return pedir<ReleaseResumen>(`/api/releases/${id}/publicacion`, {
    metodo: 'PATCH',
    cuerpo: { motivo },
  })
}

export function contratosDelRelease(id: number) {
  return pedir<ContratoResumen[]>(`/api/releases/${id}/contratos`)
}

// == Contratos ===============================================================

/**
 * Sube el PDF.
 *
 * **`idRelease` en blanco = contrato general del artista**, que respalda todos sus
 * lanzamientos. No es un caso raro: es la mitad no obvia de la regla dura, y es lo
 * que `V1` modela desde el primer día.
 *
 * Los datos van por query string porque el cuerpo lo ocupa el archivo. El sistema
 * mira el **contenido** y no la extensión: un ejecutable renombrado a `.pdf` vuelve
 * como 400 con esa explicación.
 */
export function cargarContrato(datos: {
  idArtista: number
  idRelease?: number
  archivo: File
  fechaFirma?: string
  observaciones?: string
}) {
  const partes = [`idArtista=${datos.idArtista}`]
  if (datos.idRelease !== undefined) partes.push(`idRelease=${datos.idRelease}`)
  if (datos.fechaFirma) partes.push(`fechaFirma=${datos.fechaFirma}`)
  if (datos.observaciones) {
    partes.push(`observaciones=${encodeURIComponent(datos.observaciones)}`)
  }

  return pedir<ContratoResumen>(`/api/contratos?${partes.join('&')}`, {
    metodo: 'POST',
    archivo: datos.archivo,
  })
}

/**
 * A dónde apunta el link para ver un contrato.
 *
 * **No es una URL del archivo: es un endpoint que verifica quién pregunta.** Por
 * eso se abre con un `fetch` autenticado y no con un `<a href>` — el navegador no
 * manda la credencial en una navegación común, y sin ella el backend contesta 401.
 * Ver `abrirContrato`.
 */
export function rutaDelContrato(id: number) {
  return `/api/contratos/${id}/archivo`
}

/**
 * Abre el PDF en una pestaña.
 *
 * Lo baja con credencial, arma un blob y lo abre. Es más vueltas que un link, y es
 * lo que hay que hacer: un contrato tiene datos de un tercero, así que no puede
 * estar en una ruta pública, y una ruta autenticada no se puede poner en un `href`
 * porque el navegador no le agrega el `Authorization`.
 *
 * La URL del blob se revoca después de un rato: revocarla en el acto le corta la
 * carga a la pestaña que se está abriendo.
 */
export async function abrirContrato(id: number): Promise<void> {
  const respuesta = await fetch(rutaDelContrato(id), {
    headers: cabeceraDeCredencial(),
  })
  if (!respuesta.ok) throw new Error('No se pudo abrir el contrato.')

  const url = URL.createObjectURL(await respuesta.blob())
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}


export function borrarContrato(id: number) {
  return pedir<void>(`/api/contratos/${id}`, { metodo: 'DELETE' })
}

// == Dónde sonó ==============================================================

export function aparicionesDelRelease(id: number) {
  return pedir<AparicionResumen[]>(`/api/releases/${id}/apariciones`)
}

export function anotarAparicion(idRelease: number, datos: AltaAparicion) {
  return pedir<AparicionResumen>(`/api/releases/${idRelease}/apariciones`, {
    metodo: 'POST',
    cuerpo: datos,
  })
}

export function borrarAparicion(idAparicion: number) {
  return pedir<void>(`/api/releases/apariciones/${idAparicion}`, { metodo: 'DELETE' })
}
