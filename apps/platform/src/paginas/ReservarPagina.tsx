import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ApiError } from '../api/cliente'
import { catalogoParaPedir, disponibilidad, pedirSala } from '../api/portal'
import type { CatalogoParaPedir, FranjaOcupada } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { hhmm, hoy, sumarDias } from '../componentes/semana'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

/**
 * Módulo 4 — pedir una sala.
 *
 * **Esto no crea una reserva, y no es una limitación técnica sino la regla del
 * negocio.** Ninguna reserva existe sin plata en SENADO o PAGADO detrás (P8,
 * `V10`–`V12`) y un usuario no tiene cómo poner plata en el sistema: registrar
 * un pago es de administración, los cinco medios son de carga manual y no hay
 * pasarela en ningún lado del alcance. Entonces el pedido queda esperando y la
 * reserva nace cuando administración lo aprueba y carga la seña.
 *
 * Por eso el formulario lo dice de entrada. Un botón que dijera "Reservar" y
 * devolviera algo que todavía no es una reserva sería peor que la espera.
 *
 * **Solo se ofrece lo que se puede pedir** (P17): el catálogo del portal ya
 * viene filtrado a los usos que no dependen de un profesor —alquiler de cabina y
 * grabación de set—, y las salas se filtran contra la matriz de §2.6. Ninguna de
 * las dos cosas autoriza nada: quien decide es la FK compuesta y el trigger de
 * `V13`.
 */
