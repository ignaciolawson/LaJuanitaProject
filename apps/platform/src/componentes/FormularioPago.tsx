import { useEffect, useState } from 'react'

import {
  adjuntarComprobante,
  agenda,
  listarInscripciones,
  listarVentas,
  registrarPago,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import { listarTrabajos } from '../api/mastering'
import type { TrabajoResumen } from '../api/tiposMastering'
import {
  NOMBRE_DE_ESTADO_PAGO,
  NOMBRE_DE_MEDIO,
  type AlumnoResumen,
  type DestinoDePago,
  type EstadoPago,
  type InscripcionResumen,
  type MedioPago,
  type Moneda,
  type ReservaResumen,
  type UsuarioResumen,
  type VentaResumen,
} from '../api/tiposAdmin'
import { Aviso, Boton } from './Boton'
import { useErrorPasajero } from './aviso'
import { Bloque } from './Bloque'
import { Campo, CampoSelect } from './Campo'
import { NOMBRE_DE_DISCIPLINA } from './presentacion'
import { fecha, hoy } from './semana'
import { importe } from './dinero'
import { BuscadorDePersonas } from './BuscadorDePersonas'
import { SelectorDeAlumno } from './SelectorDeAlumno'

/** Los que se pueden elegir al cargar: un pago no se registra ya anulado. */
const ESTADOS_DE_ALTA: EstadoPago[] = ['PAGADO', 'SENADO', 'DEBE']
const MEDIOS: MedioPago[] = ['EFECTIVO', 'TRANSFERENCIA', 'PAYPAL', 'CUENTA_EEUU', 'OTRO']

/**
 * Lo que Deudores manda cuando abre este formulario sobre una cosa con saldo
 * (P85): la cosa, la persona, la moneda y lo que falta. Con esto el formulario
 * **no pregunta** qué salda ni quién paga —ya se sabe— y sólo pide cómo y
 * cuánto entró. Es el mismo formulario y no una copia: lo que cambia es qué
 * campos hay que llenar.
 */
export type PagoPrellenado = {
  destino: DestinoDePago
  idDestino: number
  /** Cómo se lee la cosa: "Alquiler de cabina en Sala 2, 12/09/2026 14:00". */
  queSalda: string
  /** Cómo se lee la persona. */
  quien: string
  idUsuario: number | null
  nombrePagadorExterno: string | null
  contactoPagadorExterno: string | null
  /** Lo que falta, ya en la moneda de la cosa. */
  monto: number
  moneda: Moneda
}

const DESTINOS = [
  { valor: 'INSCRIPCION', etiqueta: 'Un curso' },
  { valor: 'RESERVA', etiqueta: 'Una reserva de sala' },
  { valor: 'TRABAJO_MASTERING', etiqueta: 'Un trabajo de Mix & Mastering' },
  { valor: 'VENTA_EQUIPO', etiqueta: 'Una venta de equipo' },
] as const

/** Ventana del picker de reservas. El backend corta la agenda en 62 días. */
const DIAS_ATRAS = 45
const DIAS_ADELANTE = 15

function haceDias(dias: number): string {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

/**
 * Registrar un pago.
 *
 * <p><b>Acepta los cuatro destinos desde el 2026-08-29</b>, y eso cierra una deuda
 * que el Módulo 3 dejó anotada a propósito. Antes solo saldaba inscripciones —el
 * formulario era alumno → sus cursos— y los otros tres se cobraban cada uno desde
 * su propia pantalla, en la misma transacción que creaba lo que saldaban. La
 * consecuencia estaba escrita: <b>una venta cargada sin cobro no tenía después por
 * dónde cobrarse</b>. Es el hallazgo #4 de `docs/mejoras.md`.
 *
 * <p><b>La API ya aceptaba los cuatro</b> (`pago_tiene_destino` pide uno, no
 * inscripción): lo que faltaba era acá. Y con `V19` se sumó la otra mitad —
 * <b>quien paga puede no tener cuenta</b>.
 *
 * <h2>Por qué "qué salda" va primero</h2>
 *
 * <p>Porque decide el resto del formulario, y en un caso decide una regla: <b>un
 * curso solo se salda a nombre de la cuenta del alumno</b>. No es un capricho de
 * la pantalla — una `inscripcion` cuelga de un `alumno`, que cuelga de un
 * `usuario`, así que un pago externo se acreditaría en una cuenta que no es de
 * nadie; el backend lo rechaza. Para los otros tres el pagador es libre: quien
 * compra un CDJ por el acuerdo con Pioneer no se registra en un estudio de música,
 * y alguien puede pagar por otro.
 */
export function FormularioPago({
  onCerrar,
  onGuardado,
  inicial,
}: {
  onCerrar: () => void
  onGuardado: () => void
  /** Desde Deudores: la cosa y la persona ya elegidas (P85). */
  inicial?: PagoPrellenado
}) {
  const [destino, setDestino] = useState<DestinoDePago>(inicial?.destino ?? 'INSCRIPCION')
  /** Con un prellenado, la cosa y la persona no se preguntan. */
  const prellenado = inicial !== undefined

  // Catálogos. Cada uno se pide cuando su destino se elige, no todos al abrir:
  // traer la agenda, las ventas y los trabajos para cargar un pago de un curso son
  // tres viajes para llenar selectores que nadie va a abrir.
  /**
   * ⚠️ El alumno y la persona que paga se ELIGEN BUSCANDO, no de un `<select>`
   * (§17 · H8). Los dos desplegables cargaban `pagina: 0` del listado —veinte
   * filas— y el alumno veintiuno no existía para este formulario, sin que nada
   * avisara. `BuscadorDePersonas` lo tenía escrito en su cabecera como el modo
   * de falla que existe para evitar.
   */
  const [alumno, setAlumno] = useState<AlumnoResumen | null>(null)
  const [persona, setPersona] = useState<UsuarioResumen | null>(null)
  const [contratos, setContratos] = useState<InscripcionResumen[]>([])
  const [reservas, setReservas] = useState<ReservaResumen[]>([])
  const [trabajos, setTrabajos] = useState<TrabajoResumen[]>([])
  const [ventas, setVentas] = useState<VentaResumen[]>([])

  const [conCuenta, setConCuenta] = useState(true)
  const [datos, setDatos] = useState({
    idInscripcion: inicial?.destino === 'INSCRIPCION' ? String(inicial.idDestino) : '',
    idReserva: inicial?.destino === 'RESERVA' ? String(inicial.idDestino) : '',
    idTrabajoMastering: inicial?.destino === 'TRABAJO_MASTERING' ? String(inicial.idDestino) : '',
    idVentaEquipo: inicial?.destino === 'VENTA_EQUIPO' ? String(inicial.idDestino) : '',
    nombrePagadorExterno: inicial?.nombrePagadorExterno ?? '',
    contactoPagadorExterno: inicial?.contactoPagadorExterno ?? '',
    monto: inicial ? String(inicial.monto) : '',
    moneda: inicial?.moneda ?? ('ARS' as Moneda),
    cotizacionDolar: '',
    medioPago: 'EFECTIVO' as MedioPago,
    estadoPago: 'PAGADO' as EstadoPago,
    fechaPago: hoy(),
    concepto: '',
    descuentoPorcentaje: '',
    motivoDescuento: '',
  })
  /**
   * El comprobante elegido, si lo hay.
   *
   * **No viaja con el alta**: un archivo no entra en un JSON, así que se sube en
   * un segundo pedido contra el pago recién creado. Se pide acá igual —y no desde
   * el listado— porque quien carga el pago está mirando la transferencia justo en
   * ese momento, que es el argumento entero de `mejoras.md` §9.9.
   */
  const [comprobante, setComprobante] = useState<File | null>(null)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  const esCurso = destino === 'INSCRIPCION'

  // Las inscripciones del alumno elegido: son las que puede saldar.
  useEffect(() => {
    if (!alumno || prellenado) {
      setContratos([])
      return
    }
    listarInscripciones({ idAlumno: alumno.idAlumno })
      .then((r) => setContratos(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar las inscripciones.'))
  }, [alumno, prellenado, setErrorGeneral])

  useEffect(() => {
    if (destino !== 'RESERVA' || prellenado) return
    agenda({ desde: haceDias(DIAS_ATRAS), hasta: haceDias(-DIAS_ADELANTE) })
      .then(setReservas)
      .catch(() => setErrorGeneral('No se pudo cargar la agenda.'))
  }, [destino, prellenado, setErrorGeneral])

  useEffect(() => {
    if (destino !== 'TRABAJO_MASTERING' || prellenado) return
    listarTrabajos({ pagina: 0 })
      .then((r) => setTrabajos(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar los trabajos.'))
  }, [destino, prellenado, setErrorGeneral])

  useEffect(() => {
    if (destino !== 'VENTA_EQUIPO' || prellenado) return
    listarVentas({ pagina: 0 })
      .then((r) => setVentas(r.contenido))
      .catch(() => setErrorGeneral('No se pudieron cargar las ventas.'))
  }, [destino, prellenado, setErrorGeneral])

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  const contratoElegido = contratos.find((i) => String(i.idInscripcion) === datos.idInscripcion)

  // La moneda sigue al contrato (`V31`): al elegir el curso, se fija.
  useEffect(() => {
    if (contratoElegido) {
      setDatos((previo) =>
        previo.moneda === contratoElegido.moneda ? previo : { ...previo, moneda: contratoElegido.moneda },
      )
    }
  }, [contratoElegido])

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}

    if (prellenado) {
      // La cosa y la persona vinieron de Deudores: no hay nada que elegir.
    } else if (esCurso) {
      if (!alumno) locales.idAlumno = 'Elegí de quién es el pago.'
      if (!datos.idInscripcion) locales.destinoUnico = 'Elegí qué curso salda este pago.'
    } else {
      if (destino === 'RESERVA' && !datos.idReserva) {
        locales.destinoUnico = 'Elegí qué reserva salda este pago.'
      }
      if (destino === 'TRABAJO_MASTERING' && !datos.idTrabajoMastering) {
        locales.destinoUnico = 'Elegí qué trabajo salda este pago.'
      }
      if (destino === 'VENTA_EQUIPO' && !datos.idVentaEquipo) {
        locales.destinoUnico = 'Elegí qué venta salda este pago.'
      }
      // Espeja `pago_pagador_identificado` (`V19`): cuenta o nombre escrito.
      if (conCuenta && !persona) locales.pagadorIdentificado = 'Elegí quién paga.'
      if (!conCuenta && !datos.nombrePagadorExterno.trim()) {
        locales.pagadorIdentificado = 'Escribí el nombre de quien paga.'
      }
    }

    if (!datos.monto || Number(datos.monto) <= 0) locales.monto = 'Poné un monto mayor a cero.'
    if (datos.moneda === 'USD' && !datos.cotizacionDolar) {
      locales.cotizacionPresenteSiEsUsd = 'Un pago en dólares necesita la cotización del día.'
    }
    if (Number(datos.descuentoPorcentaje) > 0 && !datos.motivoDescuento.trim()) {
      locales.descuentoJustificado = 'Un descuento necesita una justificación escrita.'
    }
    if (Number(datos.descuentoPorcentaje) > 100) {
      locales.descuentoPorcentaje = 'El descuento es un porcentaje: no puede pasar de 100.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      const creado = await registrarPago({
        // Un curso va siempre a nombre del alumno: es la regla del backend, no
        // una comodidad del formulario.
        idUsuario: inicial
          ? (inicial.idUsuario ?? undefined)
          : esCurso
            ? alumno!.idUsuario
            : conCuenta
              ? persona!.id
              : undefined,
        nombrePagadorExterno: inicial
          ? (inicial.idUsuario === null ? datos.nombrePagadorExterno.trim() : undefined)
          : esCurso || conCuenta
            ? undefined
            : datos.nombrePagadorExterno.trim(),
        contactoPagadorExterno: inicial
          ? (inicial.idUsuario === null ? datos.contactoPagadorExterno.trim() || undefined : undefined)
          : esCurso || conCuenta
            ? undefined
            : datos.contactoPagadorExterno.trim() || undefined,

        // Exactamente uno de los cuatro: `pago_tiene_destino`.
        idInscripcion: esCurso ? Number(datos.idInscripcion) : undefined,
        idReserva: destino === 'RESERVA' ? Number(datos.idReserva) : undefined,
        idTrabajoMastering:
          destino === 'TRABAJO_MASTERING' ? Number(datos.idTrabajoMastering) : undefined,
        idVentaEquipo: destino === 'VENTA_EQUIPO' ? Number(datos.idVentaEquipo) : undefined,

        monto: Number(datos.monto),
        moneda: datos.moneda,
        cotizacionDolar: datos.cotizacionDolar ? Number(datos.cotizacionDolar) : null,
        medioPago: datos.medioPago,
        estadoPago: datos.estadoPago,
        fechaPago: datos.fechaPago,
        concepto: datos.concepto || undefined,
        descuentoPorcentaje: datos.descuentoPorcentaje
          ? Number(datos.descuentoPorcentaje)
          : undefined,
        motivoDescuento: datos.motivoDescuento || undefined,
      })

      // El pago ya entró: si el archivo falla, lo que se avisa es eso y no que
      // falló el pago. Adjuntarlo después, desde la fila, sigue disponible.
      if (comprobante) {
        try {
          await adjuntarComprobante(creado.idPago, comprobante)
        } catch (e) {
          setErrorGeneral(
            e instanceof ApiError
              ? `El pago quedó registrado, pero el comprobante no: ${e.message}`
              : 'El pago quedó registrado, pero el comprobante no se pudo subir.',
          )
          setEnviando(false)
          return
        }
      }

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
    <Bloque titulo={inicial ? 'Registrar lo que falta' : 'Registrar pago'} className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        {errorGeneral && (
          <div className="mb-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Desde Deudores la cosa y la persona vienen elegidas (P85): se dicen,
              no se preguntan. El monto sí se edita — puede entrar una parte. */}
          {inicial && (
            <p className="text-sm sm:col-span-2">
              Salda <strong>{inicial.queSalda}</strong>
              <span className="text-tenue"> · de </span>
              <strong>{inicial.quien}</strong>
              <span className="block text-xs text-tenue">
                Faltan {importe(inicial.monto, inicial.moneda)}. Si entra una parte, cambiá el monto.
              </span>
            </p>
          )}

          {/* Va primero porque decide el resto del formulario. */}
          {!prellenado && (
          <CampoSelect
            etiqueta="Qué salda"
            value={destino}
            onChange={(e) => {
              setDestino(e.target.value as DestinoDePago)
              setErrores({})
            }}
            className="sm:col-span-2"
          >
            {DESTINOS.map((d) => (
              <option key={d.valor} value={d.valor}>
                {d.etiqueta}
              </option>
            ))}
          </CampoSelect>
          )}

          {!prellenado && esCurso && (
            <>
              <SelectorDeAlumno
                elegido={alumno}
                onElegir={(a) => {
                  setAlumno(a)
                  setDatos((previo) => ({ ...previo, idInscripcion: '' }))
                }}
                error={errores.idAlumno}
                autoFocus={false}
              />

              <CampoSelect
                etiqueta="Cuál curso"
                value={datos.idInscripcion}
                onChange={cambiar('idInscripcion')}
                error={errores.destinoUnico}
              >
                <option value="">
                  {alumno ? 'Elegí el curso' : 'Elegí primero el alumno'}
                </option>
                {contratos.map((i) => (
                  <option key={i.idInscripcion} value={i.idInscripcion}>
                    {NOMBRE_DE_DISCIPLINA[i.disciplina]}
                    {i.nivel ? ` · ${i.nivel.toLowerCase()}` : ''} — {importe(i.precioTotal, i.moneda)}
                  </option>
                ))}
              </CampoSelect>
            </>
          )}

          {!prellenado && destino === 'RESERVA' && (
            <CampoSelect
              etiqueta="Cuál reserva"
              value={datos.idReserva}
              onChange={cambiar('idReserva')}
              error={errores.destinoUnico}
              className="sm:col-span-2"
            >
              <option value="">Elegí una</option>
              {reservas.map((r) => (
                <option key={r.idReserva} value={r.idReserva}>
                  {fecha(r.fecha)} {r.horaInicio.slice(0, 5)} · {r.sala} · {r.tipoUso}
                </option>
              ))}
            </CampoSelect>
          )}

          {!prellenado && destino === 'TRABAJO_MASTERING' && (
            <CampoSelect
              etiqueta="Cuál trabajo"
              value={datos.idTrabajoMastering}
              onChange={cambiar('idTrabajoMastering')}
              error={errores.destinoUnico}
              className="sm:col-span-2"
            >
              <option value="">Elegí uno</option>
              {trabajos.map((t) => (
                <option key={t.idTrabajo} value={t.idTrabajo}>
                  {t.nombreTrack} — {t.cliente}
                  {t.precioAcordado ? ` · ${importe(t.precioAcordado, t.moneda)}` : ''}
                </option>
              ))}
            </CampoSelect>
          )}

          {!prellenado && destino === 'VENTA_EQUIPO' && (
            <CampoSelect
              etiqueta="Cuál venta"
              value={datos.idVentaEquipo}
              onChange={cambiar('idVentaEquipo')}
              error={errores.destinoUnico}
              className="sm:col-span-2"
            >
              <option value="">Elegí una</option>
              {ventas.map((v) => (
                <option key={v.idVenta} value={v.idVenta}>
                  {v.modeloEquipo} — {v.comprador} · {importe(v.precio, v.moneda)}
                </option>
              ))}
            </CampoSelect>
          )}

          {/* Quién paga. Para un curso no se pregunta: es el alumno, y el backend
              lo exige. Para los otros tres es libre, y desde `V19` puede no tener
              cuenta. */}
          {prellenado ? null : esCurso ? (
            <p className="text-xs leading-relaxed text-tenue sm:col-span-2">
              El pago va a nombre del alumno: un curso se acredita en su cuenta y no
              en otra.
            </p>
          ) : (
            <>
              <div className="sm:col-span-2">
                <span className="mb-2 block text-sm font-medium">Quién paga</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pagador"
                      checked={conCuenta}
                      onChange={() => setConCuenta(true)}
                    />
                    Tiene cuenta
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="pagador"
                      checked={!conCuenta}
                      onChange={() => setConCuenta(false)}
                    />
                    No tiene cuenta
                  </label>
                </div>
                {errores.pagadorIdentificado && (
                  <p className="mt-1 text-xs text-red">{errores.pagadorIdentificado}</p>
                )}
              </div>

              {conCuenta ? (
                <div className="sm:col-span-2">
                  <BuscadorDePersonas
                    elegida={persona}
                    onElegir={setPersona}
                    etiqueta="Persona"
                  />
                </div>
              ) : (
                <>
                  <Campo
                    etiqueta="Nombre de quien paga"
                    value={datos.nombrePagadorExterno}
                    onChange={cambiar('nombrePagadorExterno')}
                  />
                  <Campo
                    etiqueta="Contacto"
                    value={datos.contactoPagadorExterno}
                    onChange={cambiar('contactoPagadorExterno')}
                  />
                </>
              )}
            </>
          )}

          <Campo
            etiqueta="Monto"
            type="number"
            step="0.01"
            value={datos.monto}
            onChange={cambiar('monto')}
            error={errores.monto}
            // Desde Deudores es lo único que hay que mirar: el cursor va ahí.
            autoFocus={prellenado}
          />

          {/* ⚠️ Con un curso elegido la moneda es la del contrato y no se elige
              (`V31`, P74): un pago en otra moneda no lo cancela —el sistema no
              convierte— y el backend lo rechaza. Ofrecer el selector era
              ofrecer el bug de §17 · H4. */}
          {(esCurso && contratoElegido) || inicial ? (
            <div>
              <span className="t-mono text-tenue">Moneda</span>
              <div className="mt-1.5 py-2 text-sm">
                {datos.moneda === 'USD' ? 'Dólares' : 'Pesos'}
                <span className="text-tenue">
                  {' '}— la {inicial && inicial.destino !== 'INSCRIPCION' ? 'de lo que salda' : 'del contrato'}
                </span>
              </div>
            </div>
          ) : (
            <CampoSelect etiqueta="Moneda" value={datos.moneda} onChange={cambiar('moneda')}>
              <option value="ARS">Pesos</option>
              <option value="USD">Dólares</option>
            </CampoSelect>
          )}

          {datos.moneda === 'USD' && (
            <Campo
              etiqueta="Cotización del dólar"
              type="number"
              step="0.01"
              value={datos.cotizacionDolar}
              onChange={cambiar('cotizacionDolar')}
              error={errores.cotizacionPresenteSiEsUsd}
            />
          )}

          <CampoSelect etiqueta="Cómo pagó" value={datos.medioPago} onChange={cambiar('medioPago')}>
            {MEDIOS.map((m) => (
              <option key={m} value={m}>
                {NOMBRE_DE_MEDIO[m]}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect etiqueta="Estado" value={datos.estadoPago} onChange={cambiar('estadoPago')}>
            {ESTADOS_DE_ALTA.map((e) => (
              <option key={e} value={e}>
                {NOMBRE_DE_ESTADO_PAGO[e]}
              </option>
            ))}
          </CampoSelect>

          <Campo
            etiqueta="Fecha del pago"
            type="date"
            value={datos.fechaPago}
            onChange={cambiar('fechaPago')}
          />

          <Campo etiqueta="Concepto" value={datos.concepto} onChange={cambiar('concepto')} />

          <Campo
            etiqueta="Descuento (%)"
            type="number"
            step="0.01"
            value={datos.descuentoPorcentaje}
            onChange={cambiar('descuentoPorcentaje')}
            error={errores.descuentoPorcentaje}
          />

          <Campo
            etiqueta="Por qué el descuento"
            value={datos.motivoDescuento}
            onChange={cambiar('motivoDescuento')}
            error={errores.descuentoJustificado}
          />

          <div className="sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-tenue">
              Comprobante (opcional)
            </span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              aria-label="Comprobante"
              onChange={(e) => setComprobante(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-tenue"
            />
            <p className="mt-1 text-xs text-apagado">
              {/* Opcional a propósito: una seña en efectivo no tiene ninguno, y
                  exigirlo dejaría media caja sin poder cargarse. */}
              PDF o foto. Se puede adjuntar después, y un pago admite varios.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Registrar'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar} disabled={enviando}>
            Cancelar
          </Boton>
        </div>
          </form>
    </Bloque>
  )
}
