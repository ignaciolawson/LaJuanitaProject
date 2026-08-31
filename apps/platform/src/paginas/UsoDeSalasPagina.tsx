import { useCallback, useEffect, useMemo, useState } from 'react'

import { listarSalas, usoDeSalas } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { SalaResumen, UsoDeSala } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo } from '../componentes/Campo'
import { hoy, sumarDias } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

/**
 * Módulo 2, pantalla 4 — cuánto se usó cada sala en un período.
 *
 * <p><b>Una sala que no se usó aparece igual, en cero.</b> Es la misma decisión
 * que toma el perfil del alumno con los bloques que todavía no existen, y acá
 * pesa más: el cero es justo el número que se viene a buscar cuando la pregunta
 * es si conviene alquilar la sala. Una fila ausente se lee como que el sistema
 * perdió el dato.
 *
 * <p>Las canceladas y las reprogramadas se muestran <b>aparte y no suman
 * horas</b>. Una sala con veinte clases dictadas y una con veinte canceladas no
 * se usaron igual, y sumarlas juntas borraría el dato del informe.
 */
export function UsoDeSalasPagina() {
  const [desde, setDesde] = useState(() => sumarDias(hoy(), -30))
  const [hasta, setHasta] = useState(() => hoy())
  const [idSala, setIdSala] = useState<number | ''>('')

  const [uso, setUso] = useState<UsoDeSala[]>([])
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Las inactivas también: un período pasado puede tener adentro una sala que
    // hoy ya no se usa, y el filtro tiene que poder nombrarla.
    listarSalas(true)
      .then(setSalas)
      .catch(() => setError('No se pudo cargar el catálogo de salas.'))
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setUso(await usoDeSalas({ desde, hasta, idSala: idSala === '' ? undefined : idSala }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el informe.')
      // Sin esto queda en pantalla el informe del período anterior con el
      // mensaje de error arriba, que se lee como si esos números fueran los
      // pedidos. Un informe equivocado es peor que ninguno.
      setUso([])
    } finally {
      setCargando(false)
    }
  }, [desde, hasta, idSala])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const totalDeHoras = useMemo(() => uso.reduce((suma, u) => suma + u.horas, 0), [uso])

  return (
    <div>
      <CabeceraDePagina
        titulo="Uso de las salas"
        aclaracion={<>{cargando
            ? 'Cargando…'
            : `${horas(totalDeHoras)} en total, del ${legible(desde)} al ${legible(hasta)}`}</>}
      />

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
        <select
          value={idSala}
          onChange={(e) => setIdSala(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label="Filtrar por sala"
          className="rounded-md border border-linea bg-superficie px-3 py-2.5 text-sm outline-none focus:border-red"
        >
          <option value="">Todas las salas</option>
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => periodo(30, setDesde, setHasta)}>
            Últimos 30 días
          </Boton>
          <Boton variante="secundario" onClick={() => periodo(90, setDesde, setHasta)}>
            90 días
          </Boton>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {uso.map((u) => (
          <TarjetaDeSala key={u.idSala} uso={u} maximo={totalDeHoras} />
        ))}
      </div>
    </div>
  )
}

function TarjetaDeSala({ uso, maximo }: { uso: UsoDeSala; maximo: number }) {
  const sinUso = uso.reservas === 0

  return (
    <div className="rounded-lg border border-linea bg-superficie p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="t-seccion">
          {uso.sala}
          {!uso.activa && <span className="ml-2 text-xs font-normal text-apagado">(inactiva)</span>}
        </h3>
        <span className="text-sm text-tenue">
          {uso.reservas} {uso.reservas === 1 ? 'reserva' : 'reservas'}
        </span>
      </div>

      <p className="mt-1 text-2xl font-semibold tracking-tight">{horas(uso.horas)}</p>

      {/* La proporción sobre el total del período: es lo que contesta "¿cuál se
          usa más?" de un vistazo, que es para lo que se abre esta pantalla. */}
      {maximo > 0 && (
        <p className="text-xs text-tenue">{Math.round((uso.horas / maximo) * 100)}% del total</p>
      )}

      {sinUso ? (
        // No se omite la sala ni se deja el bloque vacío: "no se usó" es el dato.
        <p className="mt-4 text-sm text-apagado">No se usó en este período.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {uso.porTipo.map((t) => (
            <li key={t.idTipoUso} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 truncate">
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: t.color ?? '#999' }}
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  />
                  <span className="truncate">{t.tipoUso}</span>
                </span>
                <span className="whitespace-nowrap text-tenue">{horas(t.horas)}</span>
              </div>
              <div className="mt-1 h-1 rounded bg-superficie-2">
                <div
                  style={{
                    width: `${uso.horas > 0 ? (t.horas / uso.horas) * 100 : 0}%`,
                    backgroundColor: t.color ?? '#999',
                  }}
                  className="h-1 rounded"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Lo que se cayó va abajo y en otro tono: no es uso, pero tampoco se
          esconde — una sala con muchas cancelaciones es un dato en sí mismo. */}
      {(uso.canceladas > 0 || uso.reprogramadas > 0) && (
        <p className="mt-4 border-t border-linea pt-3 text-xs text-apagado">
          {[
            uso.canceladas > 0 && `${uso.canceladas} cancelada${uso.canceladas === 1 ? '' : 's'}`,
            uso.reprogramadas > 0 &&
              `${uso.reprogramadas} reprogramada${uso.reprogramadas === 1 ? '' : 's'}`,
          ]
            .filter(Boolean)
            .join(' · ')}
          {' · no cuentan como uso'}
        </p>
      )}
    </div>
  )
}

/** `1.5` → `1 h 30 min`. Un "1,5 h" obliga a hacer la cuenta de cabeza. */
function horas(cantidad: number): string {
  const minutos = Math.round(cantidad * 60)
  const enteras = Math.floor(minutos / 60)
  const resto = minutos % 60

  if (enteras === 0) return `${resto} min`
  if (resto === 0) return `${enteras} h`
  return `${enteras} h ${resto} min`
}

function legible(iso: string): string {
  return iso.split('-').reverse().join('/')
}

function periodo(dias: number, setDesde: (v: string) => void, setHasta: (v: string) => void) {
  setDesde(sumarDias(hoy(), -dias))
  setHasta(hoy())
}
