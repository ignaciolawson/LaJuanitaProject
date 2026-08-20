/**
 * Contratos del Módulo 7 — el sello discográfico.
 *
 * **La regla dura de este módulo es una sola y casi todo lo de acá existe para
 * sostenerla:** *no se publica un release sin contrato adjunto*. Hasta `V18` no
 * estaba en ninguna capa —ni base, ni backend, ni pantalla— y por eso nada podía
 * fallar: apareció releyendo el alcance contra lo construido.
 *
 * **Este módulo no tiene tipos de portal, y no es un olvido:** los artistas no
 * entran al sistema (P24), así que no hay una segunda lectura de la que haya que
 * esconder nada. Es la diferencia con Mix & Mastering, que tiene `TrabajoDelPortal`
 * justamente porque del otro lado hay alguien mirando.
 */

/** Espeja `release_tipo_valido`. Puede no saberse al abrir la ficha. */
export type TipoRelease = 'SINGLE' | 'EP' | 'REMIX' | 'ALBUM'

export const NOMBRE_DE_TIPO_RELEASE: Record<TipoRelease, string> = {
  SINGLE: 'Single',
  EP: 'EP',
  REMIX: 'Remix',
  ALBUM: 'Álbum',
}

/**
 * El estado de un release.
 *
 * ⚠️ **Solo avanzan, y de `CANCELADO` no se vuelve.** Las dos mitades las sostiene
 * un trigger (`V1` §8.5 + `V18` §1b), no la pantalla. La segunda no existía: al
 * dejar `CANCELADO` fuera de la escalera, salir de él nunca se veía como un
 * retroceso, y con el sello eso habilitaba cancelar para escaparse de la protección
 * del contrato, sacarlo, y volver a subir.
 *
 * `PUBLICADO` **no se elige desde el desplegable de estados**: tiene su propia
 * acción, porque tiene su propia regla. Ver `publicarRelease`.
 */
export type EstadoRelease =
  | 'A_CONFIRMAR'
  | 'CONFIRMADO'
  | 'EN_DISTRIBUCION'
  | 'PUBLICADO'
  | 'CANCELADO'

export const NOMBRE_DE_ESTADO_RELEASE: Record<EstadoRelease, string> = {
  A_CONFIRMAR: 'A confirmar',
  CONFIRMADO: 'Confirmado',
  EN_DISTRIBUCION: 'En distribución',
  PUBLICADO: 'Publicado',
  CANCELADO: 'Cancelado',
}

/**
 * Los estados que la pantalla ofrece mover a mano.
 *
 * `PUBLICADO` queda afuera porque es un acto con regla propia, y `CANCELADO`
 * también — cancelar no se vuelve atrás, así que va con su propia confirmación en
 * vez de ser una opción más de una lista de la que uno se arrepiente.
 */
export const ESTADOS_QUE_SE_MUEVEN_A_MANO: EstadoRelease[] = [
  'A_CONFIRMAR',
  'CONFIRMADO',
  'EN_DISTRIBUCION',
]

/**
 * Dónde sonó (P25).
 *
 * El orden por "popularidad" **no está acá**: vive en `orden_relevancia`, una
 * columna generada de `V18`, y viaja en cada fila ya calculado. Si la jerarquía
 * viviera en este archivo, el tablero del Módulo 8 escribiría la suya.
 */
export type TipoAparicion = 'RADIO' | 'SET' | 'PLAYLIST' | 'OTRO'

export const NOMBRE_DE_TIPO_APARICION: Record<TipoAparicion, string> = {
  RADIO: 'Radio',
  SET: 'Set',
  PLAYLIST: 'Playlist',
  OTRO: 'Otro',
}

/** Espeja `ArtistaResumen`. */
export type ArtistaResumen = {
  idArtista: number
  /** Hoy siempre null: los artistas no entran al sistema. La puerta queda abierta. */
  idUsuario: number | null
  nombreArtistico: string
  nombreReal: string | null
  emailContacto: string | null
  telefono: string | null
  instagram: string | null
  confirmado: boolean
  bio: string | null
  releases: number
  fechaAlta: string
}

/** Espeja `AltaArtistaRequest`. Sirve para el alta y para la edición. */
export type AltaArtista = {
  nombreArtistico: string
  nombreReal?: string
  emailContacto?: string
  telefono?: string
  instagram?: string
  confirmado?: boolean
  bio?: string
}

/**
 * Espeja `ReleaseResumen`.
 *
 * **No trae `portadaPath` y trae `tienePortada` en su lugar.** La clave del
 * almacenamiento es de la base: publicarla invita a armar URLs a mano, que es
 * exactamente lo que el backend no ofrece. Mismo criterio con el que
 * `TrabajoDelPortal` esconde el premaster en el mapeo y no en la pantalla.
 *
 * `tieneContrato` es la misma pregunta que decide la regla dura, contestada para
 * que la pantalla pueda avisar **antes** de que alguien apriete publicar.
 */
export type ReleaseResumen = {
  idRelease: number
  codigoRelease: string
  idArtista: number
  artista: string
  nombreRelease: string
  tipoRelease: TipoRelease | null
  genero: string | null
  tienePortada: boolean
  fechaEstimada: string | null
  fechaReal: string | null
  estado: EstadoRelease
  sistemaPromo: boolean
  notas: string | null
  contratos: number
  tieneContrato: boolean
  publicadoSinContrato: boolean
  motivoPublicacion: string | null
  publicadoPor: string | null
  fechaCreacion: string
}

/**
 * Espeja `AltaReleaseRequest`.
 *
 * `codigoRelease` es opcional a propósito: si no va, lo genera el sistema por
 * encima del más alto que exista. Se escribe a mano **solo para cargar los
 * lanzamientos viejos**, que tienen el número que tuvieron.
 *
 * No hay `estado`: publicar es un acto con su propia regla y no un valor de un
 * desplegable en el alta.
 */
export type AltaRelease = {
  idArtista: number
  nombreRelease: string
  codigoRelease?: string
  tipoRelease?: TipoRelease | null
  genero?: string
  fechaEstimada?: string | null
  fechaReal?: string | null
  notas?: string
}

/** Espeja `EdicionReleaseRequest`. Sin estado y sin código: ver `AltaRelease`. */
export type EdicionRelease = {
  nombreRelease: string
  tipoRelease?: TipoRelease | null
  genero?: string
  fechaEstimada?: string | null
  fechaReal?: string | null
  sistemaPromo?: boolean
  notas?: string
}

/**
 * Espeja `ContratoResumen`.
 *
 * **No trae `archivoPath`.** El PDF se pide por su endpoint, que verifica quién
 * pregunta antes de abrir nada — un contrato tiene datos de un tercero.
 *
 * `general` es la distinción que hace no obvia a la regla dura: un contrato sin
 * release cubre al artista entero y respalda a todos sus lanzamientos.
 */
export type ContratoResumen = {
  idContrato: number
  idArtista: number
  artista: string
  idRelease: number | null
  codigoRelease: string | null
  general: boolean
  fechaFirma: string | null
  observaciones: string | null
  fechaCarga: string
}

/** Espeja `AparicionResumen`. */
export type AparicionResumen = {
  idAparicion: number
  idRelease: number
  tipoAparicion: TipoAparicion
  donde: string
  quien: string | null
  fecha: string | null
  url: string | null
  ordenRelevancia: number | null
  notas: string | null
}

/** Espeja `AltaAparicionRequest`. */
export type AltaAparicion = {
  tipoAparicion: TipoAparicion
  donde: string
  quien?: string
  fecha?: string | null
  url?: string
  notas?: string
}
