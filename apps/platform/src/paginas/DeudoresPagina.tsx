import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { listarDeudores } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { type Deudor, type Moneda, NOMBRE_DE_MOTIVO } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { antiguedad, importe } from '../componentes/dinero'
import { NOMBRE_DE_DISCIPLINA, cuando } from '../componentes/presentacion'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { fecha } from '../componentes/semana'

/**
 * Módulo 3, pantalla 4 — quién debe, cuánto y hace cuántos días.
 *
 * <p><b>Los días de atraso se cuentan desde el renglón más viejo</b>, y esa
 * cuenta la hace el servidor. Si alguien debe desde hace dos meses y ayer se le
 * anotó otra cuota, sigue debiendo desde hace dos meses: contarlo desde el
 * renglón más nuevo haría que la deuda se rejuvenezca sola cada vez que crece,
 * que es lo contrario de lo que esta pantalla existe para mostrar.
 *
 * <p>Lo mismo con {@code vencido}, que espeja la regla dura de §6 —alerta pasados
 * los 7 días—: viene calculado para que el umbral viva en un solo lugar cuando
 * se convierta en la notificación automática.
 *
 * <p>Ordenados por antigüedad y no por monto: la pregunta de Micaela es a quién
 * hay que llamar primero, y esa es la deuda más vieja, no la más grande.
 *
 * <p>⚠️ <b>Una fila por PERSONA, con todo lo que debe adentro</b> (§17 · H9).
 * El servidor manda una fila por deuda —una anotada por moneda, una por
 * programa con saldo— y antes la pantalla las pintaba tal cual, ordenadas por
 * fuente y antigüedad: las cinco deudas de una misma persona quedaban
 * separadas por diez filas de otros. Ignacio pagó una, la de al lado se fue,
 * y la siguiente —que siempre estuvo— pareció recién llegada. Agrupar no cambia
 * la cuenta: cada deuda sigue siendo suya, con su motivo, su plazo y su moneda,
 * y se reclama por separado. Lo que cambia es que se ven juntas, que es lo que
 * hace falta para llamar una sola vez.
 */
