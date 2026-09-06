import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  convertirSolicitante,
  descartarSolicitante,
  listarSolicitantes,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  DONDE_SIGUE,
  NOMBRE_DE_ESTADO_SOLICITANTE,
  NOMBRE_DE_INTERES,
  type ConversionRealizada,
  type EstadoSolicitante,
  type SolicitanteResumen,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque, Hueco } from '../componentes/Bloque'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { CampoSelect } from '../componentes/Campo'
import { EstadoVacio } from '../componentes/EstadoVacio'
import { Etiqueta } from '../componentes/Etiqueta'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { cuando } from '../componentes/presentacion'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { linkDeWhatsapp, mensajeConLaClave, saludoDeContacto } from '../componentes/whatsapp'

/**
 * El buzón: lo que llega de los formularios de la landing (hallazgo #7, `V20`).
 *
 * **Esta pantalla es la que hace que los formularios de la landing sirvan.** Hoy
 * contestan *"listo, lo recibimos"* sin que el pedido salga del navegador, y por
 * eso la landing no se puede publicar: publicarla así es perder clientes reales.
 * Es la misma lección que dejó el cierre del Módulo 2 —el endpoint existía y
 * ninguna pantalla lo llamaba—, con el agravante de que acá del otro lado hay
 * alguien esperando que lo llamen.
 *
 * **Una ficha se atiende, no se lee.** Por eso lo que se ofrece son dos acciones
 * que la cierran —darle cuenta, o descartarla con motivo— y no un "marcar como
 * visto". Un estado "leído" habría dejado exactamente el agujero que esto viene a
 * tapar: la ficha sale de la lista sin que nadie haya llamado a nadie.
 *
 * **La ficha dice a dónde sigue el trámite.** El último paso —la inscripción, la
 * reserva, la venta— ya está construido en las pantallas que Micaela usa todos
 * los días; lo único que faltaba era la puerta de entrada. Por eso al convertir
 * aparece el link, en vez de dejar a alguien adivinando cuál de las dieciséis
 * pantallas sigue.
 */
