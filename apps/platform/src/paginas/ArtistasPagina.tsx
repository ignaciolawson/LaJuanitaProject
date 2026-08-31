import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import {
  abrirContrato,
  contratosDelArtista,
  editarArtista,
  listarArtistas,
  registrarArtista,
} from '../api/sello'
import type { ArtistaResumen, ContratoResumen } from '../api/tiposSello'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { FormularioContrato } from './SelloPagina'
import { Etiqueta } from '../componentes/Etiqueta'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 7 — las fichas de los artistas del sello.
 *
 * **Un artista no es una cuenta** (P24, cerrada el 2026-08-20): no se crea
 * `usuario`, no hay contraseña temporal y no hay login. Esta pantalla administra
 * una ficha para que un release tenga de quién colgar, y esa respuesta hizo al
 * Módulo 7 la mitad de grande de lo que podía haber sido.
 *
 * **No hay baja, y es deliberado**: `artista` no tiene columna de estado. Uno con
 * releases publicados es historial del catálogo y uno sin releases no molesta a
 * nadie. Si algún día hace falta esconder a los que ya no están, es una migración
 * con su columna, no un botón que borre.
 *
 * **Los contratos generales se cargan desde acá**, y ese es el punto de esta
 * pantalla más allá del ABM: un contrato sin release cubre al artista entero y
 * respalda todos sus lanzamientos — la mitad no obvia de la regla dura del módulo.
 */
export function ArtistasPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [artistas, setArtistas] = useState<ArtistaResumen[]>([])
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<ArtistaResumen | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setArtistas(await listarArtistas(buscar || undefined))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  return (
    <div>
      <CabeceraDePagina
        titulo="Artistas"
        aclaracion={<>{cargando
              ? 'Cargando…'
              : `${artistas.length} ${artistas.length === 1 ? 'artista' : 'artistas'}`}</>}
        acciones={<>{puedeEscribir && (
          <Boton
            onClick={() => {
              setEditando(null)
              setMostrandoAlta(true)
            }}
          >
            Nuevo artista
          </Boton>
        )}</>}
      />

      <AvisoSoloLectura />

      <input
        type="search"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
        placeholder="Buscar por nombre artístico o real…"
        className="mb-4 w-full max-w-md rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {(mostrandoAlta || editando) && puedeEscribir && (
        <Formulario
          artista={editando}
          onCerrar={() => {
            setMostrandoAlta(false)
            setEditando(null)
          }}
          onGuardado={() => {
            setMostrandoAlta(false)
            setEditando(null)
            void cargar()
          }}
        />
      )}

      {!cargando && artistas.length === 0 && (
        <EstadoVacio titulo="No hay artistas cargados." />
      )}

      <div className="space-y-3">
        {artistas.map((a) => (
          <article key={a.idArtista} className="rounded-lg border border-linea bg-superficie">
            <button
              type="button"
              onClick={() => setAbierto(abierto === a.idArtista ? null : a.idArtista)}
              className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left"
            >
              <div className="min-w-48 grow">
                <div className="font-medium">{a.nombreArtistico}</div>
                <div className="text-xs text-tenue">
                  {a.nombreReal ?? 'Sin nombre real cargado'}
                  {a.instagram && ` · ${a.instagram}`}
                </div>
              </div>

              {/* Confirmado es el default y no necesita color; sin confirmar es
                  lo que le pide algo a alguien. Antes eran verde y ámbar de
                  Tailwind, que nadie eligió. */}
              <Etiqueta tono={a.confirmado ? 'neutra' : 'atencion'}>
                {a.confirmado ? 'Confirmado' : 'Sin confirmar'}
              </Etiqueta>

              <div className="w-24 shrink-0 text-right text-xs text-tenue">
                {a.releases === 0
                  ? 'Sin releases'
                  : `${a.releases} ${a.releases === 1 ? 'release' : 'releases'}`}
              </div>
            </button>

            {abierto === a.idArtista && (
              <Detalle
                artista={a}
                puedeEscribir={puedeEscribir}
                onEditar={() => setEditando(a)}
                onError={setError}
              />
            )}
          </article>
        ))}
      </div>
    </div>
  )
}