export function DeudoresPagina() {
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDeudores(await listarDeudores())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const personas = agruparPorPersona(deudores)
  const vencidos = deudores.filter((d) => d.vencido).length
  const sinSeniar = deudores.filter((d) => d.motivo === 'SIN_SENIAR').length

  return (
    <div>
      <CabeceraDePagina
        titulo="Deudores"
        aclaracion={<>{cargando
            ? 'Cargando…'
            : deudores.length === 0
              ? 'Nadie debe nada'
              : `${personas.length} ${personas.length === 1 ? 'persona' : 'personas'} · ` +
                `${deudores.length} ${deudores.length === 1 ? 'deuda' : 'deudas'}` +
                (vencidos > 0 ? ` · ${vencidos} ${vencidos === 1 ? 'vencida' : 'vencidas'}` : '') +
                (sinSeniar > 0 ? ` · ${sinSeniar} sin señar` : '')}</>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <Tabla columnas={['Quién', 'Contacto', 'Qué debe', { etiqueta: 'Debe', alineacion: 'derecha' }, 'Desde']}>
            {personas.map((p) => (
              <tr key={p.clave} className="align-top">
                <Celda>
                  {/* **El deudor sin cuenta entra igual, pero no se linkea.**
                      Aparece porque una deuda que no está en esta pantalla es una
                      deuda que nadie va a ir a cobrar (`V19`, `mejoras.md` §9.1);
                      no se linkea porque no tiene estado de cuenta al que llevar,
                      y un link a `/estado-de-cuenta/null` es peor que ninguno. */}
                  {p.idUsuario === null ? (
                    <div className="font-medium">
                      {p.nombre}
                      <span className="ml-2 text-xs font-normal text-apagado">sin cuenta</span>
                    </div>
                  ) : (
                    <Link
                      to={`/admin/estado-de-cuenta/${p.idUsuario}`}
                      className="font-medium underline underline-offset-2 hover:text-acento"
                    >
                      {p.apellido}, {p.nombre}
                    </Link>
                  )}
                  {p.deudas.length > 1 && (
                    <div className="text-xs text-tenue">{p.deudas.length} deudas</div>
                  )}
                </Celda>
                <Celda className="text-tenue">
                  {/* El teléfono primero: el reclamo se hace por WhatsApp, que
                      es el canal que el relevamiento marca como el único real.
                      Para el deudor sin cuenta es lo único que hay: el contacto
                      que se anotó al cobrar. */}
                  {p.telefono ?? <span className="text-apagado">Sin teléfono</span>}
                  {p.email && <div className="text-xs">{p.email}</div>}
                </Celda>

                {/* Las tres columnas de la deuda van renglón por renglón, alineadas
                    entre sí: la tercera deuda de la persona es la tercera línea de
                    las tres celdas. Un `<ul>` por celda y no una tabla anidada. */}
                <Celda>
                  <ul className="space-y-1.5">
                    {p.deudas.map((d) => (
                      <li key={claveDeDeuda(d)}>
                        <QueDebe deudor={d} />
                      </li>
                    ))}
                  </ul>
                </Celda>
                <Celda numerica className="whitespace-nowrap">
                  <ul className="space-y-1.5">
                    {p.deudas.map((d) => (
                      <li key={claveDeDeuda(d)} className="font-medium">
                        {importe(d.adeudado, d.moneda)}
                        {/* Vacío a propósito: la línea de abajo de "Qué debe" es el
                            motivo, y acá no hay segunda línea que alinear. */}
                        <div className="text-xs">&nbsp;</div>
                      </li>
                    ))}
                  </ul>
                  {/* El total por moneda sólo cuando hay más de una deuda en ella:
                      con una, el total es el renglón. Nunca entre monedas (§2.3). */}
                  {p.totales.some((t) => t.cantidad > 1) && (
                    <div className="mt-1 border-t border-linea pt-1 text-tenue">
                      {p.totales
                        .filter((t) => t.cantidad > 1)
                        .map((t) => (
                          <div key={t.moneda}>Total {importe(t.monto, t.moneda)}</div>
                        ))}
                    </div>
                  )}
                </Celda>
                <Celda className="whitespace-nowrap">
                  <ul className="space-y-1.5">
                    {p.deudas.map((d) => (
                      <li key={claveDeDeuda(d)}>
                        {/* El saldo de un programa no tiene reloj (P72): se dice desde
                            cuándo, nunca "vencido". */}
                        <span className={d.vencido ? 'font-medium text-acento' : 'text-tenue'}>
                          {antiguedad(d.diasDeAtraso)}
                        </span>
                        <div className="text-xs text-tenue">{fecha(d.desde)}</div>
                      </li>
                    ))}
                  </ul>
                </Celda>
              </tr>
            ))}

            {/* Adentro de la tabla y no debajo: vacía pero con encabezados, se
                ve qué columnas hay y que ninguna tiene filas. Sueltos, no se
                distingue "no hay deudas" de "filtré de más" ni de "no cargó". */}
            {!cargando && deudores.length === 0 && (
              <FilaVacia columnas={5}>Nadie debe nada. Todo al día.</FilaVacia>
            )}
          </Tabla>

    </div>
  )
}

/** Una persona con sus deudas, en el orden en que llegaron (el de antigüedad). */
type PersonaConDeudas = {
  clave: string
  idUsuario: number | null
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  deudas: Deudor[]
  totales: { moneda: Moneda; monto: number; cantidad: number }[]
  /** La deuda más vieja de la persona: decide su lugar en la lista. */
  desde: string
}

/**
 * Agrupa por persona: por el id de la cuenta, o por el nombre para quien no la
 * tiene — dos deudores externos distintos no pueden colapsar en uno (`V19`).
 *
 * **El orden de las personas es el de su deuda más vieja**, que es la pregunta
 * de la pantalla; el orden de las deudas adentro es el que mandó el servidor.
 */
function agruparPorPersona(deudores: Deudor[]): PersonaConDeudas[] {
  const porClave = new Map<string, PersonaConDeudas>()

  for (const d of deudores) {
    const clave = d.idUsuario === null ? `externo:${d.nombre}` : `u:${d.idUsuario}`
    let persona = porClave.get(clave)
    if (!persona) {
      persona = {
        clave,
        idUsuario: d.idUsuario,
        nombre: d.nombre,
        apellido: d.apellido,
        email: d.email,
        telefono: d.telefono,
        deudas: [],
        totales: [],
        desde: d.desde,
      }
      porClave.set(clave, persona)
    }
    persona.deudas.push(d)
    if (d.desde < persona.desde) persona.desde = d.desde
    const total = persona.totales.find((t) => t.moneda === d.moneda)
    if (total) {
      total.monto += d.adeudado
      total.cantidad += 1
    } else {
      persona.totales.push({ moneda: d.moneda, monto: d.adeudado, cantidad: 1 })
    }
  }

  return [...porClave.values()].sort((a, b) => a.desde.localeCompare(b.desde))
}

/** Dentro de una persona, la moneda y la inscripción distinguen sus deudas. */
function claveDeDeuda(d: Deudor): string {
  return `${d.moneda}-${d.idInscripcion ?? 'pago'}`
}

/**
 * De qué se trata cada deuda (P72). Deudores tiene dos fuentes desde la §16 ·
 * Fase 6, y sin esto una preinscripta sin señar y una deuda anotada se leen
 * igual — y son dos llamados distintos. **La preinscripta dice su plazo**, que
 * es lo que decide si hay que llamar; el saldo no dice ninguno porque no lo
 * tiene: se paga antes de empezar, cuando sea.
 */
function QueDebe({ deudor }: { deudor: Deudor }) {
  const que =
    deudor.motivo !== 'DEUDA_ANOTADA'
      ? `Programa de ${NOMBRE_DE_DISCIPLINA[deudor.disciplina!]}`
      : deudor.cantidadDePagos === 1
        ? '1 pago pendiente'
        : `${deudor.cantidadDePagos} pagos pendientes`

  if (deudor.motivo === 'SIN_SENIAR' && deudor.vence) {
    return (
      <>
        <div>
          {que}
          <span className="text-tenue"> · </span>
          <span className={deudor.vencido ? 'font-medium text-acento' : ''}>
            {NOMBRE_DE_MOTIVO.SIN_SENIAR}
          </span>
        </div>
        <div className="text-xs text-tenue">
          {deudor.vencido ? `Venció el ${cuando(deudor.vence)}` : `Hasta el ${cuando(deudor.vence)}`}
        </div>
      </>
    )
  }
  return (
    <>
      <div>{que}</div>
      <div className="text-xs text-tenue">{NOMBRE_DE_MOTIVO[deudor.motivo]}</div>
    </>
  )
}
