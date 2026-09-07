import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import {
  apartarleLaCabina,
  atenderSolicitante,
  candidatosDeLaFicha,
  darleCuentaAlSolicitante,
  descartarSolicitante,
  listarSalas,
  listarSolicitantes,
  listarTiposUso,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  DONDE_SIGUE,
  etapaDeLaFicha,
  NOMBRE_DE_INTERES,
  NOMBRE_DE_MEDIO,
  type ApartarLaCabina,
  type CabinaApartada,
  type CandidatoDeLaFicha,
  type ConversionRealizada,
  type DestinoDeLaFicha,
  type EstadoSolicitante,
  type MedioPago,
  type Moneda,
  type SalaResumen,
  type SolicitanteResumen,
  type TipoUsoResumen,
} from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque, Hueco } from '../componentes/Bloque'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { Campo, CampoSelect } from '../componentes/Campo'
import { EstadoVacio } from '../componentes/EstadoVacio'
import { Etiqueta } from '../componentes/Etiqueta'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { cuando } from '../componentes/presentacion'
import { fecha } from '../componentes/semana'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import {
  linkDeWhatsapp,
  mensajeConLaClave,
  mensajeDeCabinaApartada,
  saludoDeContacto,
} from '../componentes/whatsapp'

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
 * **Una ficha se cierra cuando produjo lo que pedían** (`V27`, P55). No hay un
 * "marcar como vista" —sería la casilla que se marca sin haber hecho nada, el
 * mismo agujero que `V20` cerró al no darle a este buzón un estado "leído"— ni
 * "darle cuenta" cierra: crear la cuenta es una comodidad para el cliente, no la
 * respuesta a su pedido. La ficha sigue abierta hasta que exista la reserva, la
 * inscripción o la venta, y ahí se cierra apuntando a eso.
 *
 * **La ficha dice a dónde sigue el trámite.** El último paso —la inscripción, la
 * reserva, la venta— ya está construido en las pantallas que Micaela usa todos
 * los días; lo único que faltaba era la puerta de entrada. Por eso aparece el
 * link, en vez de dejar a alguien adivinando cuál de las dieciséis pantallas
 * sigue.
 *
 * **Cerrar la ficha se hace eligiendo, no tipeando un id.** Ver
 * {@link CerrarLaFicha}: es lo que evita que ésta sea la única pantalla del
 * sistema donde hay que copiar un número de otra.
 */
/**
 * Lo que la pantalla ofrece mirar.
 *
 * ⚠️ **`ABIERTAS` no es un estado**: junta lo que nadie contestó con lo que se
 * apartó y todavía no se señó. Es la única pregunta que este buzón existe para
 * contestar —*¿a quién le debemos algo?*— y quien la define de verdad es
 * `FichaAbierta`, del lado del backend, que es la misma que alimenta el contador
 * del sidebar. Antes de `V27` las dos se apagaban al crear la cuenta.
 */
type Filtro = 'ABIERTAS' | 'ATENDIDO' | 'DESCARTADO' | 'TODAS'

const COMO_SE_PIDE: Record<Filtro, { abiertas?: boolean; estado?: EstadoSolicitante }> = {
  ABIERTAS: { abiertas: true },
  ATENDIDO: { estado: 'ATENDIDO' },
  DESCARTADO: { estado: 'DESCARTADO' },
  TODAS: {},
}

