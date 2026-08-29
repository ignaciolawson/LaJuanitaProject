import { useCallback, useEffect, useState } from 'react'

import { listarSalas } from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  aprobarReprogramacion,
  listarReprogramaciones,
  rechazarReprogramacion,
} from '../api/portal'
import type { SalaResumen } from '../api/tiposAdmin'
import {
  NOMBRE_DE_ESTADO_REPROGRAMACION,
  type EstadoReprogramacion,
  type ReprogramacionResumen,
} from '../api/tiposPortal'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { Campo, CampoSelect } from '../componentes/Campo'
import { EstadoVacio } from '../componentes/EstadoVacio'
import { Etiqueta } from '../componentes/Etiqueta'
import { Paginado } from '../componentes/Paginado'
import { PedirMotivo } from '../componentes/PedirMotivo'
import { diaYMes, hhmm } from '../componentes/semana'
import { puedeOperar } from '../layout/menu'

/**
 * La bandeja de "no puedo ese día" (Fase 2.4).
 *
 * **Es una bandeja aparte de Pedidos de sala, y no por prolijidad.** Son dos
 * ciclos de vida distintos —`V13` lo dejó escrito al descartar generalizar las
 * tablas—: uno pide *mover* algo que existe, el otro pide *crear* algo que no. Y
 * se resuelven distinto: aprobar un pedido de sala es cobrar la seña; aprobar uno
 * de estos es **elegir el horario nuevo**.
 *
 * **Aprobar es mover.** No hay un botón de "sí": el formulario pide la franja
 * nueva, porque un pedido marcado como aprobado con la clase todavía en el día
 * que la persona dijo que no podía no aprobó nada. El backend rechaza aprobar
 * dejando el mismo horario.
 *
 * **Acá SÍ se elige el horario, al revés que en Pedidos de sala**, donde la regla
 * es aprobar tal como se pidió. No es una excepción: allá la persona elige una
 * franja libre que el portal le muestra; acá **no puede saber** qué sala queda
 * libre ni de qué profesor depende su clase. Por eso pide un día, o ni eso.
 *
 * **La clase se mueve en el lugar**: es la misma reserva, con otro horario, así
 * que la seña que la respalda la sigue respaldando. Si esto se convirtiera en
 * "crear una reserva nueva", mover un alquiler pasaría a ser cobrar de nuevo y
 * devolver lo cobrado.
 */
