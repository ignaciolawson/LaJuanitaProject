import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import {
  abrirContrato,
  anotarAparicion,
  aparicionesDelRelease,
  borrarAparicion,
  borrarContrato,
  cambiarEstadoDelRelease,
  cargarContrato,
  contratosDelRelease,
  listarArtistas,
  listarReleases,
  publicarRelease,
  registrarRelease,
} from '../api/sello'
import {
  ESTADOS_QUE_SE_MUEVEN_A_MANO,
  NOMBRE_DE_ESTADO_RELEASE,
  NOMBRE_DE_TIPO_APARICION,
  NOMBRE_DE_TIPO_RELEASE,
  type AparicionResumen,
  type ArtistaResumen,
  type ContratoResumen,
  type EstadoRelease,
  type ReleaseResumen,
  type TipoAparicion,
  type TipoRelease,
} from '../api/tiposSello'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { Etiqueta } from '../componentes/Etiqueta'
import { usePuedeEscribir } from '../componentes/SoloLectura'

const TIPOS: TipoRelease[] = ['SINGLE', 'EP', 'REMIX', 'ALBUM']
const ESTADOS: EstadoRelease[] = [
  'A_CONFIRMAR',
  'CONFIRMADO',
  'EN_DISTRIBUCION',
  'PUBLICADO',
  'CANCELADO',
]
const TIPOS_DE_APARICION: TipoAparicion[] = ['RADIO', 'SET', 'PLAYLIST', 'OTRO']

/**
 * Módulo 7 — el catálogo del sello.
 *
 * **La regla dura tiene una sola forma en pantalla, y el orden es la decisión.**
 * Se aprieta *Publicar*; si no hay contrato adjunto el backend rechaza y acá se
 * muestran **sus palabras**; recién debajo aparece *"Publicarlo igual, con
 * motivo"*, que cuesta escribir una frase y queda firmada. Al revés —un checkbox
 * "publicar sin contrato" siempre a mano— la regla sería una sugerencia. Es
 * exactamente la forma que ya tomó el premaster del Módulo 6.
 *
 * **Y un aviso que no bloquea:** un release sin ningún contrato se marca en la
 * fila, antes de que nadie intente publicarlo. Enterarse al apretar el botón es
 * enterarse tarde — el PDF hay que ir a buscarlo.
 *
 * **No hay portal de artistas y no es un olvido** (P24): los artistas no entran al
 * sistema. Esta pantalla es todo el módulo del lado de quien mira.
 */
