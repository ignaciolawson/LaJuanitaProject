import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { listarProfesores } from '../api/administracion'
import {
  cancelarTrabajo,
  cobrarTrabajo,
  confirmarTrabajo,
  editarTrabajo,
  entregarTrabajo,
  liberarPremaster,
  listarTrabajos,
  registrarRevision,
  registrarTrabajo,
} from '../api/mastering'
import {
  NOMBRE_DE_MEDIO,
  type MedioPago,
  type Moneda,
  type ProfesorResumen,
  type UsuarioResumen,
} from '../api/tiposAdmin'
import {
  NOMBRE_DE_ESTADO,
  NOMBRE_DE_TIPO,
  type EstadoTrabajo,
  type TipoTrabajo,
  type TrabajoResumen,
} from '../api/tiposMastering'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque, Hueco } from '../componentes/Bloque'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { Filtros } from '../componentes/Filtros'
import { Campo, CampoSelect, CampoTexto } from '../componentes/Campo'
import { Etiqueta } from '../componentes/Etiqueta'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { importe } from '../componentes/dinero'
import { fecha, hoy } from '../componentes/semana'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { BuscadorDePersonas } from '../componentes/BuscadorDePersonas'
import { EstadoVacio } from '../componentes/EstadoVacio'

const TIPOS: TipoTrabajo[] = ['MIX', 'MASTER', 'MIX_MASTER']
const ESTADOS: EstadoTrabajo[] = [
  'A_CONFIRMAR',
  'EN_PROCESO',
  'ENTREGADO',
  'DEBE',
  'PAGADO',
  'CANCELADO',
]
const MEDIOS_DE_PAGO: MedioPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'PAYPAL', 'CUENTA_EEUU', 'OTRO']

/**
 * Los dos entregables, nombrados por lo que son (P80). Se escriben una vez y los
 * usan el alta, la edición y la ficha: la pantalla anterior decía "el master se
 * entrega para revisión" y leído así el master parecía un borrador y el único
 * producto terminado parecía el premaster — Ignacio concluyó que faltaba un
 * slot. P22 lo tiene textual de Ghezz: *"Yo entrego el master. Cuando me pagan,
 * recién ahí les doy el premaster, que es lo que necesitan para discográficas."*
 */
const MASTER = {
  etiqueta: 'Master — la canción terminada',
  ayuda: 'Lo que el cliente escucha. Lo ve en su portal apenas se carga el link.',
}
const PREMASTER = {
  etiqueta: 'Premaster — el archivo para discográficas',
  ayuda: 'Se retiene: el cliente no lo ve hasta que se libera, con el pago registrado.',
}

/**
 * Módulo 6 — Mix & Mastering, el tablero de administración.
 *
 * **Es el único servicio que puede quedar en debe** (§3): todo lo demás se seña
 * antes de existir. Ghezz entrega y cobra después —*"básicamente estoy fiando el
 * servicio"*— y este tablero existe para que eso deje de ser un favor sin
 * registro.
 *
 * **Reescrito en la §20 (P78–P81), y lo que cambió es quién escribe qué.** No hay
 * "mover a": el estado lo mueven cuatro hechos con su condición —confirmar,
 * entregar, cobrar, cancelar— y `DEBE` lo escribe el scheduler. El expediente se
 * **lee** (una ficha con sus datos y sus links) y se edita apretando *Editar*;
 * antes eran once campos siempre abiertos con un "Guardar cambios" abajo, y se
 * leía como un formulario a llenar y no como un trabajo a mirar. El cobro ya no
 * pregunta a nombre de quién ni en qué moneda: las dos salen del trabajo.
 *
 * **La regla dura sigue teniendo una sola forma en pantalla: el botón de liberar
 * el premaster.** Si no hay pago, el backend lo rechaza y la pantalla muestra su
 * explicación; recién ahí ofrece liberarlo igual, pidiendo el motivo por escrito.
 * **Ese orden importa** — se ve el bloqueo antes que la excepción, y la excepción
 * cuesta escribir una frase que queda firmada.
 *
 * **Y una alerta que no bloquea:** cuando las revisiones hechas superan a las
 * incluidas, el número se pinta en rojo y nada más. Hasta `V15` la base lo
 * impedía, lo que hacía imposible avisar de algo que no se podía registrar.
 */
