import { useCallback, useEffect, useState } from 'react'

import { listarUsuarios } from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  cambiarEstadoDelTrabajo,
  cobrarTrabajo,
  editarTrabajo,
  liberarPremaster,
  listarTrabajos,
  registrarRevision,
  registrarTrabajo,
} from '../api/mastering'
import {
  NOMBRE_DE_MEDIO,
  type MedioPago,
  type Moneda,
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
import { Bloque } from '../componentes/Bloque'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { importe } from '../componentes/dinero'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
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
 * Módulo 6 — Mix & Mastering, el tablero de administración.
 *
 * **Es el único servicio que puede quedar en debe** (§3): todo lo demás se seña
 * antes de existir. Ghezz entrega y cobra después —*"básicamente estoy fiando el
 * servicio"*— y este tablero existe para que eso deje de ser un favor sin
 * registro.
 *
 * **La regla dura tiene una sola forma en pantalla: el botón de entregar el
 * premaster.** Si no hay pago, el backend lo rechaza y la pantalla muestra su
 * explicación; recién ahí ofrece liberarlo igual, pidiendo el motivo por escrito.
 * **Ese orden importa** — se ve el bloqueo antes que la excepción, y la excepción
 * cuesta escribir una frase que queda firmada. Al revés (un checkbox "liberar sin
 * pago" siempre a mano) la regla sería una sugerencia.
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
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [abierto, setAbierto] = useState<number | null>(null)

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
  }, [buscar, estado, pagina])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

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

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => {
            setBuscar(e.target.value)
            setPagina(0)
          }}
          placeholder="Buscar por track o cliente…"
          className="min-w-60 grow border-0 border-b border-linea bg-transparent px-0 py-1.5 text-sm transition-colors focus:border-red"
        />
        <select
          aria-label="Estado"
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value as EstadoTrabajo | '')
            setPagina(0)
          }}
          className="border-0 border-b border-linea bg-transparent px-0 py-1.5 text-sm transition-colors focus:border-red"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_DE_ESTADO[e]}
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
                {t.precioAcordado === null ? (
                  <span className="text-apagado">Sin presupuestar</span>
                ) : (
                  <>
                    <div className="font-medium tabular-nums">
                      {importe(t.precioAcordado, t.moneda)}
                    </div>
                    {/* Se marca lo que falta, no lo normal: un trabajo cobrado no
                        necesita etiqueta. */}
                    {(t.cobrado ?? 0) < t.precioAcordado && (
                      <div className="text-xs text-acento">
                        {t.cobrado ? `cobrado ${importe(t.cobrado, t.moneda)}` : 'sin cobrar'}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="w-32 shrink-0 text-right text-xs">
                <Premaster trabajo={t} />
              </div>
            </button>

            {abierto === t.idTrabajo && (
              <Detalle
                trabajo={t}
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

function EtiquetaEstado({ estado }: { estado: EstadoTrabajo }) {
  const estilo =
    estado === 'DEBE'
      ? 'border-red/40 text-acento'
      : estado === 'PAGADO'
        ? 'border-ink/20 text-ink'
        : estado === 'CANCELADO'
          ? 'border-linea text-apagado'
          : 'border-linea text-tenue'

  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${estilo}`}>
      {NOMBRE_DE_ESTADO[estado]}
    </span>
  )
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

function Premaster({ trabajo }: { trabajo: TrabajoResumen }) {
  if (!trabajo.premasterLiberado) {
    return <span className="text-apagado">Premaster retenido</span>
  }

  // Que se haya liberado sin pago se dice siempre: es la excepción, y una
  // excepción que no se ve deja de ser excepcional.
  return trabajo.liberadoSinPago ? (
    <span className="text-acento">Liberado sin pago</span>
  ) : (
    <span className="text-tenue">Premaster entregado</span>
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
 * anotar que alguien preguntó.
 */
function FormularioAlta({
  onCerrar,
  onGuardado,
}: {
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [personas, setPersonas] = useState<UsuarioResumen[]>([])
  const [conCuenta, setConCuenta] = useState(false)
  const [datos, setDatos] = useState({
    idClienteUsuario: '',
    nombreClienteExterno: '',
    contactoClienteExterno: '',
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
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarUsuarios({ pagina: 0 })
      .then((r) => setPersonas(r.contenido))
      .catch(() => setErrorGeneral('No se pudo cargar el listado de personas.'))
  }, [])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.nombreTrack.trim()) locales.nombreTrack = 'Poné el nombre del track.'
    // Espeja `trabajo_cliente_identificado`.
    if (conCuenta && !datos.idClienteUsuario) locales.clienteIdentificado = 'Elegí al cliente.'
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
        idClienteUsuario: conCuenta ? Number(datos.idClienteUsuario) : undefined,
        nombreClienteExterno: conCuenta ? undefined : datos.nombreClienteExterno.trim(),
        contactoClienteExterno: conCuenta
          ? undefined
          : datos.contactoClienteExterno.trim() || undefined,
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
            <CampoSelect
              etiqueta="Cliente"
              value={datos.idClienteUsuario}
              onChange={cambiar('idClienteUsuario')}
              error={errores.clienteIdentificado}
              className="sm:col-span-2"
            >
              <option value="">Elegí…</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </CampoSelect>
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

          <Campo
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
 * El expediente de un trabajo: lo que se edita y lo que se hace.
 *
 * **La diferencia entre las dos mitades es el módulo entero.** Arriba se edita un
 * dato —precio, fechas, links— y se guarda; abajo hay cuatro botones que registran
 * un *hecho*: moví el estado, hice una revisión, entregué el premaster, cobré.
 * Ninguno de los cuatro es un campo del formulario, y esa es la razón por la que
 * **cargar el link del premaster no es entregarlo**: cargarlo es editar, liberarlo
 * es un acto con su propia regla.
 */
function Detalle({
  trabajo,
  puedeEscribir,
  onCambiado,
  onError,
}: {
  trabajo: TrabajoResumen
  puedeEscribir: boolean
  onCambiado: (trabajo: TrabajoResumen) => void
  onError: (mensaje: string) => void
}) {
  const [datos, setDatos] = useState({
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
  const [guardado, setGuardado] = useState(false)
  const [proximoEstado, setProximoEstado] = useState<EstadoTrabajo | ''>('')
  const [rechazoDeLiberacion, setRechazoDeLiberacion] = useState<string | null>(null)
  const [justificando, setJustificando] = useState(false)
  const [cobrando, setCobrando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
      setGuardado(false)
    }
  }

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

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setErrores({})
    try {
      onCambiado(
        await editarTrabajo(trabajo.idTrabajo, {
          tipoTrabajo: datos.tipoTrabajo,
          nombreTrack: datos.nombreTrack.trim(),
          precioAcordado: datos.precioAcordado ? Number(datos.precioAcordado) : undefined,
          moneda: datos.moneda,
          revisionesIncluidas: Number(datos.revisionesIncluidas),
          fechaEstimada: datos.fechaEstimada || undefined,
          fechaEntregaReal: datos.fechaEntregaReal || undefined,
          urlMaterialCliente: datos.urlMaterialCliente.trim() || undefined,
          urlMaster: datos.urlMaster.trim() || undefined,
          urlPremaster: datos.urlPremaster.trim() || undefined,
          notasInternas: datos.notasInternas.trim() || undefined,
        }),
      )
      setGuardado(true)
    } catch (e) {
      if (e instanceof ApiError && e.errores) setErrores(e.errores)
      else onError(e instanceof ApiError ? e.message : 'No se pudo guardar el trabajo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="border-t border-linea px-5 py-5">
      <form onSubmit={guardar} noValidate className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Track"
          required
          value={datos.nombreTrack}
          onChange={cambiar('nombreTrack')}
          error={errores.nombreTrack}
          disabled={!puedeEscribir}
        />
        <CampoSelect
          etiqueta="Tipo"
          value={datos.tipoTrabajo}
          onChange={cambiar('tipoTrabajo')}
          disabled={!puedeEscribir}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_DE_TIPO[t]}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Precio acordado"
          type="number"
          step="0.01"
          value={datos.precioAcordado}
          onChange={cambiar('precioAcordado')}
          error={errores.precioAcordado}
          disabled={!puedeEscribir}
        />
        <CampoSelect
          etiqueta="Moneda"
          value={datos.moneda}
          onChange={cambiar('moneda')}
          disabled={!puedeEscribir}
        >
          <option value="USD">Dólares</option>
          <option value="ARS">Pesos</option>
        </CampoSelect>

        <Campo
          etiqueta="Revisiones incluidas"
          type="number"
          value={datos.revisionesIncluidas}
          onChange={cambiar('revisionesIncluidas')}
          disabled={!puedeEscribir}
        />
        <Campo
          etiqueta="Entrega estimada"
          type="date"
          value={datos.fechaEstimada}
          onChange={cambiar('fechaEstimada')}
          disabled={!puedeEscribir}
        />

        <Campo
          etiqueta="Entrega real"
          type="date"
          value={datos.fechaEntregaReal}
          onChange={cambiar('fechaEntregaReal')}
          disabled={!puedeEscribir}
        />
        <Campo
          etiqueta="Link del material del cliente"
          value={datos.urlMaterialCliente}
          onChange={cambiar('urlMaterialCliente')}
          error={errores.urlMaterialCliente}
          disabled={!puedeEscribir}
        />

        <Campo
          etiqueta="Link del master"
          value={datos.urlMaster}
          onChange={cambiar('urlMaster')}
          error={errores.urlMaster}
          ayuda="El master se entrega para revisión: el cliente lo ve apenas está."
          disabled={!puedeEscribir}
        />
        <Campo
          etiqueta="Link del premaster"
          value={datos.urlPremaster}
          onChange={cambiar('urlPremaster')}
          error={errores.urlPremaster ?? errores.linksConEsquema}
          ayuda="Cargarlo no es entregarlo: el cliente no lo ve hasta que lo liberes."
          disabled={!puedeEscribir}
        />

        <Campo
          etiqueta="Notas internas"
          value={datos.notasInternas}
          onChange={cambiar('notasInternas')}
          ayuda="No las ve el cliente."
          className="sm:col-span-2"
          disabled={!puedeEscribir}
        />

        {puedeEscribir && (
          <div className="flex items-center gap-3 sm:col-span-2">
            <Boton type="submit" disabled={guardando}>
              Guardar cambios
            </Boton>
            {guardado && <span className="text-xs text-tenue">Guardado.</span>}
          </div>
        )}
      </form>

      {puedeEscribir && (
        <div className="mt-6 border-t border-linea pt-5">
          <h4 className="mb-3 t-mono text-tenue">
            Qué pasó con este trabajo
          </h4>

          <div className="flex flex-wrap items-end gap-3">
            <CampoSelect
              etiqueta="Mover a"
              value={proximoEstado}
              onChange={(e) => setProximoEstado(e.target.value as EstadoTrabajo | '')}
              className="min-w-44"
            >
              <option value="">Elegí…</option>
              {ESTADOS.filter((e) => e !== trabajo.estado).map((e) => (
                <option key={e} value={e}>
                  {NOMBRE_DE_ESTADO[e]}
                </option>
              ))}
            </CampoSelect>
            <Boton
              variante="secundario"
              disabled={proximoEstado === ''}
              onClick={() => {
                if (proximoEstado === '') return
                // Si el movimiento no vale, el trigger lo rechaza y el mensaje
                // sube tal cual: la escalera vive en la base, no acá.
                void correr(() => cambiarEstadoDelTrabajo(trabajo.idTrabajo, proximoEstado))
                setProximoEstado('')
              }}
            >
              Mover estado
            </Boton>

            <Boton
              variante="secundario"
              onClick={() => void correr(() => registrarRevision(trabajo.idTrabajo))}
            >
              Registrar una revisión
            </Boton>

            {!trabajo.premasterLiberado && (
              <Boton
                onClick={() =>
                  void correr(() => liberarPremaster(trabajo.idTrabajo), setRechazoDeLiberacion)
                }
              >
                Entregar premaster
              </Boton>
            )}

            <Boton variante="secundario" onClick={() => setCobrando(true)}>
              Registrar cobro
            </Boton>
          </div>

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

          {trabajo.liberadoSinPago && trabajo.motivoLiberacion && (
            <p className="mt-4 text-xs text-acento">
              Liberado sin pago · {trabajo.motivoLiberacion}
            </p>
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
        </div>
      )}
    </div>
  )
}

/**
 * Registrar el cobro de un trabajo.
 *
 * ⚠️ **El pago necesita una cuenta y el trabajo puede no tenerla.**
 * `pago.id_usuario` es NOT NULL, así que un trabajo de un cliente externo se cobra
 * a nombre de alguien del sistema. La pantalla lo dice acá en vez de mandar un
 * pedido que la base va a rechazar — es la misma asimetría que ya tiene la venta
 * de equipos.
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
  const [personas, setPersonas] = useState<UsuarioResumen[]>([])
  const [datos, setDatos] = useState({
    idUsuario: trabajo.idClienteUsuario ? String(trabajo.idClienteUsuario) : '',
    monto: trabajo.precioAcordado?.toString() ?? '',
    moneda: trabajo.moneda,
    cotizacionDolar: '',
    medioPago: 'TRANSFERENCIA' as MedioPago,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarUsuarios({ pagina: 0 })
      .then((r) => setPersonas(r.contenido))
      .catch(() => setError('No se pudo cargar el listado de personas.'))
  }, [])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.idUsuario) locales.idUsuario = 'Decí a nombre de quién queda el pago.'
    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
    if (datos.moneda === 'USD' && !datos.cotizacionDolar) {
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
          idUsuario: Number(datos.idUsuario),
          monto: Number(datos.monto),
          moneda: datos.moneda,
          cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : undefined,
          medioPago: datos.medioPago,
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

      {!trabajo.clienteTieneCuenta && (
        <p className="mb-3 text-xs text-tenue">
          Este cliente no tiene cuenta en el sistema, y un pago siempre queda a nombre de
          alguien. Elegí a quién imputarlo.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="A nombre de"
          value={datos.idUsuario}
          onChange={cambiar('idUsuario')}
          error={errores.idUsuario}
          className="sm:col-span-2"
        >
          <option value="">Elegí…</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} {p.apellido}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Monto"
          type="number"
          step="0.01"
          required
          value={datos.monto}
          onChange={cambiar('monto')}
          error={errores.monto}
        />
        <CampoSelect etiqueta="Moneda" value={datos.moneda} onChange={cambiar('moneda')}>
          <option value="USD">Dólares</option>
          <option value="ARS">Pesos</option>
        </CampoSelect>

        <Campo
          etiqueta="Cotización del dólar"
          type="number"
          step="0.01"
          value={datos.cotizacionDolar}
          onChange={cambiar('cotizacionDolar')}
          error={errores.cotizacionDolar ?? errores.cotizacionPresenteSiEsUsd}
        />
        <CampoSelect etiqueta="Medio" value={datos.medioPago} onChange={cambiar('medioPago')}>
          {MEDIOS_DE_PAGO.map((m) => (
            <option key={m} value={m}>
              {NOMBRE_DE_MEDIO[m]}
            </option>
          ))}
        </CampoSelect>
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