export function SolicitantesPagina() {
  const puedeResolver = usePuedeEscribir()

  const [filtro, setFiltro] = useState<Filtro>('ABIERTAS')
  const [pagina, setPagina] = useState(0)
  const [fichas, setFichas] = useState<SolicitanteResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  /** Cuál está abierta para descartar. Una por vez. */
  const [descartando, setDescartando] = useState<number | null>(null)

  /** Cuál está abierta para cerrar apuntando a lo que produjo. Una por vez. */
  const [cerrando, setCerrando] = useState<number | null>(null)

  /** Cuál está abierta para apartarle la cabina. Una por vez. */
  const [apartando, setApartando] = useState<number | null>(null)

  /**
   * La cabina que se acaba de apartar. Va arriba y no en la fila por lo mismo
   * que la cuenta recién creada: lo importante —la contraseña temporal y el
   * plazo— tiene que sobrevivir a que la lista se recargue, y **la ficha ya no
   * está en el filtro por defecto**, porque apartar la cierra.
   */
  const [cabinaApartada, setCabinaApartada] = useState<CabinaApartada | null>(null)

  /**
   * El catálogo de salas y usos. Se pide una vez, no por ficha: son los mismos
   * para todas y pedirlo al abrir cada formulario son N viajes por lo mismo.
   */
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [tiposUso, setTiposUso] = useState<TipoUsoResumen[]>([])

  useEffect(() => {
    if (!puedeResolver) {
      return
    }
    void Promise.all([listarSalas(), listarTiposUso()])
      .then(([s, t]) => {
        setSalas(s)
        setTiposUso(t)
      })
      // Sin catálogo el formulario de apartar no se ofrece, y el resto del buzón
      // funciona igual: contactar, crear la cuenta y descartar no lo necesitan.
      // Vaciar la pantalla entera por esto sería el modo de falla que la Inicio
      // documenta — un bloque muerto no puede apagar los otros ocho.
      .catch(() => {})
  }, [puedeResolver])

  /**
   * La cuenta que se acaba de crear. Se muestra arriba y no adentro de la fila
   * porque lo importante es **la contraseña temporal**, que es la única del
   * sistema que no se puede volver a ver: si la fila se recarga o se filtra, se
   * va con ella. La ficha en sí sigue en la lista (crear la cuenta no la cierra).
   */
  const [cuentaRecienCreada, setRecienConvertida] = useState<ConversionRealizada | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const resultado = await listarSolicitantes({ ...COMO_SE_PIDE[filtro], pagina })
      setFichas(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el buzón.')
    } finally {
      setCargando(false)
    }
  }, [filtro, pagina])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function darleCuenta(ficha: SolicitanteResumen) {
    setError(null)
    try {
      setRecienConvertida(await darleCuentaAlSolicitante(ficha.idSolicitante))
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la cuenta.')
    }
  }

  async function apartar(id: number, datos: Parameters<typeof apartarleLaCabina>[1]) {
    setError(null)
    try {
      setCabinaApartada(await apartarleLaCabina(id, datos))
      setApartando(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo apartar la cabina.')
    }
  }

  async function atender(id: number, destino: DestinoDeLaFicha) {
    setError(null)
    try {
      await atenderSolicitante(id, destino)
      setCerrando(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cerrar la ficha.')
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
            etiqueta="Mostrar"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value as Filtro)
              setPagina(0)
            }}
            className="w-64"
          >
            {/* ⚠️ El primero **no es un estado** sino la pregunta que este buzón
                existe para contestar: ¿a quién le debemos algo? Junta lo que
                nadie contestó con lo que se apartó y todavía no se señó — que
                antes de `V27` desaparecía de la lista al crear la cuenta. */}
            <option value="ABIERTAS">Lo que falta hacer</option>
            <option value="ATENDIDO">Ya atendidas</option>
            <option value="DESCARTADO">Descartadas</option>
            <option value="TODAS">Todas</option>
          </CampoSelect>
        }
      />

      <AvisoSoloLectura />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {cabinaApartada && (
        <CabinaLista resultado={cabinaApartada} onCerrar={() => setCabinaApartada(null)} />
      )}

      {cuentaRecienCreada && (
        <CuentaLista
          resultado={cuentaRecienCreada}
          onCerrar={() => setRecienConvertida(null)}
        />
      )}

      {!cargando && fichas.length === 0 && (
        <EstadoVacio
          titulo={
            filtro === 'ABIERTAS' ? 'No queda nada por hacer.' : 'No hay fichas para mostrar.'
          }
        >
          {filtro === 'ABIERTAS' &&
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

                <Preferencia ficha={f} />
                {f.mensaje && <p className="mt-2 text-sm italic text-tenue">“{f.mensaje}”</p>}

                <div className="mt-1 text-xs text-apagado">Llegó el {cuando(f.fechaCreacion)}</div>
              </div>

              <div className="shrink-0 text-right">
                {/* ⚠️ **Dice la ETAPA y no el estado crudo.** "Atendida" sobre una
                    ficha cuya sala se apartó y nadie señó es cierto y no sirve:
                    lo que quien mira necesita saber es qué falta. La ficha no
                    tiene una vida paralela — muestra el estado de lo que
                    produjo. */}
                <Etiqueta tono={etapaDeLaFicha(f).abierta ? 'atencion' : 'apagada'}>
                  {etapaDeLaFicha(f).texto}
                </Etiqueta>

                {f.estado === 'PENDIENTE' && puedeResolver && (
                  <div className="mt-2 flex flex-wrap justify-end gap-2">
                    {/* Sólo si todavía no tiene: darle cuenta dos veces no rompe
                        nada, pero ofrecerlo cuando ya la tiene es un botón que no
                        hace lo que dice. */}
                    {/* ⚠️ **La acción principal se llama por el trabajo, no por el
                        trámite** (P54). Nadie abre el buzón para regalar cuentas: la
                        acción principal de la pantalla era la secundaria de la
                        realidad, y eso solo ya hacía sentir pesado el recorrido. Para
                        la cabina el botón además *hace* el trabajo — cuenta, reserva
                        apartada y ficha cerrada en un movimiento. Para curso y
                        equipos todavía no existe ese camino, así que sigue diciendo
                        lo que realmente hace. */}
                    {SE_APARTA[f.interes] && salas.length > 0 && (
                      <Boton
                        onClick={() =>
                          setApartando(apartando === f.idSolicitante ? null : f.idSolicitante)
                        }
                      >
                        {SE_APARTA[f.interes]}
                      </Boton>
                    )}

                    {f.idUsuario === null && (
                      <Boton
                        variante={SE_APARTA[f.interes] ? 'secundario' : 'principal'}
                        onClick={() => void darleCuenta(f)}
                      >
                        Crearle la cuenta
                      </Boton>
                    )}

                    {/* ⚠️ **Se ofrece SIEMPRE, tenga cuenta o no.** Condicionarlo a
                        la cuenta la volvería un requisito para cerrar la ficha, que
                        es justo lo que P54 sacó del medio. Sin cuenta no hay
                        candidatos y el panel lo dice — con la salida al lado. */}
                    <Boton
                      variante="secundario"
                      onClick={() =>
                        setCerrando(cerrando === f.idSolicitante ? null : f.idSolicitante)
                      }
                    >
                      Ya se lo cargué
                    </Boton>

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

            {apartando === f.idSolicitante && (
              <div className="mt-4 border-t border-linea pt-4">
                <ApartarLaCabinaForm
                  ficha={f}
                  salas={salas}
                  tiposUso={tiposUso}
                  onCerrar={() => setApartando(null)}
                  onConfirmar={(datos) => void apartar(f.idSolicitante, datos)}
                />
              </div>
            )}

            {cerrando === f.idSolicitante && (
              <div className="mt-4 border-t border-linea pt-4">
                <CerrarLaFicha
                  ficha={f}
                  onCerrar={() => setCerrando(null)}
                  onConfirmar={(destino) => void atender(f.idSolicitante, destino)}
                />
              </div>
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
 * Cuándo le vendría bien, si lo dijo (`V27`, P58).
 *
 * ⚠️ **Se muestra como preferencia y nunca como reserva**, con esas palabras. Es
 * la misma línea que el formulario de la web tiene que sostener: quien pide **no
 * puede** saber si esa franja está libre —la landing no ve disponibilidad, y eso
 * se decidió al dar de baja el retoque §6f.5—, así que leerlo como *"reservó el
 * viernes a las 18"* hace creer que hay algo tomado cuando no hay nada.
 *
 * **Los tres son opcionales por separado**, así que se arma con lo que haya: el
 * que sabe lo que quiere los llena y el botón precarga; el que sólo quería
 * preguntar el precio los deja vacíos y la ficha se lee como antes. **Degrada
 * sola.**
 */
function Preferencia({ ficha }: { ficha: SolicitanteResumen }) {
  const partes = [
    ficha.fechaPreferida && fecha(ficha.fechaPreferida),
    ficha.horaPreferida?.slice(0, 5),
    ficha.duracionMinutos != null &&
      (ficha.duracionMinutos % 60 === 0
        ? `${ficha.duracionMinutos / 60} h`
        : `${ficha.duracionMinutos} min`),
  ].filter(Boolean)

  if (partes.length === 0) {
    return null
  }

  return (
    <div className="mt-1 text-sm text-tenue">
      Le vendría bien: <span className="text-texto">{partes.join(' · ')}</span>
    </div>
  )
}

/**
 * Qué dice el botón principal de cada ficha, y cuáles se pueden apartar de una.
 *
 * ⚠️ **El código del interés y el del tipo de uso son el mismo string**, y no es
 * casualidad que convenga aprovechar: `V20` nombró los intereses por el servicio
 * que se pide y `V2` había nombrado los usos igual. Igual el tipo se busca en el
 * catálogo en vez de confiar en la coincidencia — si algún día dejan de
 * coincidir, el formulario no se ofrece y se ve, en lugar de mandar un id
 * inventado.
 *
 * **Curso y equipos no están, y no es un olvido**: apartar es crear una reserva
 * con su deuda, y para esos dos el camino equivalente —cargar la inscripción,
 * cargar la venta— todavía se hace en su pantalla. Ponerles el nombre del trabajo
 * sin hacer el trabajo sería un botón que miente.
 */
const SE_APARTA: Record<SolicitanteResumen['interes'], string | null> = {
  CURSO: null,
  ALQUILER_CABINA: 'Apartarle la cabina',
  GRABACION_SET: 'Apartarle la sala',
  EQUIPOS: null,
  OTRO: null,
}

/** Las duraciones que se ofrecen. La cabina se alquila por hora, no por minuto. */
const DURACIONES = [60, 90, 120, 180, 240]

/** `2026-09-15T18:00:00-03:00` → `15/09/2026 18:00`. */
function fechaYHora(iso: string): string {
  return `${fecha(iso)} ${iso.slice(11, 16)}`
}

/**
 * Apartarle la cabina sin salir del buzón (`mejoras.md` §15 · Fase 3).
 *
 * ⚠️ **Esto reemplaza un recorrido de tres pantallas**, que es la queja que abrió
 * toda esta sección: crear la cuenta acá, ir al calendario a cargar la reserva,
 * volver a cerrar la ficha. **El paso del medio era el que se perdía** — *"una vez
 * que ponés dar cuenta desaparece el coso, entonces quizás ya te olvidaste qué
 * quería"*.
 *
 * **Los tres campos del horario vienen precargados con lo que la persona pidió**
 * (`V27`, P58), y el formulario lo dice en voz alta. Sin decirlo, una fecha ya
 * escrita se lee como *el sistema decidió esto*, cuando es *esto es lo que pidió y
 * hay que confirmarlo contra la agenda* — que es justamente lo que la web no puede
 * saber, porque no ve disponibilidad.
 *
 * **La sala se elige acá y no se pregunta en la web**, por la matriz
 * `sala_tipo_uso`: ofrecerla allá produciría combinaciones que la base rechaza.
 *
 * **Siempre aparta, nunca cobra.** Quien ya transfirió se carga desde el
 * calendario. Es la misma razón por la que hay dos records y no uno con una
 * bandera: la misma estructura no puede significar dos cosas según un campo.
 */
function ApartarLaCabinaForm({
  ficha,
  salas,
  tiposUso,
  onCerrar,
  onConfirmar,
}: {
  ficha: SolicitanteResumen
  salas: SalaResumen[]
  tiposUso: TipoUsoResumen[]
  onCerrar: () => void
  onConfirmar: (datos: ApartarLaCabina) => void
}) {
  const uso = tiposUso.find((t) => t.codigo === ficha.interes)

  // Sólo las salas que admiten ese uso: la matriz de §2.6 es data y no una lista
  // en el código, y ofrecer una combinación que la base rechaza es hacerle
  // completar un formulario a alguien para después decirle que no.
  const salasPosibles = salas.filter(
    (s) => s.activa && uso && s.usosPermitidos.some((u) => u.idTipoUso === uso.idTipoUso),
  )

  const [idSala, setIdSala] = useState(() => String(salasPosibles[0]?.idSala ?? ''))
  const [dia, setDia] = useState(ficha.fechaPreferida ?? '')
  const [hora, setHora] = useState(ficha.horaPreferida?.slice(0, 5) ?? '')
  const [duracion, setDuracion] = useState(String(ficha.duracionMinutos ?? 60))
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState<Moneda>('ARS')
  const [cotizacion, setCotizacion] = useState('')
  const [medioPago, setMedioPago] = useState<MedioPago>('TRANSFERENCIA')
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useErrorPasajero()

  const pidioAlgo = ficha.fechaPreferida ?? ficha.horaPreferida ?? ficha.duracionMinutos

  if (!uso || salasPosibles.length === 0) {
    return (
      <div>
        <p className="text-sm text-tenue">
          No hay ninguna sala habilitada para eso. Cargá la reserva desde{' '}
          <Link to="/admin/reservas" className="text-acento underline underline-offset-2">
            el Calendario
          </Link>
          .
        </p>
        <Boton className="mt-4" type="button" variante="secundario" onClick={onCerrar}>
          Cerrar
        </Boton>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!dia || !hora) {
          setError('Poné el día y la hora.')
          return
        }
        if (!monto || Number(monto) <= 0) {
          setError('Poné el monto que hay que abonar.')
          return
        }
        if (moneda === 'USD' && !cotizacion) {
          setError('Un importe en dólares necesita la cotización del día.')
          return
        }
        onConfirmar({
          idSala: Number(idSala),
          idTipoUso: uso.idTipoUso,
          fecha: dia,
          horaInicio: hora,
          duracionMinutos: Number(duracion),
          monto: Number(monto),
          moneda,
          cotizacionDolar: cotizacion ? Number(cotizacion) : undefined,
          medioPago,
          mensaje: mensaje.trim() || undefined,
        })
      }}
    >
      <h3 className="t-seccion mb-1">Apartarle {uso.nombre.toLowerCase()}</h3>

      <p className="mb-4 text-sm text-tenue">
        El horario queda tomado y la deuda anotada a nombre de {ficha.nombre}: aparece en{' '}
        <strong className="text-texto">Deudores</strong> hasta que cobres. Tiene{' '}
        <strong className="text-texto">24 horas</strong> para abonar —o hasta que empiece la
        franja, lo que pase antes— y si no, el horario se libera solo.{' '}
        {ficha.idUsuario === null && 'La cuenta se crea en el mismo movimiento.'}
      </p>

      {/* ⚠️ Dice que ESTO ES LO QUE PIDIÓ, y no es cosmética. Una fecha ya escrita
          se lee como una decisión del sistema; lo que es en realidad es una
          preferencia sin confirmar, porque la web no ve disponibilidad (P58). Sin
          esta línea, quien atiende la confirma sin mirar la agenda. */}
      {pidioAlgo != null && (
        <p className="mb-4 text-sm text-acento">
          Precargado con lo que pidió. Confirmalo contra la agenda antes de apartar: desde la web
          no se ve qué está ocupado.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect etiqueta="Sala" value={idSala} onChange={(e) => setIdSala(e.target.value)}>
          {salasPosibles.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </CampoSelect>

        <CampoSelect
          etiqueta="Duración"
          value={duracion}
          onChange={(e) => setDuracion(e.target.value)}
        >
          {DURACIONES.map((m) => (
            <option key={m} value={m}>
              {m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${m % 60} min`}
            </option>
          ))}
        </CampoSelect>

        <Campo etiqueta="Día" type="date" value={dia} onChange={(e) => setDia(e.target.value)} />
        <Campo
          etiqueta="Hora de inicio"
          type="time"
          value={hora}
          onChange={(e) => setHora(e.target.value)}
        />

        <Campo
          etiqueta="Monto a abonar"
          type="number"
          min="1"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
        />
        <CampoSelect
          etiqueta="Moneda"
          value={moneda}
          onChange={(e) => setMoneda(e.target.value as Moneda)}
        >
          <option value="ARS">Pesos</option>
          <option value="USD">Dólares</option>
        </CampoSelect>

        {moneda === 'USD' && (
          <Campo
            etiqueta="Cotización del día"
            type="number"
            min="1"
            step="0.01"
            value={cotizacion}
            onChange={(e) => setCotizacion(e.target.value)}
            ayuda="Sin esto el importe no se puede reconstruir después."
          />
        )}

        <CampoSelect
          etiqueta="Cómo va a pagar"
          value={medioPago}
          onChange={(e) => setMedioPago(e.target.value as MedioPago)}
        >
          {(Object.keys(NOMBRE_DE_MEDIO) as MedioPago[]).map((m) => (
            <option key={m} value={m}>
              {NOMBRE_DE_MEDIO[m]}
            </option>
          ))}
        </CampoSelect>
      </div>

      <Campo
        etiqueta="Mensaje (opcional)"
        className="mt-4"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        placeholder="Te esperamos, vení 10 minutos antes…"
      />

      {error && (
        <div className="mt-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit">Apartar el horario</Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/**
 * Lo que quedó hecho, y lo que hay que mandar ahora.
 *
 * ⚠️ **El plazo se muestra sí o sí.** Lo que se acaba de crear no es una reserva
 * confirmada: es un horario tomado que se libera solo. Un panel que diga *"listo"*
 * sin decir hasta cuándo deja tranquilo a quien atiende, y el que pierde es el
 * cliente que nunca se enteró.
 *
 * **Dos mensajes de WhatsApp y no uno.** El de la reserva habla de lo que hay que
 * hacer ahora —abonar, antes de tal día— y el de la cuenta, de algo que se puede
 * mirar cuando quiera. Juntos, el que importa se lee como un trámite más.
 */
function CabinaLista({
  resultado,
  onCerrar,
}: {
  resultado: CabinaApartada
  onCerrar: () => void
}) {
  const { reserva, usuario, ficha } = resultado
  const cuando = `${fecha(reserva.fecha)} a las ${reserva.horaInicio.slice(0, 5)}`
  const importe = `${resultado.moneda === 'USD' ? 'USD' : '$'} ${resultado.monto}`

  const linkDeLaReserva = reserva.venceEn
    ? linkDeWhatsapp(
        ficha.telefono,
        mensajeDeCabinaApartada(
          usuario.nombre,
          reserva.sala,
          cuando,
          importe,
          fechaYHora(reserva.venceEn),
        ),
      )
    : null

  const linkConLaClave = resultado.passwordTemporal
    ? linkDeWhatsapp(
        ficha.telefono,
        mensajeConLaClave(usuario.nombre, usuario.email, resultado.passwordTemporal),
      )
    : null

  return (
    <Bloque
      titulo={`${reserva.sala} apartada para ${usuario.nombre} ${usuario.apellido}`}
      className="mb-6"
    >
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        {cuando}, de {reserva.horaInicio.slice(0, 5)} a {reserva.horaFin.slice(0, 5)}. Hay que
        abonar {importe}.{' '}
        {reserva.venceEn ? (
          <>
            El horario está tomado hasta el{' '}
            <strong className="text-texto">{fechaYHora(reserva.venceEn)}</strong>: si no abona
            antes, se libera solo. La deuda ya figura en Deudores.
          </>
        ) : (
          'La deuda ya figura en Deudores.'
        )}
      </p>

      {linkDeLaReserva ? (
        <div className="mt-3">
          <EnlaceDeWhatsapp href={linkDeLaReserva}>Avisarle por WhatsApp</EnlaceDeWhatsapp>
        </div>
      ) : (
        <p className="mt-3 text-xs text-apagado">
          El teléfono de la ficha ({ficha.telefono}) no se puede abrir en WhatsApp: copialo y
          buscalo a mano.
        </p>
      )}

      {resultado.cuentaNueva && resultado.passwordTemporal && (
        <>
          <p className="mt-5 text-sm leading-relaxed text-tenue">
            Además le creamos la cuenta.{' '}
            <strong className="text-texto">La contraseña no se puede volver a ver:</strong> si se
            pierde, hay que generar otra desde Personas.
          </p>
          <Hueco className="mt-3 font-mono text-lg tracking-wider">
            {resultado.passwordTemporal}
          </Hueco>
          {linkConLaClave && (
            <div className="mt-3">
              <EnlaceDeWhatsapp href={linkConLaClave}>
                Mandarle la clave por WhatsApp
              </EnlaceDeWhatsapp>
            </div>
          )}
        </>
      )}

      <Boton className="mt-4" onClick={onCerrar}>
        Listo
      </Boton>
    </Bloque>
  )
}

/**
 * Cerrar la ficha diciendo **qué** se le cargó, eligiéndolo de lo que esa
 * persona tiene.
 *
 * ⚠️ **Acá no se tipea un id, y ésa es toda la razón de que este componente
 * exista.** Un `<select>` de tipo más un campo numérico se escribía en veinte
 * líneas y sería el único lugar del sistema donde alguien tiene que copiar un id
 * de otra pantalla — o sea el único donde se puede pegar el equivocado. **Una
 * ficha mal cerrada es peor que una abierta**: la abierta la vuelve a mirar
 * alguien; la cerrada contra la reserva de otro se ve resuelta. Es el mismo
 * criterio por el que el profesor elige *"12/08 10:00 · Clase de DJ"* y nunca un
 * número.
 *
 * **Los candidatos salen de la cuenta de la ficha**, con las consultas que ya
 * definen "lo suyo". Por eso una ficha sin cuenta no tiene ninguno — y el panel
 * lo dice con su salida al lado en vez de mostrar una lista vacía, que se lee
 * como *el sistema perdió los datos*. Es el mismo criterio que los bloques con
 * aviso de la ficha del alumno.
 *
 * **Las filas con reparo —anuladas, canceladas— se ofrecen igual, marcadas.**
 * Esconderlas deja a quien atiende buscando algo que está y no aparece, y el
 * final de esa búsqueda es cerrar la ficha contra cualquier otra cosa.
 */
function CerrarLaFicha({
  ficha,
  onCerrar,
  onConfirmar,
}: {
  ficha: SolicitanteResumen
  onCerrar: () => void
  onConfirmar: (destino: DestinoDeLaFicha) => void
}) {
  const [candidatos, setCandidatos] = useState<CandidatoDeLaFicha[] | null>(null)
  const [elegido, setElegido] = useState<string>('')
  const [error, setError] = useErrorPasajero()

  useEffect(() => {
    let vigente = true
    candidatosDeLaFicha(ficha.idSolicitante)
      .then((lista) => {
        if (vigente) setCandidatos(lista)
      })
      .catch((e) => {
        if (vigente) {
          setCandidatos([])
          setError(e instanceof ApiError ? e.message : 'No se pudo buscar qué cargarle.')
        }
      })
    return () => {
      vigente = false
    }
  }, [ficha.idSolicitante, setError])

  const sigue = DONDE_SIGUE[ficha.interes]

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        const elegida = (candidatos ?? []).find((c) => llave(c) === elegido)
        if (!elegida) {
          setError('Elegí qué se le cargó.')
          return
        }
        onConfirmar({ tipo: elegida.tipo, id: elegida.id })
      }}
    >
      <h3 className="t-seccion mb-1">¿Qué se le cargó?</h3>
      <p className="mb-4 text-sm text-tenue">
        La ficha queda apuntando a eso para siempre: dentro de tres meses se abre y se ve qué salió
        de ella. Por eso no hay un “marcar como atendida”.
      </p>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {candidatos === null ? (
        <p className="text-sm text-tenue">Buscando…</p>
      ) : candidatos.length === 0 ? (
        <p className="text-sm text-tenue">
          {ficha.idUsuario === null ? (
            <>
              Esta ficha todavía no tiene cuenta, y lo que se ofrece acá sale de ella.{' '}
              <strong className="text-texto">Creale la cuenta primero</strong> y después cargale lo
              que pidió.
            </>
          ) : (
            <>
              A esta persona todavía no se le cargó nada.{' '}
              {sigue && (
                <>
                  {sigue.texto} en{' '}
                  <Link to={sigue.ruta} className="text-acento underline underline-offset-2">
                    {NOMBRE_DE_PANTALLA[sigue.ruta]}
                  </Link>{' '}
                  y volvé acá a cerrar la ficha.
                </>
              )}
            </>
          )}
        </p>
      ) : (
        <CampoSelect
          etiqueta="Lo que se le cargó"
          value={elegido}
          onChange={(e) => setElegido(e.target.value)}
        >
          <option value="">Elegí una…</option>
          {candidatos.map((c) => (
            <option key={llave(c)} value={llave(c)}>
              {`${fecha(c.cuando)} · ${c.descripcion}${c.reparo ? ` (${c.reparo})` : ''}`}
            </option>
          ))}
        </CampoSelect>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={!candidatos?.length}>
          Cerrar la ficha
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/**
 * La clave de una opción.
 *
 * **Lleva el tipo y no sólo el id**, porque los ids son de tres tablas distintas:
 * la reserva 7 y la venta 7 existen las dos. Sin el tipo, elegir una cerraría la
 * ficha contra la otra — y el CHECK de `V27` no puede verlo, porque las dos filas
 * son válidas.
 */
function llave(c: CandidatoDeLaFicha): string {
  return `${c.tipo}:${c.id}`
}

/**
 * Lo que la ficha del alumno tiene, pero al revés.
 *
 * Está acá y no en `DONDE_SIGUE` porque ahí la ruta es el dato y el nombre es
 * cómo se dibuja. Antes vivía como un ternario anidado de tres ramas adentro de
 * {@link CuentaLista}, que es donde este mismo mapa se necesitó primero.
 */
const NOMBRE_DE_PANTALLA: Record<string, string> = {
  '/admin/inscripciones': 'Inscripciones',
  '/admin/reservas': 'el Calendario',
  '/admin/ventas': 'Venta de equipos',
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
 * Lo que hay que hacer después de crearle la cuenta.
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
          No hay contraseña que mandarle: entra con la suya. La ficha quedó apuntando a esa cuenta
          y <strong className="text-texto">sigue abierta</strong>: falta cargarle lo que pidió.
        </p>
      )}

      {/* ⚠️ **Y volvé**, que es la mitad que `V27` agregó. Antes el link era el
          final del trámite —crear la cuenta cerraba la ficha—; ahora la ficha
          sigue abierta hasta que exista lo que pidieron, así que la frase tiene
          que decir que hay un paso más y dónde termina. Sin eso, el link manda a
          alguien a otra pantalla y la ficha se queda esperando. */}
      {sigue && (
        <p className="mt-4 text-sm text-tenue">
          {sigue.texto} en{' '}
          <Link to={sigue.ruta} className="text-acento underline underline-offset-2">
            {NOMBRE_DE_PANTALLA[sigue.ruta]}
          </Link>{' '}
          y volvé al buzón a cerrar la ficha con <strong className="text-texto">Ya se lo
          cargué</strong>.
        </p>
      )}

      <Boton className="mt-4" onClick={onCerrar}>
        Listo
      </Boton>
    </Bloque>
  )
}