export function MixMasteringPagina() {
  const puedeEscribir = usePuedeEscribir()

  const [trabajos, setTrabajos] = useState<TrabajoResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [estado, setEstado] = useState<EstadoTrabajo | ''>('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)
  /** Quién lo hace. La nómina no pagina; si falla, el selector queda vacío y el resto anda. */
  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarTrabajos({
        buscar,
        estado: estado === '' ? undefined : estado,
        pagina,
      })
      setTrabajos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, estado, pagina, setError])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  useEffect(() => {
    if (!puedeEscribir) return
    listarProfesores()
      .then(setProfesores)
      .catch(() => setProfesores([]))
  }, [puedeEscribir])

  function reemplazar(trabajo: TrabajoResumen) {
    setTrabajos((previos) =>
      previos.map((t) => (t.idTrabajo === trabajo.idTrabajo ? trabajo : t)),
    )
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Mix &amp; Mastering"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'trabajo' : 'trabajos'}`}</>}
        acciones={<>{puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Nuevo trabajo</Boton>}</>}
      />

      <AvisoSoloLectura />

      <Filtros>
        <input
          type="search"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value)
            setPagina(0)
          }}
          placeholder="Buscar por track o cliente…"
          className={`min-w-60 grow ${CONTROL_DE_FILTRO}`}
        />
        <select
          aria-label="Estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoTrabajo | '')
            setPagina(0)
          }}
          className={CONTROL_DE_FILTRO}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO[e]}
            </option>
          ))}
        </select>
      </Filtros>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && puedeEscribir && (
        <FormularioAlta
          profesores={profesores}
          onCerrar={() => setMostrandoAlta(false)}
          onGuardado={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      {!cargando && trabajos.length === 0 && (
        <EstadoVacio titulo="No hay trabajos cargados." />
      )}

      <div className="space-y-3">
        {trabajos.map((t) => (
          <article key={t.idTrabajo} className="rounded-lg border border-linea bg-superficie shadow-tarjeta">
            <button
              type="button"
              onClick={() => setAbierto(abierto === t.idTrabajo ? null : t.idTrabajo)}
              className="flex w-full flex-wrap items-center gap-4 px-5 py-4 text-left"
            >
              <div className="min-w-48 grow">
                <div className="font-medium">{t.nombreTrack}</div>
                <div className="text-xs text-tenue">
                  {NOMBRE_DE_TIPO[t.tipoTrabajo]} · {t.cliente}
                  {!t.clienteTieneCuenta && (
                    <span className="text-apagado"> · sin cuenta</span>
                  )}
                </div>
              </div>

              <EtiquetaEstado estado={t.estado} />

              <div className="w-28 shrink-0 text-xs">
                <Revisiones trabajo={t} />
              </div>

              <div className="w-36 shrink-0 text-right text-sm">
                <Plata trabajo={t} />
              </div>

              <div className="w-40 shrink-0 text-right text-xs">
                <Entregables trabajo={t} />
              </div>
            </button>

            {abierto === t.idTrabajo && (
              <Detalle
                trabajo={t}
                profesores={profesores}
                puedeEscribir={puedeEscribir}
                onCambiado={reemplazar}
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

/** DEBE pide que alguien haga algo; CANCELADO está fuera de circulación; el resto es lo normal. */
function EtiquetaEstado({ estado }: { estado: EstadoTrabajo }) {
  const tono = estado === 'DEBE' ? 'atencion' : estado === 'CANCELADO' ? 'apagada' : 'neutra'
  return <Etiqueta tono={tono}>{NOMBRE_DE_ESTADO[estado]}</Etiqueta>
}

/**
 * Cuántas revisiones se hicieron sobre cuántas se vendieron.
 *
 * **Pasarse no es un error, es la alerta de §9**: el número se pinta y ya. La
 * base lo permitió recién en `V15` — antes lo rechazaba, con lo cual no había
 * forma de avisar de algo que no se podía registrar.
 */
function Revisiones({ trabajo }: { trabajo: TrabajoResumen }) {
  const excedido = trabajo.revisionesRealizadas > trabajo.revisionesIncluidas

  return (
    <span className={excedido ? 'font-medium text-acento' : 'text-tenue'}>
      {trabajo.revisionesRealizadas} de {trabajo.revisionesIncluidas} revisiones
    </span>
  )
}

/** El precio y, si falta, lo cobrado: se marca lo que falta, no lo normal. */
function Plata({ trabajo }: { trabajo: TrabajoResumen }) {
  if (trabajo.precioAcordado === null) {
    return <span className="text-apagado">Sin presupuestar</span>
  }
  const falta = (trabajo.cobrado ?? 0) < trabajo.precioAcordado
  return (
    <>
      <div className="font-medium tabular-nums">{importe(trabajo.precioAcordado, trabajo.moneda)}</div>
      {falta && trabajo.estado !== 'CANCELADO' && (
        <div className="text-xs text-acento">
          {trabajo.cobrado ? `cobrado ${importe(trabajo.cobrado, trabajo.moneda)}` : 'sin cobrar'}
        </div>
      )}
    </>
  )
}

/**
 * Los dos entregables en la fila (P80). Antes sólo decía "Premaster retenido",
 * también en un trabajo que no tenía nada cargado — y el master, que es la
 * canción terminada, no aparecía.
 */
function Entregables({ trabajo }: { trabajo: TrabajoResumen }) {
  return (
    <div className="space-y-0.5">
      <div className={trabajo.urlMaster ? 'text-tenue' : 'text-apagado'}>
        {trabajo.urlMaster ? 'Master cargado' : 'Master sin cargar'}
      </div>
      <Premaster trabajo={trabajo} />
    </div>
  )
}

function Premaster({ trabajo }: { trabajo: TrabajoResumen }) {
  if (!trabajo.premasterLiberado) {
    return (
      <div className="text-apagado">
        {trabajo.urlPremaster ? 'Premaster retenido' : 'Premaster sin cargar'}
      </div>
    )
  }

  // Que se haya liberado sin pago se dice siempre: es la excepción, y una
  // excepción que no se ve deja de ser excepcional.
  return trabajo.liberadoSinPago ? (
    <div className="text-acento">Liberado sin pago</div>
  ) : (
    <div className="text-tenue">Premaster entregado</div>
  )
}

function SelectorDeProfesor({
  profesores,
  value,
  onChange,
  disabled,
}: {
  profesores: ProfesorResumen[]
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean
}) {
  return (
    <CampoSelect etiqueta="Quién lo hace" value={value} onChange={onChange} disabled={disabled}>
      <option value="">Sin asignar</option>
      {profesores.map((p) => (
        <option key={p.idProfesor} value={p.idProfesor}>
          {p.nombreCompleto}
        </option>
      ))}
    </CampoSelect>
  )
}

/**
 * Cargar un trabajo nuevo.
 *
 * **El cliente puede no tener cuenta**, y por eso hay dos caminos en vez de
 * obligar a crear un usuario: la mayoría de los clientes de M&M mandan un track y
 * nunca se inscriben en nada. Tener cuenta y ser cliente son cosas distintas.
 *
 * **El precio puede quedar vacío.** Un trabajo entra "a confirmar" mientras se
 * está presupuestando, y exigirlo obligaría a inventar un número para poder
 * anotar que alguien preguntó. Se confirma cuando el presupuesto cerró.
 */
function FormularioAlta({
  profesores,
  onCerrar,
  onGuardado,
}: {
  profesores: ProfesorResumen[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  /** El cliente con cuenta se busca (§17 · H8), no se elige de la primera página. */
  const [cliente, setCliente] = useState<UsuarioResumen | null>(null)
  const [conCuenta, setConCuenta] = useState(false)
  const [datos, setDatos] = useState({
    nombreClienteExterno: '',
    contactoClienteExterno: '',
    idProfesorAsignado: '',
    tipoTrabajo: 'MIX_MASTER' as TipoTrabajo,
    nombreTrack: '',
    precioAcordado: '',
    moneda: 'USD' as Moneda,
    revisionesIncluidas: '3',
    fechaEstimada: '',
    urlMaterialCliente: '',
    notasInternas: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.nombreTrack.trim()) locales.nombreTrack = 'Poné el nombre del track.'
    // Espeja `trabajo_cliente_identificado`.
    if (conCuenta && !cliente) locales.clienteIdentificado = 'Elegí al cliente.'
    if (!conCuenta && !datos.nombreClienteExterno.trim()) {
      locales.clienteIdentificado = 'Escribí el nombre del cliente.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await registrarTrabajo({
        idClienteUsuario: conCuenta ? cliente!.id : undefined,
        nombreClienteExterno: conCuenta ? undefined : datos.nombreClienteExterno.trim(),
        contactoClienteExterno: conCuenta
          ? undefined
          : datos.contactoClienteExterno.trim() || undefined,
        idProfesorAsignado: datos.idProfesorAsignado ? Number(datos.idProfesorAsignado) : undefined,
        tipoTrabajo: datos.tipoTrabajo,
        nombreTrack: datos.nombreTrack.trim(),
        precioAcordado: datos.precioAcordado ? Number(datos.precioAcordado) : undefined,
        moneda: datos.moneda,
        revisionesIncluidas: Number(datos.revisionesIncluidas),
        fechaEstimada: datos.fechaEstimada || undefined,
        urlMaterialCliente: datos.urlMaterialCliente.trim() || undefined,
        notasInternas: datos.notasInternas.trim() || undefined,
      })
      onGuardado()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <Bloque titulo="Nuevo trabajo" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        <div className="mb-4 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={!conCuenta} onChange={() => setConCuenta(false)} />
            Cliente sin cuenta
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={conCuenta} onChange={() => setConCuenta(true)} />
            Tiene cuenta en el sistema
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {conCuenta ? (
            <div className="sm:col-span-2">
              <BuscadorDePersonas elegida={cliente} onElegir={setCliente} etiqueta="Cliente" />
              {errores.clienteIdentificado && (
                <p className="mt-1 text-xs text-red">{errores.clienteIdentificado}</p>
              )}
            </div>
          ) : (
            <>
              <Campo
                etiqueta="Nombre del cliente"
                required
                value={datos.nombreClienteExterno}
                onChange={cambiar('nombreClienteExterno')}
                error={errores.clienteIdentificado}
              />
              <Campo
                etiqueta="Contacto"
                value={datos.contactoClienteExterno}
                onChange={cambiar('contactoClienteExterno')}
                ayuda="Mail o teléfono, para poder ubicarlo."
              />
            </>
          )}

          <Campo
            etiqueta="Track"
            required
            value={datos.nombreTrack}
            onChange={cambiar('nombreTrack')}
            error={errores.nombreTrack}
          />

          <CampoSelect etiqueta="Tipo" value={datos.tipoTrabajo} onChange={cambiar('tipoTrabajo')}>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {NOMBRE_DE_TIPO[t]}
              </option>
            ))}
          </CampoSelect>

          <SelectorDeProfesor
            profesores={profesores}
            value={datos.idProfesorAsignado}
            onChange={cambiar('idProfesorAsignado')}
          />

          <Campo
            etiqueta="Precio acordado"
            type="number"
            step="0.01"
            value={datos.precioAcordado}
            onChange={cambiar('precioAcordado')}
            error={errores.precioAcordado}
            ayuda="Se puede dejar vacío mientras se presupuesta."
          />

          <CampoSelect etiqueta="Moneda" value={datos.moneda} onChange={cambiar('moneda')}>
            <option value="USD">Dólares</option>
            <option value="ARS">Pesos</option>
          </CampoSelect>

          <Campo
            etiqueta="Revisiones incluidas"
            type="number"
            value={datos.revisionesIncluidas}
            onChange={cambiar('revisionesIncluidas')}
            error={errores.revisionesIncluidas}
          />

          <Campo
            etiqueta="Entrega estimada"
            type="date"
            value={datos.fechaEstimada}
            onChange={cambiar('fechaEstimada')}
          />

          <Campo
            etiqueta="Link del material del cliente"
            value={datos.urlMaterialCliente}
            onChange={cambiar('urlMaterialCliente')}
            error={errores.urlMaterialCliente ?? errores.materialConEsquema}
            ayuda="El audio no pasa por el sistema: va el link de WeTransfer o Drive."
            className="sm:col-span-2"
          />

          <CampoTexto
            etiqueta="Notas internas"
            value={datos.notasInternas}
            onChange={cambiar('notasInternas')}
            ayuda="No las ve el cliente."
            className="sm:col-span-2"
          />
        </div>

        {errorGeneral && (
          <div className="mt-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={enviando}>
            Guardar trabajo
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Bloque>
  )
}

/**
 * El expediente de un trabajo: lo que se lee, lo que se edita y lo que se hace.
 *
 * **Tres cosas y no dos, y la primera es la que faltaba.** Antes el detalle era
 * once campos siempre abiertos con "Guardar cambios" abajo y los hechos debajo
 * de eso: un formulario a llenar, no un trabajo a mirar. Ahora se abre una
 * ficha —el cliente, el precio y lo cobrado, los links como links, las notas
 * completas—, *Editar* la convierte en formulario, y **las acciones son el
 * bloque principal**, porque para eso se abre un trabajo: para hacerle algo.
 *
 * **Y ninguna acción es un campo.** Confirmar, entregar, cobrar, liberar y
 * cancelar registran un *hecho* con su condición, y por eso **cargar el link
 * del premaster no es entregarlo**: cargarlo es editar, liberarlo es un acto con
 * su propia regla.
 */
function Detalle({
  trabajo,
  profesores,
  puedeEscribir,
  onCambiado,
  onError,
}: {
  trabajo: TrabajoResumen
  profesores: ProfesorResumen[]
  puedeEscribir: boolean
  onCambiado: (trabajo: TrabajoResumen) => void
  onError: (mensaje: string) => void
}) {
  const [editando, setEditando] = useState(false)

  return (
    <div className="border-t border-linea px-5 py-5">
      {editando ? (
        <FormularioExpediente
          trabajo={trabajo}
          profesores={profesores}
          onCerrar={() => setEditando(false)}
          onGuardado={(actualizado) => {
            setEditando(false)
            onCambiado(actualizado)
          }}
          onError={onError}
        />
      ) : (
        <Ficha
          trabajo={trabajo}
          onEditar={puedeEscribir ? () => setEditando(true) : undefined}
        />
      )}

      {puedeEscribir && !editando && (
        <Acciones trabajo={trabajo} onCambiado={onCambiado} onError={onError} />
      )}
    </div>
  )
}

/** Un dato de la ficha: etiqueta chica arriba, valor abajo. */
function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="t-mono text-tenue">{etiqueta}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  )
}

function Link({ url, vacio }: { url: string | null; vacio: string }) {
  if (!url) return <span className="text-apagado">{vacio}</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="break-all underline underline-offset-2 hover:text-acento"
    >
      {url}
    </a>
  )
}

/** El expediente como se lee: datos, links y las notas enteras. */
function Ficha({ trabajo, onEditar }: { trabajo: TrabajoResumen; onEditar?: () => void }) {
  const t = trabajo
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Dato etiqueta="Cliente">
          {t.cliente}
          {!t.clienteTieneCuenta && (
            <span className="text-xs text-apagado">
              {' '}
              · sin cuenta{t.contactoClienteExterno && ` · ${t.contactoClienteExterno}`}
            </span>
          )}
        </Dato>
        <Dato etiqueta="Quién lo hace">
          {t.profesorAsignado ?? <span className="text-apagado">Sin asignar</span>}
        </Dato>
        <Dato etiqueta="Tipo">{NOMBRE_DE_TIPO[t.tipoTrabajo]}</Dato>

        <Dato etiqueta="Precio acordado">
          {t.precioAcordado === null ? (
            <span className="text-apagado">Sin presupuestar</span>
          ) : (
            <>
              <span className="tabular-nums">{importe(t.precioAcordado, t.moneda)}</span>
              {t.cobrado !== null && (
                <span className="text-xs text-tenue">
                  {' '}
                  · cobrado {importe(t.cobrado, t.moneda)}
                </span>
              )}
            </>
          )}
        </Dato>
        <Dato etiqueta="Revisiones">
          <Revisiones trabajo={t} />
        </Dato>
        <Dato etiqueta="Entrega">
          {t.fechaEntregaReal ? (
            `Entregado el ${fecha(t.fechaEntregaReal)}`
          ) : t.fechaEstimada ? (
            `Estimada para el ${fecha(t.fechaEstimada)}`
          ) : (
            <span className="text-apagado">Sin fecha estimada</span>
          )}
        </Dato>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Dato etiqueta="Material del cliente">
          <Link url={t.urlMaterialCliente} vacio="Sin link" />
        </Dato>
        <Dato etiqueta={MASTER.etiqueta}>
          <Link url={t.urlMaster} vacio="Sin cargar" />
        </Dato>
        <Dato etiqueta={PREMASTER.etiqueta}>
          <Link url={t.urlPremaster} vacio="Sin cargar" />
          {t.urlPremaster && (
            <div className="text-xs">
              <Premaster trabajo={t} />
            </div>
          )}
        </Dato>
      </div>

      {t.liberadoSinPago && t.motivoLiberacion && (
        <p className="mt-3 text-xs text-acento">Liberado sin pago · {t.motivoLiberacion}</p>
      )}

      <div className="mt-4">
        <Dato etiqueta="Notas internas">
          {t.notasInternas ? (
            <p className="whitespace-pre-wrap">{t.notasInternas}</p>
          ) : (
            <span className="text-apagado">Sin notas</span>
          )}
        </Dato>
      </div>

      {onEditar && (
        <div className="mt-4">
          <Boton variante="secundario" tamaño="chico" onClick={onEditar}>
            Editar
          </Boton>
        </div>
      )}
    </div>
  )
}

/**
 * Editar el expediente: presupuesto, fechas, links y notas.
 *
 * Lo que NO tiene, a propósito: el estado, las revisiones hechas y la liberación
 * del premaster — los tres son hechos y tienen su propia acción. La fecha de
 * entrega real sólo aparece cuando el trabajo ya se entregó, y ahí es una
 * corrección: la pone *Entregar* (P79 · 7).
 */
function FormularioExpediente({
  trabajo,
  profesores,
  onCerrar,
  onGuardado,
  onError,
}: {
  trabajo: TrabajoResumen
  profesores: ProfesorResumen[]
  onCerrar: () => void
  onGuardado: (trabajo: TrabajoResumen) => void
  onError: (mensaje: string) => void
}) {
  const entregado = trabajo.fechaEntregaReal !== null
  const conCobros = trabajo.cobrado !== null
  const [datos, setDatos] = useState({
    idProfesorAsignado: trabajo.idProfesorAsignado ? String(trabajo.idProfesorAsignado) : '',
    tipoTrabajo: trabajo.tipoTrabajo,
    nombreTrack: trabajo.nombreTrack,
    precioAcordado: trabajo.precioAcordado?.toString() ?? '',
    moneda: trabajo.moneda,
    revisionesIncluidas: String(trabajo.revisionesIncluidas),
    fechaEstimada: trabajo.fechaEstimada ?? '',
    fechaEntregaReal: trabajo.fechaEntregaReal ?? '',
    urlMaterialCliente: trabajo.urlMaterialCliente ?? '',
    urlMaster: trabajo.urlMaster ?? '',
    urlPremaster: trabajo.urlPremaster ?? '',
    notasInternas: trabajo.notasInternas ?? '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setErrores({})
    try {
      onGuardado(
        await editarTrabajo(trabajo.idTrabajo, {
          idProfesorAsignado: datos.idProfesorAsignado ? Number(datos.idProfesorAsignado) : undefined,
          tipoTrabajo: datos.tipoTrabajo,
          nombreTrack: datos.nombreTrack.trim(),
          precioAcordado: datos.precioAcordado ? Number(datos.precioAcordado) : undefined,
          moneda: datos.moneda,
          revisionesIncluidas: Number(datos.revisionesIncluidas),
          fechaEstimada: datos.fechaEstimada || undefined,
          fechaEntregaReal: entregado ? datos.fechaEntregaReal || undefined : undefined,
          urlMaterialCliente: datos.urlMaterialCliente.trim() || undefined,
          urlMaster: datos.urlMaster.trim() || undefined,
          urlPremaster: datos.urlPremaster.trim() || undefined,
          notasInternas: datos.notasInternas.trim() || undefined,
        }),
      )
    } catch (e) {
      if (e instanceof ApiError && e.errores) setErrores(e.errores)
      else onError(e instanceof ApiError ? e.message : 'No se pudo guardar el trabajo.')
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} noValidate className="grid gap-4 sm:grid-cols-2">
      <Campo
        etiqueta="Track"
        required
        value={datos.nombreTrack}
        onChange={cambiar('nombreTrack')}
        error={errores.nombreTrack}
      />
      <CampoSelect etiqueta="Tipo" value={datos.tipoTrabajo} onChange={cambiar('tipoTrabajo')}>
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {NOMBRE_DE_TIPO[t]}
          </option>
        ))}
      </CampoSelect>

      <SelectorDeProfesor
        profesores={profesores}
        value={datos.idProfesorAsignado}
        onChange={cambiar('idProfesorAsignado')}
      />
      <Campo
        etiqueta="Precio acordado"
        type="number"
        step="0.01"
        value={datos.precioAcordado}
        onChange={cambiar('precioAcordado')}
        error={errores.precioAcordado}
      />

      <CampoSelect
        etiqueta="Moneda"
        value={datos.moneda}
        onChange={cambiar('moneda')}
        // Con cobros adentro no se cambia (P81): el backend lo rechaza, y acá se
        // dice antes en vez de dejar elegir algo que va a volver con error.
        disabled={conCobros}
      >
        <option value="USD">Dólares</option>
        <option value="ARS">Pesos</option>
      </CampoSelect>
      <Campo
        etiqueta="Revisiones incluidas"
        type="number"
        value={datos.revisionesIncluidas}
        onChange={cambiar('revisionesIncluidas')}
      />

      <Campo
        etiqueta="Entrega estimada"
        type="date"
        value={datos.fechaEstimada}
        onChange={cambiar('fechaEstimada')}
      />
      {entregado ? (
        <Campo
          etiqueta="Entrega real"
          type="date"
          value={datos.fechaEntregaReal}
          onChange={cambiar('fechaEntregaReal')}
          ayuda="La puso Entregar. Corregila sólo si estaba mal."
        />
      ) : (
        <div />
      )}

      <Campo
        etiqueta="Link del material del cliente"
        value={datos.urlMaterialCliente}
        onChange={cambiar('urlMaterialCliente')}
        error={errores.urlMaterialCliente}
        className="sm:col-span-2"
      />
      <Campo
        etiqueta={MASTER.etiqueta}
        value={datos.urlMaster}
        onChange={cambiar('urlMaster')}
        error={errores.urlMaster}
        ayuda={MASTER.ayuda}
      />
      <Campo
        etiqueta={PREMASTER.etiqueta}
        value={datos.urlPremaster}
        onChange={cambiar('urlPremaster')}
        error={errores.urlPremaster ?? errores.linksConEsquema}
        ayuda={PREMASTER.ayuda}
      />

      <CampoTexto
        etiqueta="Notas internas"
        value={datos.notasInternas}
        onChange={cambiar('notasInternas')}
        ayuda="No las ve el cliente."
        className="sm:col-span-2"
        rows={4}
      />

      <div className="flex items-center gap-3 sm:col-span-2">
        <Boton type="submit" disabled={guardando}>
          Guardar cambios
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/**
 * Qué se le puede hacer al trabajo, según dónde está (P79).
 *
 * **La acción que sigue va primero y es la principal**; el resto, secundarias.
 * Un trabajo a confirmar pide confirmarlo; uno en proceso, entregarlo; uno
 * entregado, cobrarlo; uno pagado, liberarle el premaster. Lo que no
 * corresponde no se ofrece — y lo que el backend igual rechaza, llega con su
 * texto.
 */
function Acciones({
  trabajo,
  onCambiado,
  onError,
}: {
  trabajo: TrabajoResumen
  onCambiado: (trabajo: TrabajoResumen) => void
  onError: (mensaje: string) => void
}) {
  // ⚠️ **`useState` pelado y NO `useErrorPasajero`**, por lo mismo que el
  // `rechazo` de `SelloPagina`: no es un aviso, es un estado del flujo. Mientras
  // vale aparece *"Liberarlo igual, con motivo"*, así que un reloj le sacaría la
  // salida a quien está decidiendo. Son las dos reglas duras del sistema con esta
  // forma y las dos quedan afuera.
  const [rechazoDeLiberacion, setRechazoDeLiberacion] = useState<string | null>(null)
  const [justificando, setJustificando] = useState(false)
  const [entregando, setEntregando] = useState(false)
  const [cobrando, setCobrando] = useState(false)
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false)

  /** Lo que devuelva el backend manda: la fila se reemplaza con la respuesta. */
  async function correr(operacion: () => Promise<TrabajoResumen>, alFallar?: (m: string) => void) {
    try {
      onCambiado(await operacion())
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo completar la operación.'
      if (alFallar) alFallar(mensaje)
      else onError(mensaje)
    }
  }

  const estado = trabajo.estado
  if (estado === 'CANCELADO') {
    return (
      <p className="mt-5 border-t border-linea pt-4 text-xs text-apagado">
        Trabajo cancelado. No se le puede hacer nada más.
      </p>
    )
  }

  const entregado = estado === 'ENTREGADO' || estado === 'DEBE' || estado === 'PAGADO'
  const puedeLiberar = !trabajo.premasterLiberado
  const puedeCancelar = trabajo.cobrado === null

  return (
    <div className="mt-6 border-t border-linea pt-5">
      <h4 className="mb-3 t-mono text-tenue">Qué pasó con este trabajo</h4>

      <div className="flex flex-wrap items-center gap-3">
        {estado === 'A_CONFIRMAR' && (
          <Boton onClick={() => void correr(() => confirmarTrabajo(trabajo.idTrabajo))}>
            Confirmar presupuesto
          </Boton>
        )}

        {estado === 'EN_PROCESO' && (
          <Boton onClick={() => setEntregando(true)}>Entregar el master</Boton>
        )}

        {entregado && estado !== 'PAGADO' && (
          <Boton onClick={() => setCobrando(true)}>Registrar cobro</Boton>
        )}

        {entregado && puedeLiberar && (
          <Boton
            variante={estado === 'PAGADO' ? 'principal' : 'secundario'}
            onClick={() =>
              void correr(() => liberarPremaster(trabajo.idTrabajo), setRechazoDeLiberacion)
            }
          >
            Liberar el premaster
          </Boton>
        )}

        {!entregado && (
          <Boton variante="secundario" onClick={() => setCobrando(true)}>
            Registrar cobro
          </Boton>
        )}

        {estado !== 'A_CONFIRMAR' && (
          <Boton
            variante="secundario"
            onClick={() => void correr(() => registrarRevision(trabajo.idTrabajo))}
          >
            Registrar una revisión
          </Boton>
        )}

        {puedeCancelar && (
          <Boton variante="enlace" onClick={() => setConfirmandoCancelar(true)}>
            Cancelar el trabajo
          </Boton>
        )}
      </div>

      {entregando && (
        <FormularioEntrega
          onCerrar={() => setEntregando(false)}
          onConfirmar={(fechaDeEntrega) => {
            setEntregando(false)
            void correr(() => entregarTrabajo(trabajo.idTrabajo, fechaDeEntrega))
          }}
        />
      )}

      {/*
        El rechazo se muestra con las palabras del backend y recién debajo
        aparece la salida. Es deliberado que la excepción no esté a mano antes
        de intentar: primero se ve la regla, después la forma de saltearla
        escribiendo por qué.
      */}
      {rechazoDeLiberacion && (
        <div className="mt-4 space-y-3">
          <Aviso>{rechazoDeLiberacion}</Aviso>
          <Boton variante="secundario" onClick={() => setJustificando(true)}>
            Liberarlo igual, con motivo
          </Boton>
        </div>
      )}

      {justificando && (
        <PedirMotivo
          titulo="Liberar el premaster sin pago"
          ayuda="Queda registrado con tu nombre y la fecha. Es la excepción que existe para no tener que esquivar el sistema — no para usarla siempre."
          onCerrar={() => setJustificando(false)}
          onConfirmar={(motivo) => {
            setJustificando(false)
            setRechazoDeLiberacion(null)
            void correr(() => liberarPremaster(trabajo.idTrabajo, motivo))
          }}
        />
      )}

      {cobrando && (
        <FormularioCobro
          trabajo={trabajo}
          onCerrar={() => setCobrando(false)}
          onCobrado={(actualizado) => {
            setCobrando(false)
            onCambiado(actualizado)
          }}
        />
      )}

      {/* Cancelar pide confirmación y NO pide motivo: la tabla no tiene dónde
          guardarlo, y pedir una frase que se tira es peor que no pedirla. Con
          cobros adentro el botón ni aparece — primero se anula el pago. */}
      {confirmandoCancelar && (
        <Hueco className="mt-4 text-sm">
          <p>
            <strong>Un trabajo cancelado no se puede reabrir.</strong> Si se retoma, va a
            ser un trabajo nuevo.
          </p>
          <div className="mt-3 flex gap-2">
            <Boton
              onClick={() => {
                setConfirmandoCancelar(false)
                void correr(() => cancelarTrabajo(trabajo.idTrabajo))
              }}
            >
              Cancelar el trabajo
            </Boton>
            <Boton variante="secundario" onClick={() => setConfirmandoCancelar(false)}>
              Volver
            </Boton>
          </div>
        </Hueco>
      )}
    </div>
  )
}

/** Cuándo se entregó: hoy por defecto, puede ser antes. La carga y el hecho son dos fechas. */
function FormularioEntrega({
  onCerrar,
  onConfirmar,
}: {
  onCerrar: () => void
  onConfirmar: (fecha: string) => void
}) {
  const [fechaDeEntrega, setFechaDeEntrega] = useState(() => hoy())

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onConfirmar(fechaDeEntrega)
      }}
      noValidate
      className="mt-4 rounded-lg border border-linea p-4"
    >
      <h4 className="mb-3 font-semibold">Entregar el master</h4>
      <p className="mb-3 text-xs text-tenue">
        Queda entregado con esta fecha, y desde ahí corren los 7 días para cobrarlo. Si ya
        estaba cobrado, pasa directo a pagado.
      </p>
      <Campo
        etiqueta="Fecha de entrega"
        type="date"
        value={fechaDeEntrega}
        onChange={(e) => setFechaDeEntrega(e.target.value)}
        className="w-48"
      />
      <div className="mt-4 flex gap-3">
        <Boton type="submit">Confirmar entrega</Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/**
 * Registrar el cobro de un trabajo.
 *
 * **No pregunta a nombre de quién ni en qué moneda** (P78 · P81): el pago va a
 * nombre del cliente del trabajo —con cuenta o a nombre escrito, como la venta
 * desde `V19`— y en la moneda del trabajo. El formulario anterior decía *"este
 * cliente no tiene cuenta, elegí a quién imputarlo"*, y tres trabajos de
 * clientes externos terminaron cobrados a nombre de tres empleados.
 *
 * **El monto no se toma del precio**: M&M es el único servicio que puede quedar en
 * debe, así que un cobro parcial es un caso real y no una rareza.
 */
function FormularioCobro({
  trabajo,
  onCerrar,
  onCobrado,
}: {
  trabajo: TrabajoResumen
  onCerrar: () => void
  onCobrado: (trabajo: TrabajoResumen) => void
}) {
  const falta =
    trabajo.precioAcordado === null ? null : trabajo.precioAcordado - (trabajo.cobrado ?? 0)
  const [datos, setDatos] = useState({
    monto: falta !== null && falta > 0 ? String(falta) : '',
    cotizacionDolar: '',
    medioPago: 'TRANSFERENCIA' as MedioPago,
    fechaPago: hoy(),
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
    if (trabajo.moneda === 'USD' && !datos.cotizacionDolar) {
      locales.cotizacionDolar = 'Un pago en dólares necesita la cotización del día.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setError(null)
    setEnviando(true)
    try {
      onCobrado(
        await cobrarTrabajo(trabajo.idTrabajo, {
          monto: Number(datos.monto),
          cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : undefined,
          medioPago: datos.medioPago,
          fechaPago: datos.fechaPago || undefined,
        }),
      )
    } catch (e) {
      if (e instanceof ApiError && e.errores) setErrores(e.errores)
      else setError(e instanceof ApiError ? e.message : 'No se pudo registrar el cobro.')
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 rounded-lg border border-linea p-4">
      <h4 className="mb-3 font-semibold">Registrar cobro</h4>

      <p className="mb-3 text-xs text-tenue">
        A nombre de <strong className="font-medium text-texto">{trabajo.cliente}</strong>
        {!trabajo.clienteTieneCuenta && ' (sin cuenta: queda a su nombre escrito)'}, en{' '}
        {trabajo.moneda === 'USD' ? 'dólares' : 'pesos'}, que es la moneda del trabajo.
        {trabajo.moneda === 'USD' &&
          ' Si pagan en pesos, va el monto en dólares con la cotización del día.'}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta={`Monto en ${trabajo.moneda}`}
          type="number"
          step="0.01"
          required
          value={datos.monto}
          onChange={cambiar('monto')}
          error={errores.monto}
        />
        <CampoSelect etiqueta="Medio" value={datos.medioPago} onChange={cambiar('medioPago')}>
          {MEDIOS_DE_PAGO.map((m) => (
            <option key={m} value={m}>
              {NOMBRE_DE_MEDIO[m]}
            </option>
          ))}
        </CampoSelect>

        {trabajo.moneda === 'USD' && (
          <Campo
            etiqueta="Cotización del dólar"
            type="number"
            step="0.01"
            required
            value={datos.cotizacionDolar}
            onChange={cambiar('cotizacionDolar')}
            error={errores.cotizacionDolar ?? errores.cotizacionPresenteSiEsUsd}
          />
        )}
        <Campo
          etiqueta="Fecha del pago"
          type="date"
          value={datos.fechaPago}
          onChange={cambiar('fechaPago')}
        />
      </div>

      {error && (
        <div className="mt-3">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          Confirmar cobro
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