export function ReservarPagina() {
  const navegar = useNavigate()

  const [catalogo, setCatalogo] = useState<CatalogoParaPedir | null>(null)
  const [idTipoUso, setIdTipoUso] = useState('')
  const [idSala, setIdSala] = useState('')
  const [fecha, setFecha] = useState(() => sumarDias(hoy(), 1))
  const [horaInicio, setHoraInicio] = useState('16:00')
  const [horaFin, setHoraFin] = useState('18:00')
  const [comentario, setComentario] = useState('')

  const [ocupado, setOcupado] = useState<FranjaOcupada[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let vigente = true
    catalogoParaPedir()
      .then((datos) => {
        if (!vigente) return
        setCatalogo(datos)
        if (datos.usos.length > 0) setIdTipoUso(String(datos.usos[0].idTipoUso))
      })
      .catch((e: unknown) => {
        if (vigente) setError(e instanceof ApiError ? e.message : 'No se pudo cargar el catálogo.')
      })
    return () => {
      vigente = false
    }
  }, [])

  // Las salas donde ese uso está permitido. Es la matriz de §2.6 aplicada del
  // lado del formulario: ofrecer "grabación en Sala 1" es ofrecer un pedido que
  // nace para ser rechazado.
  const salasPosibles = (catalogo?.salas ?? []).filter((s) =>
    s.usosPermitidos.some((u) => u.idTipoUso === Number(idTipoUso)),
  )

  // Si la sala elegida deja de servir para el uso nuevo, se limpia sola.
  useEffect(() => {
    if (idSala !== '' && !salasPosibles.some((s) => String(s.idSala) === idSala)) setIdSala('')
  }, [idSala, salasPosibles])

  const advertencia = salasPosibles
    .find((s) => String(s.idSala) === idSala)
    ?.usosPermitidos.find((u) => u.idTipoUso === Number(idTipoUso))?.advertencia

  const verDisponibilidad = useCallback(async () => {
    if (idSala === '') {
      setOcupado([])
      return
    }
    try {
      setOcupado(await disponibilidad(Number(idSala), fecha, fecha))
    } catch {
      // Es una ayuda, no un requisito: si falla, el formulario sigue andando y
      // el choque lo dirá el EXCLUDE al aprobar.
      setOcupado([])
    }
  }, [idSala, fecha])

  useEffect(() => {
    void verDisponibilidad()
  }, [verDisponibilidad])

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErrores({})
    setError(null)

    if (idSala === '') {
      setErrores({ idSala: 'Elegí la sala.' })
      return
    }

    setEnviando(true)
    try {
      await pedirSala({
        idSala: Number(idSala),
        idTipoUso: Number(idTipoUso),
        fecha,
        horaInicio,
        horaFin,
        comentario: comentario.trim() || undefined,
      })
      navegar('/mis-solicitudes')
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
        if (e.errores) setErrores(e.errores)
      } else {
        setError('No se pudo mandar el pedido.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (error && !catalogo) return <Aviso>{error}</Aviso>

  return (
    <div className="max-w-2xl">
      <CabeceraDePagina
        titulo="Reservar una cabina"
        aclaracion={<>Elegís sala, día y horario, y nosotros te confirmamos. La reserva queda
          tomada cuando abonás la seña — te escribimos para coordinarla.</>}
      />

      <form noValidate onSubmit={enviar} className="rounded-lg border border-linea bg-superficie p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelect
            etiqueta="Qué querés hacer"
            value={idTipoUso}
            onChange={(e) => setIdTipoUso(e.target.value)}
            error={errores.idTipoUso}
          >
            {(catalogo?.usos ?? []).map((u) => (
              <option key={u.idTipoUso} value={u.idTipoUso}>
                {u.nombre}
              </option>
            ))}
          </CampoSelect>

          <CampoSelect
            etiqueta="Sala"
            value={idSala}
            onChange={(e) => setIdSala(e.target.value)}
            error={errores.idSala}
          >
            <option value="">Elegí…</option>
            {salasPosibles.map((s) => (
              <option key={s.idSala} value={s.idSala}>
                {s.nombre}
              </option>
            ))}
          </CampoSelect>

          <Campo
            etiqueta="Día"
            type="date"
            required
            min={hoy()}
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            error={errores.fecha}
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              etiqueta="Desde"
              type="time"
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              error={errores.horaInicio}
            />
            <Campo
              etiqueta="Hasta"
              type="time"
              required
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              error={errores.horarioValido ?? errores.horaFin}
            />
          </div>
        </div>

        {/* La advertencia de la matriz: "se puede, pero ojo". Bloquearlo sería
            rígido de más; no decir nada dejaría pedir una sala sin escritorio. */}
        {advertencia && (
          <p className="mt-4 rounded-md border border-linea bg-superficie-2 px-3 py-2.5 text-xs text-tenue">
            {advertencia}
          </p>
        )}

        <Campo
          etiqueta="Algo que quieras aclarar"
          className="mt-4"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder="Necesito la cabina para grabar un set de 40 minutos…"
        />

        <Disponibilidad franjas={ocupado} hayFecha={idSala !== ''} />

        {error && (
          <div className="mt-4">
            <Aviso>{error}</Aviso>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Mandando…' : 'Mandar pedido'}
          </Boton>
          <span className="text-xs text-apagado">
            Todavía no reserva la sala: primero lo confirmamos.
          </span>
        </div>
      </form>
    </div>
  )
}

/**
 * Qué hay tomado ese día.
 *
 * **No dice de quién es cada franja**, y eso viene del backend: la agenda
 * completa cuenta quién tiene clase con quién, que es información de los otros
 * alumnos. Acá alcanza con saber qué horarios no conviene pedir.
 */
function Disponibilidad({ franjas, hayFecha }: { franjas: FranjaOcupada[]; hayFecha: boolean }) {
  if (!hayFecha) return null

  return (
    <div className="mt-4 rounded-md border border-linea px-3 py-2.5">
      <h3 className="t-mono text-tenue">Ese día</h3>
      {franjas.length === 0 ? (
        <p className="mt-1 text-xs text-tenue">La sala está libre todo el día.</p>
      ) : (
        <ul className="mt-1 flex flex-wrap gap-2">
          {franjas.map((f, i) => (
            <li
              key={`${f.horaInicio}-${i}`}
              className="rounded border border-linea px-2 py-0.5 text-xs text-tenue"
            >
              {hhmm(f.horaInicio)}–{hhmm(f.horaFin)}
              {f.motivo === 'BLOQUEADA' && ' · sala no disponible'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
