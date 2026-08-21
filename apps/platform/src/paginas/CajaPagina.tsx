import { useCallback, useEffect, useState } from 'react'

import { caja } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { NOMBRE_DE_MEDIO, type CajaDelPeriodo } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { importe } from '../componentes/dinero'
import { hoy, sumarDias } from '../componentes/semana'

/**
 * Módulo 3, pantalla 3 — la caja del período.
 *
 * <p><b>Pesos y dólares, separados y sin total unificado</b> (§2.3). No es una
 * preferencia contable: unificar exigiría elegir una cotización —¿la de cada
 * pago, la de hoy?— y el número resultante no correspondería a ninguna caja que
 * exista. Ghezz cobra a los del exterior por PayPal y por una cuenta en Estados
 * Unidos, y esa plata no está en el mismo cajón que los pesos.
 *
 * <p>Los egresos van en la misma vista porque *"¿cuánto quedó?"* no se contesta
 * con los ingresos solos — es exactamente el cruce Excel↔Notion que hoy se hace
 * a mano, y el beneficio central que el módulo promete.
 */
export function CajaPagina() {
  const [desde, setDesde] = useState(() => sumarDias(hoy(), -30))
  const [hasta, setHasta] = useState(() => hoy())

  const [cajas, setCajas] = useState<CajaDelPeriodo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setCajas(await caja(desde, hasta))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la caja.')
      // Nunca dejar los números del período anterior en pantalla con un error
      // arriba: se leen como si fueran los pedidos, y una caja equivocada es
      // peor que ninguna.
      setCajas([])
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    void cargar()
  }, [cargar])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">Caja</h2>
        <p className="mt-1 text-sm text-tenue">
          {cargando ? 'Cargando…' : `Del ${legible(desde)} al ${legible(hasta)}`}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Desde"
          type="date"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="w-40"
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="w-40"
        />
        <div className="flex gap-2">
          <Boton
            variante="secundario"
            onClick={() => {
              setDesde(sumarDias(hoy(), -30))
              setHasta(hoy())
            }}
          >
            Últimos 30 días
          </Boton>
          <Boton
            variante="secundario"
            onClick={() => {
              setDesde(primerDiaDelMes())
              setHasta(hoy())
            }}
          >
            Este mes
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {/* Nunca en una sola columna: dos cajas lado a lado dicen visualmente que
          son dos cajas, y eso es la mitad de lo que esta pantalla enseña. */}
      <div className="grid gap-4 md:grid-cols-2">
        {cajas.map((c) => (
          <TarjetaDeCaja key={c.moneda} caja={c} />
        ))}
      </div>
    </div>
  )
}

function TarjetaDeCaja({ caja }: { caja: CajaDelPeriodo }) {
  const sinMovimientos = caja.cantidadDePagos === 0 && caja.cantidadDeEgresos === 0

  return (
    <div className="rounded-lg border border-linea bg-white p-5">
      <h3 className="font-semibold">{caja.moneda === 'USD' ? 'Dólares' : 'Pesos'}</h3>

      {sinMovimientos ? (
        // No se omite la moneda: "en dólares no entró nada este mes" es un dato,
        // y una tarjeta que falta se lee como que el sistema la perdió.
        <p className="mt-4 text-sm text-apagado">Sin movimientos en este período.</p>
      ) : (
        <>
          <p
            className={`mt-1 text-3xl font-semibold tracking-tight ${
              caja.neto < 0 ? 'text-acento' : ''
            }`}
          >
            {importe(caja.neto, caja.moneda)}
          </p>
          <p className="text-xs text-tenue">ingresos menos egresos</p>

          <dl className="mt-4 space-y-1.5 text-sm">
            <Renglon
              etiqueta={`Ingresos (${caja.cantidadDePagos})`}
              valor={importe(caja.ingresos, caja.moneda)}
            />
            <Renglon
              etiqueta={`Egresos (${caja.cantidadDeEgresos})`}
              valor={`− ${importe(caja.egresos, caja.moneda)}`}
            />
            {/* Aparte y con su aclaración: contarlo como ingreso es la forma más
                directa de que la caja diga que hay plata que nadie pagó. */}
            {caja.adeudado > 0 && (
              <Renglon
                etiqueta="Adeudado"
                valor={importe(caja.adeudado, caja.moneda)}
                nota="no entró todavía"
              />
            )}
          </dl>

          {caja.porMedio.length > 0 && (
            <div className="mt-5 border-t border-linea pt-4">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-tenue">
                Por dónde entró
              </h4>
              <dl className="space-y-1.5 text-sm">
                {caja.porMedio.map((m) => (
                  <Renglon
                    key={m.medioPago}
                    etiqueta={`${NOMBRE_DE_MEDIO[m.medioPago]} (${m.cantidad})`}
                    valor={importe(m.monto, caja.moneda)}
                  />
                ))}
              </dl>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Renglon({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string
  valor: string
  nota?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-tenue">
        {etiqueta}
        {nota && <span className="ml-1 text-xs text-apagado">· {nota}</span>}
      </dt>
      <dd className="whitespace-nowrap tabular-nums">{valor}</dd>
    </div>
  )
}

function legible(iso: string): string {
  return iso.split('-').reverse().join('/')
}

function primerDiaDelMes(): string {
  return `${hoy().slice(0, 7)}-01`
}
