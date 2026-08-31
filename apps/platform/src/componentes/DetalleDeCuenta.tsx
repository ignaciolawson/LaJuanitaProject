import {
  NOMBRE_DE_ESTADO_PAGO,
  NOMBRE_DE_MEDIO,
  type ComprobanteResumen,
  type EstadoDeCuenta,
  type PagoResumen,
} from '../api/tiposAdmin'
import { Comprobantes } from './Comprobantes'
import { importe } from './dinero'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from './presentacion'
import { Tabla, Celda } from '../componentes/Tabla'

/**
 * Las tres partes de un estado de cuenta: saldos por moneda, qué se contrató y
 * los movimientos.
 *
 * **Salió de `EstadoDeCuentaPagina` a un componente compartido con el Módulo 4**,
 * cuando el portal empezó a mostrarle a cada uno su propia cuenta. Es el mismo
 * DTO y tiene que ser la misma lectura: dos versiones del mismo saldo son la
 * forma más fácil de que un día no coincidan, y de las dos la que se equivoca es
 * siempre la que ve el cliente.
 *
 * Lo único que cambia entre las dos pantallas es el encabezado —administración
 * muestra de quién es la cuenta, el portal no necesita decírtelo—, así que eso
 * queda afuera.
 *
 * **No hay un saldo único, y no puede haberlo** (§3.3): un alumno puede tener el
 * curso de DJ al día y el de producción con deuda, uno en pesos y otro en
 * dólares. Las monedas nunca se restan entre sí (§2.3) — unificarlas exigiría
 * elegir una cotización y el número no correspondería a ninguna caja real.
 */
export function DetalleDeCuenta({
  cuenta,
  onVerComprobante,
}: {
  cuenta: EstadoDeCuenta
  /**
   * Cómo se baja un comprobante. **Lo pone cada pantalla y no este componente**,
   * porque es lo único que de verdad cambia entre las dos: administración lo pide
   * por el endpoint del pago y el alumno por `/api/me/**`, donde el id del dueño
   * sale del token. Un solo camino con un permiso más flojo seria la forma de
   * romper el eje de identidad del Módulo 4 sin que nada falle.
   */
  onVerComprobante: (pago: PagoResumen, comprobante: ComprobanteResumen) => void
}) {
  return (
    <>
    {/* 1. Los saldos, por moneda */}
    <section className="mb-8">
      <h3 className="mb-3 t-mono text-tenue">
        Saldos
      </h3>
      {cuenta.saldos.length === 0 ? (
        <p className="text-sm text-apagado">Todavía no tiene movimientos.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cuenta.saldos.map((s) => (
            <div key={s.moneda} className="rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
              <h4 className="font-semibold">{s.moneda === 'USD' ? 'Dólares' : 'Pesos'}</h4>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {importe(s.pagado, s.moneda)}
              </p>
              <p className="text-xs text-tenue">pagado</p>
              {s.adeudado > 0 && (
                <p className="mt-3 text-sm text-acento">
                  Debe {importe(s.adeudado, s.moneda)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>

    {/* 2. Los contratos */}
    <section className="mb-8">
      <h3 className="mb-3 t-mono text-tenue">
        Qué contrató
      </h3>
      {cuenta.contratos.length === 0 ? (
        <p className="text-sm text-apagado">No tiene inscripciones.</p>
      ) : (
        <Tabla
          columnas={[
            'Curso',
            { etiqueta: 'Precio', alineacion: 'derecha' },
            { etiqueta: 'Pagado', alineacion: 'derecha' },
            { etiqueta: 'Saldo', alineacion: 'derecha' },
            'Estado',
            'Comprobante',
          ]}
        >
              {cuenta.contratos.map((c) => (
                <tr key={c.idInscripcion}>
                  <Celda>
                    <div className="font-medium">{NOMBRE_DE_DISCIPLINA[c.disciplina]}</div>
                    <div className="text-xs text-tenue">
                      {c.nivel ? capitalizar(c.nivel) : 'Sin nivel'} ·{' '}
                      {capitalizar(c.estado)}
                    </div>
                  </Celda>
                  <Celda numerica className="whitespace-nowrap text-tenue">
                    {importe(c.precioTotal, c.moneda)}
                  </Celda>
                  <Celda numerica className="whitespace-nowrap">
                    {importe(c.pagado, c.moneda)}
                  </Celda>
                  <Celda numerica className="whitespace-nowrap">
                    <span className={c.saldo > 0 ? 'font-medium text-acento' : 'text-tenue'}>
                      {importe(c.saldo, c.moneda)}
                    </span>
                  </Celda>
                  <Celda>
                    {c.saldado ? (
                      <span className="text-xs text-tenue">Saldado</span>
                    ) : c.senado ? (
                      // §13: con el 50% cubierto ya se puede reservar. Es el
                      // dato que Micaela necesita antes de dar un horario.
                      <span className="text-xs text-tenue">Seña cubierta</span>
                    ) : (
                      <span className="text-xs text-acento">Sin seña</span>
                    )}
                  </Celda>
                </tr>
              ))}
            </Tabla>
      )}
    </section>

    {/* 3. Los movimientos */}
    <section>
      <h3 className="mb-3 t-mono text-tenue">
        Movimientos ({cuenta.pagos.length})
      </h3>
      {cuenta.pagos.length === 0 ? (
        <p className="text-sm text-apagado">Sin pagos registrados.</p>
      ) : (
        <Tabla columnas={['Fecha', 'Qué salda', { etiqueta: 'Monto', alineacion: 'derecha' }, 'Medio', 'Estado']}>
              {cuenta.pagos.map((p) => (
                <tr key={p.idPago} className={p.estadoPago === 'ANULADO' ? 'text-apagado' : ''}>
                  <Celda className="whitespace-nowrap text-tenue">
                    {p.fechaPago.split('-').reverse().join('/')}
                  </Celda>
                  <Celda>
                    <div>{p.queSalda}</div>
                    {p.concepto && <div className="text-xs text-tenue">{p.concepto}</div>}
                  </Celda>
                  <Celda
                    numerica
                    className={`whitespace-nowrap ${
                      p.estadoPago === 'ANULADO' ? 'line-through' : ''
                    }`}
                  >
                    {importe(p.monto, p.moneda)}
                  </Celda>
                  <Celda className="text-tenue">{NOMBRE_DE_MEDIO[p.medioPago]}</Celda>
                  <Celda>
                    <div className="text-xs">{NOMBRE_DE_ESTADO_PAGO[p.estadoPago]}</div>
                    {/* El motivo se muestra: una fila anulada sin explicación
                        obliga a preguntarle a quien la anuló, que es
                        exactamente lo que `V7` quiso evitar al exigirlo. */}
                    {p.motivoAnulacion && (
                      <div className="text-xs text-apagado">{p.motivoAnulacion}</div>
                    )}
                  </Celda>
                  {/* El alumno baja su comprobante: es la pantalla que el Módulo 4
                      dejó anotada como pendiente esperando al `StorageService`.
                      De solo lectura en las dos vistas — invalidarlo es una
                      decisión de administración y vive en el listado de pagos. */}
                  <Celda className="align-top">
                    <Comprobantes
                      comprobantes={p.comprobantes}
                      onVer={(c) => onVerComprobante(p, c)}
                    />
                  </Celda>
                </tr>
              ))}
            </Tabla>
      )}
    </section>
    </>
  )
}
