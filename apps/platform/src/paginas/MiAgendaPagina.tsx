import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../api/cliente'
import { miAgenda, misClasesDictadas } from '../api/docencia'
import { misReprogramaciones } from '../api/portal'
import type { ReservaResumen } from '../api/tiposAdmin'
import type { ClasesDictadas } from '../api/tiposDocencia'
import type { ReprogramacionResumen } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { PedirOtroDia } from '../componentes/PedirOtroDia'
import { diaYMes, hhmm, hoy, lunesDe, sumarDias } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

/**
 * Módulo 5, pantallas 1 y 5 — mi agenda y mis clases dictadas.
 *
 * **Son una sola pantalla y no dos**, porque son la misma pregunta mirada desde
 * los dos lados del día de hoy: qué tengo esta semana y cuántas di. Separarlas
 * obligaba a elegir dos veces el mismo período.
 *
 * **Es una lista, no una grilla.** La grilla de tres salas por ocho horas es de
 * administración, cuya pregunta es *"qué está pasando"*; acá la pregunta es
 * *"cuándo tengo que venir"*, y para eso una lista en orden gana. Es la misma
 * decisión que tomó `MisReservasPagina`.
 *
 * **El profesor no modifica reservas, y sigue sin hacerlo**: mover una clase
 * vuelve a chequear el solapamiento y arrastra la seña, así que la mueve
 * administración. Lo que sí puede desde el 2026-08-29 es **pedir que la muevan**
 * (P9), con el mismo botón que el alumno — es el que más veces lo necesita, y
 * hasta ahora eso viajaba por WhatsApp y no quedaba escrito en ningún lado. El
 * botón es `PedirOtroDia`, el mismo componente que dibuja Mis reservas.
 */
export function MiAgendaPagina() {
  const [desde, setDesde] = useState(() => lunesDe(hoy()))
  const [clases, setClases] = useState<ReservaResumen[]>([])
  const [dictadas, setDictadas] = useState<ClasesDictadas | null>(null)
  const [pedidos, setPedidos] = useState<ReprogramacionResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hasta = sumarDias(desde, 6)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      // Las dos preguntas son del mismo período a propósito: el resumen cuenta
      // lo que la lista de arriba muestra, así que no pueden discrepar.
      const [agenda, resumen, mios] = await Promise.all([
        miAgenda(desde, hasta),
        misClasesDictadas(desde, hasta),
        misReprogramaciones(),
      ])
      setClases(agenda)
      setDictadas(resumen)
      setPedidos(mios)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu agenda.')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const ordenadas = [...clases].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio),
  )

  /** El pedido vigente de cada clase: la lista viene de lo más nuevo a lo más viejo. */
  const pedidoDe = new Map<number, ReprogramacionResumen>()
  for (const p of pedidos) {
    if (!pedidoDe.has(p.idReserva)) pedidoDe.set(p.idReserva, p)
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Mi agenda"
        aclaracion={<>{cargando ? 'Cargando…' : `Del ${diaYMes(desde)} al ${diaYMes(hasta)}`}</>}
        acciones={<>{/* El texto del rango se arma con `diaYMes` y no con `rangoLegible`:
              aquella indexa el día [6] y da por hecho una semana de siete. Acá
              hoy son siete, pero atar el encabezado a eso ya rompió una vez. */}
          
        

        
          <Boton variante="secundario" onClick={() => setDesde(sumarDias(desde, -7))}>
            ← Anterior
          </Boton>
          <Boton variante="secundario" onClick={() => setDesde(lunesDe(hoy()))}>
            Esta semana
          </Boton>
          <Boton variante="secundario" onClick={() => setDesde(sumarDias(desde, 7))}>
            Siguiente →
          </Boton></>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && ordenadas.length === 0 && (
        <EstadoVacio titulo="No tenés clases en esta semana." />
      )}

      {/* Con nombre: el tipo de uso —"Clase de DJ"— aparece también en el
          desglose del resumen de abajo, y sin un nombre en cada zona no hay cómo
          preguntar por una sin traerse la otra. */}
      <ul aria-label="Clases de la semana" className="space-y-3">
        {ordenadas.map((c) => {
          const caida = c.estado === 'CANCELADA' || c.estado === 'REPROGRAMADA'
          // Los que se dieron de baja no van: la clase se da igual, pero esa
          // persona no está, y una lista de asistentes que los incluya manda al
          // profesor a buscar a alguien que avisó que no venía.
          const presentes = c.participantes.filter((p) => p.estadoAsistencia !== 'CANCELADA')

          return (
            <li
              key={c.idReserva}
              className={`flex flex-wrap items-center gap-4 rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4 ${
                caida ? 'text-apagado' : ''
              }`}
            >
              <span
                aria-hidden
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: caida ? '#d4d0c8' : (c.color ?? '#1a1a1a') }}
              />

              <div className="w-28 shrink-0">
                <div className="font-medium">{diaYMes(c.fecha)}</div>
                <div className="text-xs text-tenue">
                  {hhmm(c.horaInicio)} a {hhmm(c.horaFin)}
                </div>
              </div>

              <div className="min-w-40 grow">
                <div className={`font-medium ${caida ? 'line-through' : ''}`}>{c.tipoUso}</div>
                <div className="text-xs text-tenue">
                  {c.sala}
                  {/* Los alumnos se nombran y no se enlazan: la participación
                      trae el id de usuario y la ficha se abre por id de alumno,
                      que son dos cosas distintas. Se entra desde Mis alumnos. */}
                  {presentes.length > 0 &&
                    ` · ${presentes.map((p) => `${p.nombre} ${p.apellido}`).join(', ')}`}
                </div>
              </div>

              {caida && (
                <span className="text-xs font-medium text-acento">
                  {c.estado === 'CANCELADA' ? 'Cancelada' : 'Reprogramada'}
                </span>
              )}

              <PedirOtroDia
                reserva={c}
                pedido={pedidoDe.get(c.idReserva)}
                onPedido={() => void cargar()}
              />
            </li>
          )
        })}
      </ul>

      {dictadas && <Resumen dictadas={dictadas} />}
    </div>
  )
}