export function SelloPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [releases, setReleases] = useState<ReleaseResumen[]>([])
  const [artistas, setArtistas] = useState<ArtistaResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoRelease | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarReleases({
        buscar,
        estado: estado === '' ? undefined : estado,
        pagina,
      })
      setReleases(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, pagina])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  // Los artistas alimentan el selector del alta. Se piden una sola vez: la lista
  // no pagina porque la acota con cuánta gente firmó el sello, no cuánto crece el
  // negocio.
  useEffect(() => {
    listarArtistas()
      .then(setArtistas)
      .catch(() => setArtistas([]))
  }, [])

  function reemplazar(release: ReleaseResumen) {
    setReleases((previos) =>
      previos.map((r) => (r.idRelease === release.idRelease ? release : r)),
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Sello</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'release' : 'releases'}`}
          </p>
        </div>
        {puedeEscribir && (
          <Boton onClick={() => setMostrandoAlta(true)} disabled={artistas.length === 0}>
            Nuevo release
          </Boton>
        )}
      </div>

      {/* Un release cuelga de un artista: sin ninguno cargado, el alta no tiene
          de dónde elegir. Se dice acá en vez de ofrecer un formulario que no se
          puede completar. */}
      {puedeEscribir && artistas.length === 0 && !cargando && (
        <div className="mb-4">
          <Aviso>
            Todavía no hay artistas cargados, y un release cuelga de uno. Cargalos
            primero desde <strong>Artistas</strong>.
          </Aviso>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value)
            setPagina(0)
          }}
          placeholder="Buscar por código, nombre o artista…"
          className="min-w-60 grow rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        />
        <select
          aria-label="Estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoRelease | '')
            setPagina(0)
          }}
          className="rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO_RELEASE[e]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && puedeEscribir && (
        <FormularioAlta
          artistas={artistas}
          onCerrar={() => setMostrandoAlta(false)}
          onGuardado={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {!cargando && releases.length === 0 && (
        <p className="rounded-lg border border-linea bg-superficie px-5 py-8 text-center text-sm text-tenue">
          No hay releases cargados.
        </p>
      )}

      <div className="space-y-3">
        {releases.map((r) => (
          <article key={r.idRelease} className="rounded-lg border border-linea bg-superficie">
            <button
              type="button"
              onClick={() => setAbierto(abierto === r.idRelease ? null : r.idRelease)}
              className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left"
            >
              <div className="w-20 shrink-0 font-mono text-xs text-tenue">{r.codigoRelease}</div>

              <div className="min-w-48 grow">
                <div className="font-medium">{r.nombreRelease}</div>
                <div className="text-xs text-tenue">
                  {r.artista}
                  {r.tipoRelease && ` · ${NOMBRE_DE_TIPO_RELEASE[r.tipoRelease]}`}
                  {r.genero && ` · ${r.genero}`}
                </div>
              </div>

              <EtiquetaEstado estado={r.estado} />

              <div className="w-28 shrink-0 text-xs">
                {r.fechaEstimada ? (
                  <>
                    <div className="text-tenue">{r.estado === 'PUBLICADO' ? 'Salió' : 'Sale'}</div>
                    <div className="tabular-nums">{r.fechaReal ?? r.fechaEstimada}</div>
                  </>
                ) : (
                  <span className="text-apagado">Sin fecha</span>
                )}
              </div>

              <div className="w-32 shrink-0 text-right text-xs">
                <EstadoDelContrato release={r} />
              </div>
            </button>

            {abierto === r.idRelease && (
              <Detalle
                release={r}
                puedeEscribir={puedeEscribir}
                onActualizado={reemplazar}
                onError={setError}
              />
            )}
          </article>
        ))}
      </div>

      <Paginado
        pagina={pagina}
        totalPaginas={totalPaginas}
        totalElementos={total}
        onCambiar={setPagina}
      />
    </div>
  )
}

/**
 * El aviso del contrato, que se ve **antes** de intentar publicar.
 *
 * Un release publicado con la excepción se marca aparte y no se mezcla con "tiene
 * contrato": son dos situaciones distintas y la segunda es la que alguien va a
 * querer encontrar después.
 */
function EstadoDelContrato({ release }: { release: ReleaseResumen }) {
  if (release.publicadoSinContrato) {
    return <span className="font-medium text-acento">Publicado sin contrato</span>
  }
  if (release.contratos > 0) {
    return (
      <span className="text-tenue">
        {release.contratos === 1 ? '1 contrato' : `${release.contratos} contratos`}
      </span>
    )
  }
  return <span className="text-acento">Sin contrato</span>
}

/**
 * El estado de un release, con los tres tonos del sistema.
 *
 * Antes eran verde / ámbar / gris de Tailwind, y el ámbar caía sobre TRES
 * estados: a confirmar, confirmado y en distribución. Dos de esos no le piden
 * nada a nadie —el release está en camino— así que el color decía "atención"
 * donde no había ninguna. Es lo que `Etiqueta` viene a impedir: si todo estado
 * tiene color, el del que sí pide algo deja de saltar.
 *
 * Sólo `A_CONFIRMAR` pide una acción. El nombre del estado sigue estando
 * escrito, así que no se pierde la diferencia entre confirmado y publicado.
 */
function EtiquetaEstado({ estado }: { estado: EstadoRelease }) {
  const tono =
    estado === 'CANCELADO' ? 'apagada' : estado === 'A_CONFIRMAR' ? 'atencion' : 'neutra'

  return <Etiqueta tono={tono}>{NOMBRE_DE_ESTADO_RELEASE[estado]}</Etiqueta>
}

// == El detalle ==============================================================

function Detalle({
  release,
  puedeEscribir,
  onActualizado,
  onError,
}: {
  release: ReleaseResumen
  puedeEscribir: boolean
  onActualizado: (r: ReleaseResumen) => void
  onError: (mensaje: string | null) => void
}) {
  const [contratos, setContratos] = useState<ContratoResumen[]>([])
  const [apariciones, setApariciones] = useState<AparicionResumen[]>([])

  const recargar = useCallback(() => {
    contratosDelRelease(release.idRelease).then(setContratos).catch(() => setContratos([]))
    aparicionesDelRelease(release.idRelease).then(setApariciones).catch(() => setApariciones([]))
  }, [release.idRelease])

  useEffect(recargar, [recargar])

  return (
    <div className="space-y-6 border-t border-linea px-5 py-5">
      <BloquePublicacion
        release={release}
        puedeEscribir={puedeEscribir}
        onActualizado={onActualizado}
        onError={onError}
      />

      <BloqueContratos
        release={release}
        contratos={contratos}
        puedeEscribir={puedeEscribir}
        onCambio={recargar}
        onError={onError}
      />

      <BloqueApariciones
        release={release}
        apariciones={apariciones}
        puedeEscribir={puedeEscribir}
        onCambio={recargar}
        onError={onError}
      />

      {release.notas && (
        <section>
          <h4 className="t-mono text-tenue">Notas</h4>
          <p className="mt-1.5 whitespace-pre-line text-sm">{release.notas}</p>
        </section>
      )}
    </div>
  )
}

/**
 * Publicar, y el estado.
 *
 * **El botón de publicar está solo hasta que el backend rechaza.** Recién ahí
 * aparece la salida, con su motivo obligatorio. Ese orden es la regla dura en
 * pantalla.
 */
function BloquePublicacion({
  release,
  puedeEscribir,
  onActualizado,
  onError,
}: {
  release: ReleaseResumen
  puedeEscribir: boolean
  onActualizado: (r: ReleaseResumen) => void
  onError: (mensaje: string | null) => void
}) {
  const [rechazo, setRechazo] = useState<string | null>(null)
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  async function publicar(motivo?: string) {
    setRechazo(null)
    onError(null)
    try {
      onActualizado(await publicarRelease(release.idRelease, motivo))
      setPidiendoMotivo(false)
    } catch (e) {
      // El texto sale del trigger de `V18` y explica la salida: se muestra tal
      // cual, acá abajo del botón, y no como un error genérico arriba de todo.
      setRechazo(e instanceof ApiError ? e.message : 'No se pudo publicar.')
    }
  }

  async function mover(nuevo: EstadoRelease) {
    onError(null)
    try {
      onActualizado(await cambiarEstadoDelRelease(release.idRelease, nuevo))
      setConfirmandoCancelar(false)
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo mover el estado.')
    }
  }

  if (release.estado === 'PUBLICADO') {
    return (
      <section className="rounded-md bg-superficie-2 px-4 py-3 text-sm">
        <div className="font-medium">Publicado{release.fechaReal && ` el ${release.fechaReal}`}</div>
        {release.publicadoSinContrato && (
          <p className="mt-1.5 text-xs text-acento">
            Se publicó <strong>sin contrato adjunto</strong>
            {release.publicadoPor && `, por ${release.publicadoPor}`}: “
            {release.motivoPublicacion}”
          </p>
        )}
      </section>
    )
  }

  if (release.estado === 'CANCELADO') {
    return (
      <section className="rounded-md bg-superficie-2 px-4 py-3 text-sm text-tenue">
        Este release está cancelado. <strong>No se puede reabrir</strong>: un
        lanzamiento que se retoma es un release nuevo.
      </section>
    )
  }

  if (!puedeEscribir) return null

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Se llama distinto del filtro de arriba a propósito: los dos decían
            "Estado" y en la misma pantalla eso es un control que filtra y otro
            que modifica con el mismo nombre. Además de confundir a quien lee,
            hacía ambigua la consulta por etiqueta en los tests. */}
        <CampoSelect
          etiqueta="Mover el estado"
          value={release.estado}
          onChange={(e) => void mover(e.target.value as EstadoRelease)}
          className="w-52"
        >
          {ESTADOS_QUE_SE_MUEVEN_A_MANO.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO_RELEASE[e]}
            </option>
          ))}
        </CampoSelect>

        <div className="flex gap-2 self-end">
          <Boton onClick={() => void publicar()}>Publicar</Boton>
          <Boton variante="secundario" onClick={() => setConfirmandoCancelar(true)}>
            Cancelar release
          </Boton>
        </div>
      </div>

      {/* La regla, con las palabras del backend, y la salida SOLO después. */}
      {rechazo && (
        <div className="rounded-md border border-red/30 bg-red/5 px-4 py-3 text-sm">
          <p>{rechazo}</p>
          <Boton variante="secundario" tamaño="chico"
            type="button"
            onClick={() => setPidiendoMotivo(true)} className="mt-2">
            Publicarlo igual, con motivo
          </Boton>
        </div>
      )}

      {pidiendoMotivo && (
        <PedirMotivo
          titulo="Publicar sin contrato adjunto"
          ayuda="Queda registrado con tu nombre y la fecha. Escribí por qué se publica sin el contrato."
          onCerrar={() => setPidiendoMotivo(false)}
          onConfirmar={(motivo) => void publicar(motivo)}
        />
      )}

      {/* Cancelar pide confirmación y NO pide motivo, a diferencia de publicar
          sin contrato. La razón es concreta: `release` no tiene columna para
          guardarlo. Pedir una frase que se tira sería peor que no pedirla — deja
          creyendo que quedó registrada. Si algún día hace falta el motivo, es una
          migración, no un campo más en este formulario. */}
      {confirmandoCancelar && (
        <div className="rounded-md border border-linea bg-superficie-2 px-4 py-3 text-sm">
          <p>
            <strong>Un release cancelado no se puede reabrir.</strong> Si el
            lanzamiento se retoma, va a ser un release nuevo, con otro código.
          </p>
          <div className="mt-3 flex gap-2">
            <Boton onClick={() => void mover('CANCELADO')}>Cancelar el release</Boton>
            <Boton variante="secundario" onClick={() => setConfirmandoCancelar(false)}>
              Volver
            </Boton>
          </div>
        </div>
      )}
    </section>
  )
}

/** Los contratos que respaldan al release: el suyo y los generales de su artista. */
function BloqueContratos({
  release,
  contratos,
  puedeEscribir,
  onCambio,
  onError,
}: {
  release: ReleaseResumen
  contratos: ContratoResumen[]
  puedeEscribir: boolean
  onCambio: () => void
  onError: (mensaje: string | null) => void
}) {
  const [subiendo, setSubiendo] = useState(false)

  async function sacar(id: number) {
    onError(null)
    try {
      await borrarContrato(id)
      onCambio()
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo sacar el contrato.')
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h4 className="t-mono text-tenue">Contratos</h4>
        {puedeEscribir && (
          <Boton variante="secundario" tamaño="chico"
            type="button"
            onClick={() => setSubiendo(true)}>
            Adjuntar contrato
          </Boton>
        )}
      </div>

      {contratos.length === 0 ? (
        <p className="mt-1.5 text-sm text-acento">
          Sin contrato adjunto. <span className="text-tenue">No se va a poder publicar.</span>
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {contratos.map((c) => (
            <li key={c.idContrato} className="flex flex-wrap items-center gap-3">
              <Boton variante="enlace"
                type="button"
                onClick={() => void abrirContrato(c.idContrato)}>
                Ver PDF
              </Boton>
              <span className="text-xs text-tenue">
                {/* La distinción que hace no obvia a la regla: un contrato general
                    respalda todos los lanzamientos del artista. */}
                {c.general ? `General de ${c.artista}` : `De este release`}
                {c.fechaFirma && ` · firmado el ${c.fechaFirma}`}
              </span>
              {puedeEscribir && (
                <Boton variante="enlace"
                  type="button"
                  onClick={() => void sacar(c.idContrato)} className="ml-auto">
                  Sacar
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}

      {subiendo && (
        <FormularioContrato
          idArtista={release.idArtista}
          idRelease={release.idRelease}
          onCerrar={() => setSubiendo(false)}
          onGuardado={() => {
            setSubiendo(false)
            onCambio()
          }}
        />
      )}
    </section>
  )
}

/**
 * Dónde sonó (P25).
 *
 * **Vacío no es una falla.** Textual del cliente: *"si en el futuro no lo usan,
 * que no lo usen y fue"*. Por eso el bloque se lee bien con cero filas y no grita.
 *
 * El orden lo trae el backend en `ordenRelevancia`: acá no se ordena nada, para
 * que la jerarquía viva en un solo lugar.
 */
function BloqueApariciones({
  release,
  apariciones,
  puedeEscribir,
  onCambio,
  onError,
}: {
  release: ReleaseResumen
  apariciones: AparicionResumen[]
  puedeEscribir: boolean
  onCambio: () => void
  onError: (mensaje: string | null) => void
}) {
  const [anotando, setAnotando] = useState(false)

  return (
    <section>
      <div className="flex items-center justify-between">
        <h4 className="t-mono text-tenue">Dónde sonó</h4>
        {puedeEscribir && (
          <Boton variante="secundario" tamaño="chico"
            type="button"
            onClick={() => setAnotando(true)}>
            Anotar
          </Boton>
        )}
      </div>

      {apariciones.length === 0 ? (
        <p className="mt-1.5 text-sm text-apagado">Todavía no se anotó ninguna.</p>
      ) : (
        <ul className="mt-1.5 space-y-1.5 text-sm">
          {apariciones.map((a) => (
            <li key={a.idAparicion} className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-superficie-2 px-1.5 py-0.5 text-xs">
                {NOMBRE_DE_TIPO_APARICION[a.tipoAparicion]}
              </span>
              <span className="font-medium">{a.donde}</span>
              {a.quien && <span className="text-xs text-tenue">por {a.quien}</span>}
              {a.fecha && <span className="text-xs text-tenue">· {a.fecha}</span>}
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-xs underline"
                >
                  link
                </a>
              )}
              {puedeEscribir && (
                <Boton variante="enlace"
                  type="button"
                  onClick={() =>
                    void borrarAparicion(a.idAparicion)
                      .then(onCambio)
                      .catch((e: unknown) =>
                        onError(e instanceof ApiError ? e.message : 'No se pudo borrar.'),
                      )
                  } className="ml-auto">
                  Borrar
                </Boton>
              )}
            </li>
          ))}
        </ul>
      )}

      {anotando && (
        <FormularioAparicion
          idRelease={release.idRelease}
          onCerrar={() => setAnotando(false)}
          onGuardado={() => {
            setAnotando(false)
            onCambio()
          }}
        />
      )}
    </section>
  )
}

// == Formularios =============================================================

function FormularioAlta({
  artistas,
  onCerrar,
  onGuardado,
}: {
  artistas: ArtistaResumen[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [idArtista, setIdArtista] = useState('')
  const [nombreRelease, setNombreRelease] = useState('')
  const [codigoRelease, setCodigoRelease] = useState('')
  const [tipoRelease, setTipoRelease] = useState<TipoRelease | ''>('')
  const [genero, setGenero] = useState('')
  const [fechaEstimada, setFechaEstimada] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await registrarRelease({
        idArtista: Number(idArtista),
        nombreRelease,
        codigoRelease: codigoRelease || undefined,
        tipoRelease: tipoRelease === '' ? null : tipoRelease,
        genero: genero || undefined,
        fechaEstimada: fechaEstimada || null,
      })
      onGuardado()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void guardar(e)}
      className="mb-4 space-y-4 rounded-lg border border-linea bg-superficie p-5"
    >
      <h3 className="font-medium">Nuevo release</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Artista"
          value={idArtista}
          onChange={(e) => setIdArtista(e.target.value)}
          required
        >
          <option value="">Elegí…</option>
          {artistas.map((a) => (
            <option key={a.idArtista} value={a.idArtista}>
              {a.nombreArtistico}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Nombre"
          value={nombreRelease}
          onChange={(e) => setNombreRelease(e.target.value)}
          required
        />

        <CampoSelect
          etiqueta="Tipo"
          value={tipoRelease}
          onChange={(e) => setTipoRelease(e.target.value as TipoRelease | '')}
        >
          <option value="">Sin definir</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_DE_TIPO_RELEASE[t]}
            </option>
          ))}
        </CampoSelect>

        <Campo etiqueta="Género" value={genero} onChange={(e) => setGenero(e.target.value)} />

        <Campo
          etiqueta="Fecha estimada"
          type="date"
          value={fechaEstimada}
          onChange={(e) => setFechaEstimada(e.target.value)}
          ayuda="El aviso salta 7 días antes."
        />

        <Campo
          etiqueta="Código"
          value={codigoRelease}
          onChange={(e) => setCodigoRelease(e.target.value)}
          placeholder="Lo pone el sistema"
          ayuda="Solo para cargar lanzamientos viejos, que tienen el número que tuvieron."
        />
      </div>

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

/**
 * Subir el PDF.
 *
 * El input acepta PDF e imágenes, y aun así **el sistema mira el contenido**: el
 * `accept` es una comodidad del explorador de archivos, no una verificación —
 * cualquiera lo esquiva eligiendo "todos los archivos".
 */
function FormularioContrato({
  idArtista,
  idRelease,
  onCerrar,
  onGuardado,
}: {
  idArtista: number
  idRelease?: number
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [fechaFirma, setFechaFirma] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [general, setGeneral] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!archivo) {
      setError('Elegí el archivo del contrato.')
      return
    }
    setGuardando(true)
    setError(null)
    try {
      await cargarContrato({
        idArtista,
        idRelease: general ? undefined : idRelease,
        archivo,
        fechaFirma: fechaFirma || undefined,
        observaciones: observaciones || undefined,
      })
      onGuardado()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo subir el contrato.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void guardar(e)}
      className="mt-3 space-y-4 rounded-md border border-linea bg-superficie-2 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Archivo"
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          required
          ayuda="PDF, PNG o JPG. El sistema verifica el contenido, no la extensión."
        />
        <Campo
          etiqueta="Fecha de firma"
          type="date"
          value={fechaFirma}
          onChange={(e) => setFechaFirma(e.target.value)}
        />
        <Campo
          etiqueta="Observaciones"
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className="sm:col-span-2"
        />
      </div>

      {idRelease !== undefined && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={general}
            onChange={(e) => setGeneral(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Es un contrato <strong>general del artista</strong>
            <span className="block text-xs text-tenue">
              Respalda todos sus lanzamientos, no solo este.
            </span>
          </span>
        </label>
      )}

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Subiendo…' : 'Subir'}
        </Boton>
        <Boton variante="secundario" type="button" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

function FormularioAparicion({
  idRelease,
  onCerrar,
  onGuardado,
}: {
  idRelease: number
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [tipoAparicion, setTipoAparicion] = useState<TipoAparicion>('RADIO')
  const [donde, setDonde] = useState('')
  const [quien, setQuien] = useState('')
  const [fecha, setFecha] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      await anotarAparicion(idRelease, {
        tipoAparicion,
        donde,
        quien: quien || undefined,
        fecha: fecha || null,
        url: url || undefined,
      })
      onGuardado()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo anotar.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void guardar(e)}
      className="mt-3 space-y-4 rounded-md border border-linea bg-superficie-2 p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Tipo"
          value={tipoAparicion}
          onChange={(e) => setTipoAparicion(e.target.value as TipoAparicion)}
        >
          {TIPOS_DE_APARICION.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_DE_TIPO_APARICION[t]}
            </option>
          ))}
        </CampoSelect>
        <Campo
          etiqueta="Dónde"
          value={donde}
          onChange={(e) => setDonde(e.target.value)}
          placeholder="Radio Metro, Boiler Room…"
          required
        />
        <Campo etiqueta="Quién" value={quien} onChange={(e) => setQuien(e.target.value)} />
        <Campo
          etiqueta="Fecha"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />
        <Campo
          etiqueta="Link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="sm:col-span-2"
        />
      </div>

      {error && <Aviso>{error}</Aviso>}

      <div className="flex gap-2">
        <Boton type="submit" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Anotar'}
        </Boton>
        <Boton variante="secundario" type="button" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

export { FormularioContrato }