export function ReprogramacionesPagina() {
  const usuario = useUsuario()
  const puedeResolver = puedeOperar(usuario)

  const [estado, setEstado] = useState<EstadoReprogramacion | ''>('PENDIENTE')
  const [pagina, setPagina] = useState(0)
  const [pedidos, setPedidos] = useState<ReprogramacionResumen[]>([])
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** Cuál está abierta y para qué. Una por vez: son dos formularios distintos. */
  const [abriendo, setAbriendo] = useState<{ id: number; accion: 'aprobar' | 'rechazar' } | null>(
    null,
  )

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const resultado = await listarReprogramaciones(estado, pagina)
      setPedidos(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar la bandeja.')
    } finally {
      setCargando(false)
    }
  }, [estado, pagina])

  useEffect(() => {
    void cargar()
  }, [cargar])

  useEffect(() => {
    listarSalas()
      .then(setSalas)
      .catch(() => setSalas([]))
  }, [])

  async function resolver(accion: () => Promise<unknown>) {
    try {
      await accion()
      setAbriendo(null)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo resolver el pedido.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Pedidos de cambio de horario"
        aclaracion={
          cargando ? 'Cargando…' : `${total} ${total === 1 ? 'pedido' : 'pedidos'}`
        }
        acciones={
          <CampoSelect
            etiqueta="Estado"
            value={estado}
            onChange={(e) => {
              setEstado(e.target.value as EstadoReprogramacion | '')
              setPagina(0)
            }}
            className="w-56"
          >
            <option value="PENDIENTE">Esperando respuesta</option>
            <option value="APROBADA">Movidas</option>
            <option value="RECHAZADA">No se pudieron mover</option>
            <option value="">Todos</option>
          </CampoSelect>
        }
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && pedidos.length === 0 && (
        <EstadoVacio
          titulo={
            estado === 'PENDIENTE'
              ? 'No hay pedidos esperando respuesta.'
              : 'No hay pedidos con ese estado.'
          }
        >
          {estado === 'PENDIENTE' &&
            'Acá caen los pedidos de mover una clase, del alumno o del profesor.'}
        </EstadoVacio>
      )}

      <ul className="space-y-3">
        {pedidos.map((p) => (
          <li key={p.idSolicitud} className="rounded-lg border border-linea bg-white px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="font-medium">
                  {p.apellido}, {p.nombre}
                </div>
                <div className="text-sm text-tenue">
                  {p.tipoUso} en {p.sala} · {diaYMes(p.fecha)} de {hhmm(p.horaInicio)} a{' '}
                  {hhmm(p.horaFin)}
                </div>
                <p className="mt-2 text-sm italic text-tenue">“{p.motivo}”</p>
                {p.fechaAlternativaSolicitada && (
                  <div className="mt-1 text-xs text-apagado">
                    Le vendría bien el {diaYMes(p.fechaAlternativaSolicitada)} — es una
                    preferencia, no una reserva
                  </div>
                )}
              </div>

              <div className="shrink-0 text-right">
                <Etiqueta tono={p.estado === 'PENDIENTE' ? 'atencion' : 'apagada'}>
                  {NOMBRE_DE_ESTADO_REPROGRAMACION[p.estado]}
                </Etiqueta>

                {p.estado === 'PENDIENTE' && puedeResolver && (
                  <div className="mt-2 flex justify-end gap-2">
                    <Boton onClick={() => setAbriendo({ id: p.idSolicitud, accion: 'aprobar' })}>
                      Darle otro horario
                    </Boton>
                    <Boton
                      variante="secundario"
                      onClick={() => setAbriendo({ id: p.idSolicitud, accion: 'rechazar' })}
                    >
                      Rechazar
                    </Boton>
                  </div>
                )}
              </div>
            </div>

            {p.respuesta && (
              <p className="mt-3 border-t border-linea pt-3 text-sm text-tenue">
                {p.respuesta}
                {p.resueltaPor && <span className="text-apagado"> — {p.resueltaPor}</span>}
              </p>
            )}

            {abriendo?.id === p.idSolicitud && abriendo.accion === 'aprobar' && (
              <div className="mt-4 border-t border-linea pt-4">
                <FormularioDeHorario
                  pedido={p}
                  salas={salas}
                  onCancelar={() => setAbriendo(null)}
                  onConfirmar={(franja) =>
                    void resolver(() => aprobarReprogramacion(p.idSolicitud, franja))
                  }
                />
              </div>
            )}

            {abriendo?.id === p.idSolicitud && abriendo.accion === 'rechazar' && (
              <div className="mt-4 border-t border-linea pt-4">
                <PedirMotivo
                  titulo="Rechazar el pedido"
                  ayuda="Lo que escribas le llega como notificación, y es lo único con lo que puede hacer algo: decile por qué no se puede y qué sí — otra semana, otro horario."
                  onCerrar={() => setAbriendo(null)}
                  onConfirmar={(motivo) =>
                    void resolver(() => rechazarReprogramacion(p.idSolicitud, motivo))
                  }
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
 * El horario nuevo, que es el "sí".
 *
 * **Viene prellenado con lo que la clase tiene hoy**, salvo el día, que arranca
 * en el que la persona pidió si pidió alguno. Prellenar la duración no es una
 * comodidad: mover una clase de hora y media a una hora sin querer le cambia el
 * curso al alumno, y nadie lo mira dos veces si lo escribió el sistema.
 *
 * **El profesor y el tipo de uso no están y no faltan.** Mover una clase es
 * moverla; cambiarle el profesor es otra cosa y su lugar es el calendario.
 */
function FormularioDeHorario({
  pedido,
  salas,
  onCancelar,
  onConfirmar,
}: {
  pedido: ReprogramacionResumen
  salas: SalaResumen[]
  onCancelar: () => void
  onConfirmar: (franja: {
    idSala: number
    fecha: string
    horaInicio: string
    horaFin: string
    respuesta?: string
  }) => void
}) {
  const salaActual = salas.find((s) => s.nombre === pedido.sala)

  const [idSala, setIdSala] = useState(String(salaActual?.idSala ?? ''))
  const [fecha, setFecha] = useState(pedido.fechaAlternativaSolicitada ?? pedido.fecha)
  const [horaInicio, setHoraInicio] = useState(pedido.horaInicio.slice(0, 5))
  const [horaFin, setHoraFin] = useState(pedido.horaFin.slice(0, 5))
  const [respuesta, setRespuesta] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <h3 className="mb-1 font-semibold">Darle otro horario</h3>
      <p className="mb-4 text-sm text-tenue">
        La clase se mueve a esto y se le avisa sola, diciendo de dónde a dónde. Es la misma
        reserva: la seña que la respalda queda como está.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Sala"
          value={idSala}
          onChange={(e) => setIdSala(e.target.value)}
        >
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Día"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
        />

        <Campo
          etiqueta="Hora de inicio"
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
        />

        <Campo
          etiqueta="Hora de fin"
          type="time"
          value={horaFin}
          onChange={(e) => setHoraFin(e.target.value)}
        />
      </div>

      <Campo
        etiqueta="Mensaje (opcional)"
        className="mt-4"
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        placeholder="Te esperamos el jueves a la misma hora"
      />

      {error && (
        <div className="mt-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton
          type="button"
          onClick={() => {
            if (!idSala) {
              setError('Elegí la sala.')
              return
            }
            if (!fecha || !horaInicio || !horaFin) {
              setError('Completá el día y el horario.')
              return
            }
            if (horaFin <= horaInicio) {
              setError('La hora de fin tiene que ser posterior a la de inicio.')
              return
            }
            onConfirmar({
              idSala: Number(idSala),
              fecha,
              horaInicio,
              horaFin,
              respuesta: respuesta.trim() || undefined,
            })
          }}
        >
          Mover la clase
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCancelar}>
          Cancelar
        </Boton>
      </div>
    </div>
  )
}