/**
 * Cuántas clases di en el período.
 *
 * ⚠️ **Cuenta y no liquida.** No hay total ni tarifa acá, y eso no es un olvido:
 * si la liquidación al profesor sale de esta cuenta o se carga a mano es P20, una
 * pregunta abierta al cliente. Poner un número de plata sería decidirla por él,
 * y el DTO tampoco lo trae.
 *
 * Cuenta solo lo que ocupó la sala: una clase cancelada no se dictó.
 */
function Resumen({ dictadas }: { dictadas: ClasesDictadas }) {
  return (
    <section
      aria-label="Clases dictadas en el período"
      className="mt-8 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5"
    >
      <h3 className="t-seccion">Clases dictadas en el período</h3>
      <p className="mt-1 text-sm text-tenue">
        Cuenta las clases que ocuparon la sala. Una cancelada no cuenta.
      </p>

      <div className="mt-4 flex flex-wrap gap-8">
        <div>
          <div className="t-dato">
            {dictadas.clases}
          </div>
          <div className="text-xs text-tenue">
            {dictadas.clases === 1 ? 'clase' : 'clases'}
          </div>
        </div>

        <div>
          <div className="t-dato">
            {dictadas.alumnosAtendidos}
          </div>
          {/* Personas distintas, no participaciones: quien fue a ocho clases es
              un alumno atendido, no ocho. */}
          <div className="text-xs text-tenue">
            {dictadas.alumnosAtendidos === 1 ? 'alumno atendido' : 'alumnos atendidos'}
          </div>
        </div>
      </div>

      {dictadas.porTipo.length > 0 && (
        <ul className="mt-4 space-y-1 border-t border-linea pt-3 text-sm">
          {dictadas.porTipo.map((t) => (
            <li key={t.tipoUso} className="flex justify-between gap-4">
              <span className="text-tenue">{t.tipoUso}</span>
              <span className="tabular-nums">{t.clases}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
