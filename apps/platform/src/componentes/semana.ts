import { HORA_APERTURA, HORA_CIERRE } from '../api/tiposAdmin'

/**
 * Las cuentas de fechas y horas del calendario, fuera del componente.
 *
 * Están acá por dos razones. La de forma: exportar funciones desde un archivo de
 * componentes rompe el fast refresh, y oxlint lo avisa. La de fondo: **es la
 * única lógica de esa pantalla que se puede equivocar en silencio**, así que
 * merece tests propios sin tener que montar la grilla entera.
 *
 * <p>Todo se maneja como `YYYY-MM-DD` en hora local y nunca se construye un
 * `Date` desde el string entero: `new Date('2026-08-16')` se interpreta como UTC
 * y en Argentina devuelve el día anterior. Un calendario corrido un día es un
 * calendario roto, y no avisa.
 */

export function hoy(): string {
  return isoDe(new Date())
}

function isoDe(fecha: Date): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

/** Local, componiendo por partes: es lo que evita el corrimiento por UTC. */
function desdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

/** El lunes de la semana a la que pertenece esa fecha. */
export function lunesDe(iso: string): string {
  const fecha = desdeIso(iso)
  // getDay(): 0 es domingo. La semana del estudio arranca el lunes.
  const desplazamiento = (fecha.getDay() + 6) % 7
  fecha.setDate(fecha.getDate() - desplazamiento)
  return isoDe(fecha)
}

export function sumarDias(iso: string, dias: number): string {
  const fecha = desdeIso(iso)
  fecha.setDate(fecha.getDate() + dias)
  return isoDe(fecha)
}

export function diasDesde(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

export function diaYMes(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

export function rangoLegible(dias: string[]): string {
  return `${diaYMes(dias[0])} al ${diaYMes(dias[6])}`
}

/** `10:00:00` → `10:00`. Así serializa un `LocalTime` de Java. */
export function hhmm(hora: string): string {
  return hora.slice(0, 5)
}

export function horaDe(hora: string): number {
  return Number(hora.slice(0, 2))
}

/** `10:30:00` → 630. Para comparar horarios sin construir un `Date`. */
export function minutosDe(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/**
 * Si esa reserva ocupa esa fila de la grilla.
 *
 * <p><b>Ocupar no es empezar.</b> Las clases duran 1:30 (§13), así que la de las
 * 10:00 termina 11:30 y se come media fila más. Dibujarla solo en la fila donde
 * empieza deja la de las 11:00 con pinta de libre — y esa celda, al clickearla,
 * ofrecía cargar algo que la sala ya tenía ocupado. El fin es exclusivo: una de
 * 10:00–11:00 no ocupa la fila 11.
 */
export function ocupaLaHora(
  reserva: { horaInicio: string; horaFin: string },
  hora: number,
): boolean {
  return minutosDe(reserva.horaInicio) < (hora + 1) * 60 && minutosDe(reserva.horaFin) > hora * 60
}

/**
 * Las filas de la grilla: el horario del estudio, **más lo que haga falta** para
 * que ninguna reserva quede sin dibujar.
 *
 * <p>Una reserva cargada fuera de horario que no se dibuja es el peor error
 * posible en un calendario: nadie reporta lo que no ve, y el resultado son dos
 * personas en la misma sala.
 */
export function filasDeHoras(reservas: { horaInicio: string; horaFin: string }[]): number[] {
  let desde = HORA_APERTURA
  let hasta = HORA_CIERRE

  for (const r of reservas) {
    desde = Math.min(desde, horaDe(r.horaInicio))
    // La hora de fin es exclusiva: una reserva 17:00–18:00 no necesita fila 18.
    const fin = r.horaFin.endsWith(':00:00') ? horaDe(r.horaFin) : horaDe(r.horaFin) + 1
    hasta = Math.max(hasta, fin)
  }

  return Array.from({ length: hasta - desde }, (_, i) => desde + i)
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/**
 * ⚠️ Las fechas se parsean a mano y NO con `new Date(iso)`.
 *
 * `new Date('2026-09-03')` se interpreta como medianoche **UTC**, y leído en
 * Buenos Aires (UTC−3) cae el día anterior: toda clase se anunciaría un día
 * antes de cuando es. Es el mismo error que la landing documentó para las
 * fechas de sus notas, del otro lado del repositorio.
 */
function partesDeFecha(iso: string) {
  const [a, m, d] = iso.split('-').map(Number)
  return { a, m, d, fecha: new Date(a, m - 1, d) }
}

export function cuandoEnPalabras(iso: string, hoy: string): string {
  const uno = partesDeFecha(iso).fecha
  const otro = partesDeFecha(hoy).fecha
  const dias = Math.round((uno.getTime() - otro.getTime()) / 86_400_000)

  if (dias === 0) return 'Hoy'
  if (dias === 1) return 'Mañana'
  // Más allá de una semana "en 12 días" ya no ayuda a ubicarse: a esa distancia
  // lo que se usa es el día del mes, que es lo que dice la línea de abajo.
  if (dias > 1 && dias < 7) return `El ${DIAS[uno.getDay()]}`
  if (dias === -1) return 'Ayer'
  if (dias < 0) return 'Ya pasó'
  return `En ${dias} días`
}

export function fechaLarga(iso: string): string {
  const { d, m } = partesDeFecha(iso)
  return `${d} de ${MESES[m - 1]}`
}
