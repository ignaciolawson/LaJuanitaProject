import { useCallback, useEffect, useState } from 'react'

import { altaBloqueo, eliminarBloqueo, listarBloqueos, listarSalas } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { BloqueoResumen, SalaResumen } from '../api/tiposAdmin'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { diaYMes, hhmm, hoy } from '../componentes/semana'
import { puedeOperar } from '../layout/menu'

/**
 * Módulo 2, pantalla 3 — salas fuera de servicio.
 *
 * <p><b>Un bloqueo es una franja horaria que se repite todos los días del
 * rango</b>, no un intervalo continuo. "De 9 a 13 toda la semana que viene" deja
 * la sala libre de 13 en adelante todos esos días. Esa lectura es la que
 * justifica que la fila tenga dos fechas y dos horas, y la pantalla la dice con
 * todas las letras: `V6` la había perdido en una migración y `V7` tuvo que
 * rescatarla — si acá se muestra como "del 1 al 10 de 9 a 13" sin aclarar, se
 * lee como un intervalo y vuelve la confusión.
 *
 * <p>Las tres reglas que puede rechazar el alta las impone la base, no esta
 * pantalla: dos bloqueos no se pisan, no se bloquea una sala con clases adentro,
 * y una sala bloqueada no acepta reservas. Los mensajes que se muestran son los
 * que escribieron el EXCLUDE y los triggers.
 */