function Detalle({
  artista,
  puedeEscribir,
  onEditar,
  onError,
}: {
  artista: ArtistaResumen
  puedeEscribir: boolean
  onEditar: () => void
  onError: (mensaje: string | null) => void
}) {
  const [contratos, setContratos] = useState<ContratoResumen[]>([])
  const [subiendo, setSubiendo] = useState(false)

  const recargar = useCallback(() => {
    contratosDelArtista(artista.idArtista)
      .then(setContratos)
      .catch(() => setContratos([]))
  }, [artista.idArtista])

  useEffect(recargar, [recargar])

  return (
    <div className="space-y-5 border-t border-linea px-5 py-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-3">
        <Dato etiqueta="Email" valor={artista.emailContacto} />
        <Dato etiqueta="Teléfono" valor={artista.telefono} />
        <Dato etiqueta="Instagram" valor={artista.instagram} />
      </div>

      {artista.bio && <p className="whitespace-pre-line">{artista.bio}</p>}

      <section>
        <div className="flex items-center justify-between">
          <h4 className="t-mono text-tenue">Contratos</h4>
          {puedeEscribir && (
            <Boton variante="secundario" tamaño="chico"
              type="button"
              onClick={() => setSubiendo(true)}>
              Adjuntar contrato general
            </Boton>
          )}
        </div>

        {contratos.length === 0 ? (
          <p className="mt-1.5 text-sm text-apagado">Ninguno cargado.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {contratos.map((c) => (
              <li key={c.idContrato} className="flex flex-wrap items-center gap-3">
                <Boton variante="enlace"
                  type="button"
                  onClick={() => void abrirContrato(c.idContrato)}>
                  Ver PDF
                </Boton>
                <span className="text-xs text-tenue">
                  {c.general ? 'General del artista' : `Del release ${c.codigoRelease}`}
                  {c.fechaFirma && ` · firmado el ${c.fechaFirma}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {subiendo && (
          <FormularioContrato
            idArtista={artista.idArtista}
            onCerrar={() => setSubiendo(false)}
            onGuardado={() => {
              setSubiendo(false)
              recargar()
              onError(null)
            }}
          />
        )}
      </section>

      {puedeEscribir && (
        <Boton variante="secundario" onClick={onEditar}>
          Editar ficha
        </Boton>
      )}
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <div className="t-mono text-tenue">{etiqueta}</div>
      <div className={valor ? '' : 'text-apagado'}>{valor ?? 'Sin cargar'}</div>
    </div>
  )
}

function Formulario({
  artista,
  onCerrar,
  onGuardado,
}: {
  artista: ArtistaResumen | null
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [nombreArtistico, setNombreArtistico] = useState(artista?.nombreArtistico ?? '')
  const [nombreReal, setNombreReal] = useState(artista?.nombreReal ?? '')
  const [emailContacto, setEmailContacto] = useState(artista?.emailContacto ?? '')
  const [telefono, setTelefono] = useState(artista?.telefono ?? '')
  const [instagram, setInstagram] = useState(artista?.instagram ?? '')
  const [confirmado, setConfirmado] = useState(artista?.confirmado ?? false)
  const [bio, setBio] = useState(artista?.bio ?? '')
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setError(null)
    setErrores({})

    const datos = {
      nombreArtistico,
      nombreReal: nombreReal || undefined,
      emailContacto: emailContacto || undefined,
      telefono: telefono || undefined,
      instagram: instagram || undefined,
      confirmado,
      bio: bio || undefined,
    }

    try {
      if (artista) await editarArtista(artista.idArtista, datos)
      else await registrarArtista(datos)
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
      className="mb-4 space-y-4 rounded-lg border border-linea bg-superficie p-5"
    >
      <h3 className="font-medium">{artista ? 'Editar artista' : 'Nuevo artista'}</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre artístico"
          value={nombreArtistico}
          onChange={(e) => setNombreArtistico(e.target.value)}
          error={errores.nombreArtistico}
          required
        />
        <Campo
          etiqueta="Nombre real"
          value={nombreReal}
          onChange={(e) => setNombreReal(e.target.value)}
        />
        <Campo
          etiqueta="Email de contacto"
          type="email"
          value={emailContacto}
          onChange={(e) => setEmailContacto(e.target.value)}
          error={errores.emailContacto}
          // No es una credencial: los artistas no entran al sistema, así que este
          // email no es único ni sirve para iniciar sesión.
          ayuda="Solo para contactarlo. No da acceso al sistema."
        />
        <Campo
          etiqueta="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
        />
        <Campo
          etiqueta="Instagram"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
        />
        <Campo etiqueta="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={confirmado}
          onChange={(e) => setConfirmado(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          El sello ya cerró con él
          <span className="block text-xs text-tenue">
            No es lo mismo que tener contrato: eso se adjunta aparte, y es lo que mira
            la regla de publicación.
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