export function SolicitantesPagina() {
  const puedeResolver = usePuedeEscribir()

  const [estado, setEstado] = useState<EstadoSolicitante | ''>('PENDIENTE')
  const [pagina, setPagina] = useState(0)
  const [fichas, setFichas] = useState<SolicitanteResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  /** Cuál está abierta para descartar. Una por vez. */
  const [descartando, setDescartando] = useState<number | null>(null)

  /**
   * Lo último que se convirtió. Se muestra arriba y no adentro de la fila porque
   * al convertir la ficha deja de estar PENDIENTE y desaparece del filtro por
   * defecto — con la contraseña adentro se iría con ella, que es la única que no
   * se puede volver a ver.
   */
  const [recienConvertida, setRecienConvertida] = useState<ConversionRealizada | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const resultado = await listarSolicitantes({ estado: estado || undefined, pagina })
      setFichas(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el buzón.')
    } finally {
      setCargando(false)
    }
  }, [estado, pagina])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function convertir(ficha: SolicitanteResumen) {
    setError(null)
    try {
      setRecienConvertida(await convertirSolicitante(ficha.idSolicitante))
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la cuenta.')
    }
  }

  async function descartar(id: number, motivo: string) {
    setError(null)
    try {
      await descartarSolicitante(id, motivo)
      setDescartando(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo descartar la ficha.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Buzón de la web"
        aclaracion={
          cargando
            ? 'Cargando…'
            : `${total} ${total === 1 ? 'ficha' : 'fichas'} · lo que llega de los formularios de la web`
        }
        acciones={
          <CampoSelect
            etiqueta="Estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoSolicitante | '')
              setPagina(0)
            }}
            className="w-56"
          >
            <option value="PENDIENTE">Sin contestar</option>
            <option value="CONVERTIDO">Ya tienen cuenta</option>
            <option value="DESCARTADO">Descartadas</option>
            <option value="">Todas</option>
          </CampoSelect>
        }
      />

      <AvisoSoloLectura />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {recienConvertida && (
        <CuentaLista
          resultado={recienConvertida}
          onCerrar={() => setRecienConvertida(null)}
        />
      )}

      {!cargando && fichas.length === 0 && (
        <EstadoVacio
          titulo={
            estado === 'PENDIENTE'
              ? 'No hay nada sin contestar.'
              : 'No hay fichas con ese estado.'
          }
        >
          {estado === 'PENDIENTE' &&
            'Acá caen los formularios de la web: cursos, cabina, grabación y consultas por equipos.'}
        </EstadoVacio>
      )}

      <ul className="space-y-3">
        {fichas.map((f) => (
          <li key={f.idSolicitante} className="rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {f.apellido}, {f.nombre}
                  </span>
                  <Etiqueta>{NOMBRE_DE_INTERES[f.interes]}</Etiqueta>
                </div>

                <div className="mt-1 text-sm text-tenue">{f.email}</div>

                <Telefono ficha={f} />

                {f.detalle && <div className="mt-1 text-sm text-tenue">{f.detalle}</div>}
                {f.mensaje && <p className="mt-2 text-sm italic text-tenue">“{f.mensaje}”</p>}

                <div className="mt-1 text-xs text-apagado">Llegó el {cuando(f.fechaCreacion)}</div>
              </div>

              <div className="shrink-0 text-right">
                <Etiqueta tono={f.estado === 'PENDIENTE' ? 'atencion' : 'apagada'}>
                  {NOMBRE_DE_ESTADO_SOLICITANTE[f.estado]}
                </Etiqueta>

                {f.estado === 'PENDIENTE' && puedeResolver && (
                  <div className="mt-2 flex justify-end gap-2">
                    <Boton onClick={() => void convertir(f)}>Darle cuenta</Boton>
                    <Boton variante="secundario" onClick={() => setDescartando(f.idSolicitante)}>
                      Descartar
                    </Boton>
                  </div>
                )}
              </div>
            </div>

            {f.respuesta && (
              <p className="mt-3 border-t border-linea pt-3 text-sm text-tenue">
                {f.respuesta}
                {f.resueltaPor && <span className="text-apagado"> — {f.resueltaPor}</span>}
              </p>
            )}

            {descartando === f.idSolicitante && (
              <div className="mt-4 border-t border-linea pt-4">
                <PedirMotivo
                  titulo="Descartar la ficha"
                  ayuda="Esto no le llega a nadie: es para el que abra el buzón la semana que viene. Sin el motivo, “spam” y “llamé tres veces y no contesta” se ven igual."
                  onCerrar={() => setDescartando(null)}
                  onConfirmar={(motivo) => void descartar(f.idSolicitante, motivo)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

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
 * El teléfono, que es **el canal por el que este buzón se contesta**.
 *
 * ⚠️ Antes iba en gris chico, pegado al mail, separado por un punto. Y es el dato
 * que quien atiende tiene que **leer y volver a tipear en otra aplicación** —o
 * sea el único de la ficha que se usa con las manos, mostrado como el que menos
 * importa. Ahora va grande, en monoespaciada (los números se leen de a bloques),
 * con `select-all` para que un clic lo seleccione entero, y con el botón que se
 * saltea el paso.
 *
 * **Si el número no se puede leer, se dice y no se ofrece el botón.** Un `wa.me`
 * mal armado abre WhatsApp diciendo *"número no válido"*: parece que el sistema
 * hizo algo y deja a la persona peor que antes. Ver {@code whatsapp.ts}.
 */
function Telefono({ ficha }: { ficha: SolicitanteResumen }) {
  const [copiado, setCopiado] = useState(false)

  const link = linkDeWhatsapp(
    ficha.telefono,
    saludoDeContacto(ficha.nombre, NOMBRE_DE_INTERES[ficha.interes]),
  )

  async function copiar() {
    try {
      await navigator.clipboard.writeText(ficha.telefono)
      setCopiado(true)
    } catch {
      // Sin permiso, sin HTTPS o sin API no hay nada que hacer — y el número ya
      // está a la vista y seleccionable, que es la razón por la que se muestra
      // grande **además** de ofrecer el botón y no en lugar de él.
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="select-all font-mono text-base tabular-nums">{ficha.telefono}</span>

      <Boton variante="enlace" type="button" onClick={() => void copiar()}>
        {copiado ? 'Copiado' : 'Copiar'}
      </Boton>

      {link ? (
        <EnlaceDeWhatsapp href={link}>Escribirle</EnlaceDeWhatsapp>
      ) : (
        <span className="text-xs text-apagado">
          Ese número no se puede abrir en WhatsApp: copialo y buscalo a mano.
        </span>
      )}
    </div>
  )
}

/**
 * El link a WhatsApp.
 *
 * Es un `<a>` y no un `<button>` **a propósito**: abre otra aplicación, así que
 * tiene que poder abrirse en otra pestaña, copiarse y todo lo que un link hace.
 * Se dibuja como el botón secundario para que se lea como una acción, que es lo
 * que es.
 */
function EnlaceDeWhatsapp({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="rounded-md border border-linea-control bg-superficie px-3 py-1.5 text-xs font-medium text-texto transition-colors hover:border-red hover:text-acento"
    >
      {children}
    </a>
  )
}

/**
 * Lo que hay que hacer después de convertir.
 *
 * **Cuenta dos historias distintas y no una con un hueco.** Si la cuenta se creó,
 * lo importante es la contraseña —que no se puede volver a ver— y pasarla por
 * WhatsApp. Si la persona ya tenía cuenta, no hay nada que mandarle y decirlo es
 * la mitad útil del mensaje: sin eso, quien atiende se queda esperando un dato
 * que no existe.
 */
function CuentaLista({
  resultado,
  onCerrar,
}: {
  resultado: ConversionRealizada
  onCerrar: () => void
}) {
  const sigue = DONDE_SIGUE[resultado.solicitante.interes]
  const quien = `${resultado.usuario.nombre} ${resultado.usuario.apellido}`

  const linkConLaClave = resultado.passwordTemporal
    ? linkDeWhatsapp(
        resultado.solicitante.telefono,
        mensajeConLaClave(
          resultado.usuario.nombre,
          resultado.usuario.email,
          resultado.passwordTemporal,
        ),
      )
    : null

  return (
    <Bloque titulo={resultado.cuentaNueva ? `Cuenta creada para ${quien}` : `${quien} ya tenía cuenta`} className="mb-6">

      {resultado.cuentaNueva && resultado.passwordTemporal ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-tenue">
            Pasásela por WhatsApp. El sistema le va a pedir que la cambie cuando entre, y{' '}
            <strong className="text-texto">vence a los 7 días</strong> si no la usa.{' '}
            <strong className="text-texto">No se puede volver a ver:</strong> si se pierde, hay que
            generar otra desde Personas.
          </p>
          <Hueco className="mt-3 font-mono text-lg tracking-wider">
            {resultado.passwordTemporal}
          </Hueco>

          {/* ⚠️ **El botón que hace que la advertencia de arriba deje de importar
              tanto.** "No se puede volver a ver" convierte un error de tipeo en
              una cuenta nueva: la persona no entra, vuelve a escribir, y hay que
              generarle otra clave desde Personas. Escrito por el sistema, ese
              error no existe. Mandar el mensaje sigue siendo un acto de quien
              atiende — lo que se saca del medio es la transcripción. */}
          {linkConLaClave ? (
            <div className="mt-3">
              <EnlaceDeWhatsapp href={linkConLaClave}>
                Mandarle la clave por WhatsApp
              </EnlaceDeWhatsapp>
            </div>
          ) : (
            <p className="mt-3 text-xs text-apagado">
              El teléfono de la ficha ({resultado.solicitante.telefono}) no se puede abrir en
              WhatsApp: copiá la clave y buscá el número a mano.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-tenue">
          No hay contraseña que mandarle: entra con la suya. La ficha quedó apuntando a esa
          cuenta.
        </p>
      )}

      {sigue && (
        <p className="mt-4 text-sm text-tenue">
          {sigue.texto} en{' '}
          <Link to={sigue.ruta} className="text-acento underline underline-offset-2">
            {sigue.ruta === '/admin/inscripciones'
              ? 'Inscripciones'
              : sigue.ruta === '/admin/reservas'
                ? 'el Calendario'
                : 'Venta de equipos'}
          </Link>
          .
        </p>
      )}

      <Boton className="mt-4" onClick={onCerrar}>
        Listo
      </Boton>
    </Bloque>
  )
}