export function BloqueosPagina() {
  const puedeEscribir = puedeOperar(useUsuario())

  const [bloqueos, setBloqueos] = useState<BloqueoResumen[]>([])
  const [salas, setSalas] = useState<SalaResumen[]>([])
  const [idSala, setIdSala] = useState<number | ''>('')
  const [verVencidos, setVerVencidos] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoAlta, setMostrandoAlta] = useState(false)

  useEffect(() => {
    listarSalas(true)
      .then(setSalas)
      .catch(() => setError('No se pudo cargar el catálogo de salas.'))
  }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setBloqueos(
        await listarBloqueos({
          // Sin `desde`, el backend arranca en hoy. Para el histórico se baja la
          // fecha; dos años cubre lo que el sistema puede llegar a tener cargado.
          desde: verVencidos ? sumarAnios(hoy(), -2) : undefined,
          idSala: idSala === '' ? undefined : idSala,
        }),
      )
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los bloqueos.')
    } finally {
      setCargando(false)
    }
  }, [idSala, verVencidos])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function desbloquear(bloqueo: BloqueoResumen) {
    if (!confirm(`¿Desbloquear ${bloqueo.sala}? La sala vuelve a aceptar reservas.`)) return

    try {
      await eliminarBloqueo(bloqueo.idBloqueo)
      await cargar()
    } catch (e) {
      const mensaje = e instanceof ApiError ? e.message : 'No se pudo desbloquear.'
      // Recargar antes de mostrar: `cargar` arranca limpiando el error.
      await cargar()
      setError(mensaje)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Salas fuera de servicio</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando
              ? 'Cargando…'
              : bloqueos.length === 0
                ? 'Ninguna sala bloqueada'
                : `${bloqueos.length} ${bloqueos.length === 1 ? 'bloqueo' : 'bloqueos'}`}
          </p>
        </div>
        {puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Bloquear una sala</Boton>}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={idSala}
          onChange={(e) => setIdSala(e.target.value === '' ? '' : Number(e.target.value))}
          aria-label="Filtrar por sala"
          className="rounded-md border border-linea bg-white px-3 py-2 text-sm outline-none focus:border-red"
        >
          <option value="">Todas las salas</option>
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-tenue">
          <input
            type="checkbox"
            checked={verVencidos}
            onChange={(e) => setVerVencidos(e.target.checked)}
          />
          Ver también los vencidos
        </label>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {mostrandoAlta && puedeEscribir && (
        <FormularioBloqueo
          salas={salas}
          onCerrar={() => setMostrandoAlta(false)}
          onGuardado={() => {
            setMostrandoAlta(false)
            void cargar()
          }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-linea bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
              <th className="px-4 py-3 font-semibold">Sala</th>
              <th className="px-4 py-3 font-semibold">Cuándo</th>
              <th className="px-4 py-3 font-semibold">Motivo</th>
              <th className="px-4 py-3 font-semibold">Cargado por</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {bloqueos.map((b) => (
              <tr key={b.idBloqueo} className={b.vigente ? '' : 'text-apagado'}>
                <td className="px-4 py-3">
                  <div className="font-medium">{b.sala}</div>
                  {!b.vigente && <div className="text-xs">vencido</div>}
                </td>
                <td className="px-4 py-3">
                  <div>{diasDe(b)}</div>
                  <div className="text-xs text-tenue">{franjaDe(b)}</div>
                </td>
                <td className="px-4 py-3">{b.motivo}</td>
                <td className="px-4 py-3 text-xs text-tenue">
                  {b.registradoPor ?? <span className="text-apagado">—</span>}
                  <div>{fechaCorta(b.fechaRegistro)}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  {puedeEscribir && (
                    <button
                      type="button"
                      onClick={() => void desbloquear(b)}
                      className="whitespace-nowrap text-xs text-tenue underline underline-offset-2 transition-colors hover:text-red"
                    >
                      Desbloquear
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!cargando && bloqueos.length === 0 && (
        <p className="mt-4 text-center text-sm text-tenue">
          Las tres salas están disponibles.
        </p>
      )}
    </div>
  )
}

/** `2026-09-01` → `01/09`, y un solo día no se escribe como un rango. */
function diasDe(bloqueo: BloqueoResumen): string {
  return bloqueo.fechaInicio === bloqueo.fechaFin
    ? diaYMes(bloqueo.fechaInicio)
    : `${diaYMes(bloqueo.fechaInicio)} al ${diaYMes(bloqueo.fechaFin)}`
}

/**
 * La franja, dicha como la lee la base.
 *
 * <p><b>"todos los días" no es relleno.</b> Es la diferencia entre la lectura
 * correcta —la franja se repite cada día del rango— y la que `V6` había tomado,
 * donde el bloqueo era un intervalo continuo y la sala quedaba tomada también de
 * noche. Un bloqueo de un solo día no necesita la aclaración.
 */
function franjaDe(bloqueo: BloqueoResumen): string {
  if (bloqueo.diaCompleto) return 'Todo el día'

  const franja = `${hhmm(bloqueo.horaInicio)} a ${hhmm(bloqueo.horaFin)}`
  return bloqueo.fechaInicio === bloqueo.fechaFin ? franja : `${franja}, todos los días`
}

function fechaCorta(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/')
}

function sumarAnios(iso: string, anios: number): string {
  const [anio, resto] = [iso.slice(0, 4), iso.slice(4)]
  return `${Number(anio) + anios}${resto}`
}

function FormularioBloqueo({
  salas,
  onCerrar,
  onGuardado,
}: {
  salas: SalaResumen[]
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [datos, setDatos] = useState({
    idSala: '',
    fechaInicio: hoy(),
    fechaFin: hoy(),
    motivo: '',
  })
  // El día entero es el caso principal ("la Sala 2 está en refacción toda la
  // semana"), así que es el default y las horas ni se muestran hasta pedirlas.
  const [porFranja, setPorFranja] = useState(false)
  const [horas, setHoras] = useState({ horaInicio: '09:00', horaFin: '13:00' })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()

    const locales: Record<string, string> = {}
    if (!datos.idSala) locales.idSala = 'Elegí la sala.'
    if (!datos.fechaInicio) locales.fechaInicio = 'Poné desde qué día.'
    if (!datos.fechaFin) locales.fechaFin = 'Poné hasta qué día.'
    if (!datos.motivo.trim()) locales.motivo = 'Escribí por qué se bloquea la sala.'
    if (datos.fechaFin && datos.fechaInicio && datos.fechaFin < datos.fechaInicio) {
      locales.rangoDeFechasValido = 'La fecha de fin no puede ser anterior a la de inicio.'
    }
    if (porFranja && horas.horaFin <= horas.horaInicio) {
      locales.horarioValido = 'La hora de fin tiene que ser posterior a la de inicio.'
    }
    if (Object.keys(locales).length > 0) {
      setErrores(locales)
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await altaBloqueo({
        idSala: Number(datos.idSala),
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        // Sin horas el backend pone el día entero. Mandar 00:00/23:59 desde acá
        // sería copiar un default que ya vive en dos lugares (`V1` y el service).
        horaInicio: porFranja ? horas.horaInicio : null,
        horaFin: porFranja ? horas.horaFin : null,
        motivo: datos.motivo.trim(),
      })
      onGuardado()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        // Acá caen las reglas de la base: otro bloqueo encima, o —el caso
        // frecuente— clases todavía cargadas adentro del rango. El mensaje que
        // se muestra es el que escribió el trigger, con la cantidad incluida.
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-white p-5">
      <h3 className="mb-4 font-semibold">Bloquear una sala</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoSelect
          etiqueta="Sala"
          value={datos.idSala}
          onChange={cambiar('idSala')}
          error={errores.idSala}
        >
          <option value="">Elegí una</option>
          {salas.map((s) => (
            <option key={s.idSala} value={s.idSala}>
              {s.nombre}
            </option>
          ))}
        </CampoSelect>

        <Campo
          etiqueta="Motivo"
          value={datos.motivo}
          onChange={cambiar('motivo')}
          placeholder="Mantenimiento, refacción, evento…"
          error={errores.motivo}
        />

        <Campo
          etiqueta="Desde el día"
          type="date"
          value={datos.fechaInicio}
          onChange={cambiar('fechaInicio')}
          error={errores.fechaInicio}
        />
        <Campo
          etiqueta="Hasta el día"
          type="date"
          value={datos.fechaFin}
          onChange={cambiar('fechaFin')}
          // Inclusive, y conviene decirlo: "hasta el 10" con el 10 afuera es la
          // clase que se carga el último día y no debería poder cargarse.
          ayuda="Inclusive"
          error={errores.fechaFin ?? errores.rangoDeFechasValido}
        />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-tenue">
        <input
          type="checkbox"
          checked={porFranja}
          onChange={(e) => setPorFranja(e.target.checked)}
        />
        Solo una franja horaria
      </label>

      {porFranja && (
        <>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Desde"
              type="time"
              value={horas.horaInicio}
              onChange={(e) => setHoras((previo) => ({ ...previo, horaInicio: e.target.value }))}
            />
            <Campo
              etiqueta="Hasta"
              type="time"
              value={horas.horaFin}
              onChange={(e) => setHoras((previo) => ({ ...previo, horaFin: e.target.value }))}
              error={errores.horarioValido}
            />
          </div>
          {/* Lo más fácil de malinterpretar de toda la pantalla. */}
          <p className="mt-2 text-xs text-tenue">
            La franja se repite <strong>todos los días</strong> del rango. Fuera de ella la sala
            sigue disponible.
          </p>
        </>
      )}

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Bloquear'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
