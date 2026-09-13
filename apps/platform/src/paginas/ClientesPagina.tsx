import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { listarClientes } from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { ClienteResumen } from '../api/tiposAdmin'
import { NOMBRE_DE_LINEA } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { Paginado } from '../componentes/Paginado'
import { fecha } from '../componentes/semana'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

/**
 * Clientes: quien gastó plata en La Juanita y no es alumno, profe ni equipo
 * (P77 · 3).
 *
 * Es la pantalla que hace visible la decisión de arquitectura del sistema:
 * gente que alquiló la cabina una vez, mandó un tema a masterizar o compró un
 * equipo, y nunca cursó nada. **"Gastó plata"** es un pago que entró
 * (SENADO/PAGADO) — la misma definición con que `V12` decide si una reserva
 * tiene plata detrás —, así que una deuda anotada no hace cliente a nadie, y
 * una cuenta que se registró sola y nunca pagó tampoco: ésa está en el
 * Directorio.
 *
 * ⚠️ **Entran también los que pagaron a nombre escrito, sin cuenta**, y sus
 * pagos vienen agrupados por ese nombre normalizado. Dos formas de escribir el
 * mismo nombre son dos filas: no hay identidad detrás y este sistema no la
 * inventa cruzando por nombre. La pantalla lo dice, para que nadie lea una
 * fila doble como un bug.
 *
 * Sólo lee: un cliente no se crea acá, se vuelve cliente pagando. Por eso no
 * hay botón de alta y ningún rol tiene nada que escribir.
 */
export function ClientesPagina() {
  const [clientes, setClientes] = useState<ClienteResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarClientes({ buscar, pagina })
      setClientes(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, pagina, setError])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  function cambiarBusqueda(texto: string) {
    setBuscar(texto)
    setPagina(0)
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Clientes"
        aclaracion={
          <>
            {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'cliente' : 'clientes'}`} · quienes
            le pagaron al estudio y no son alumnos, profes ni equipo. Con cuenta o sin ella: a
            quien pagó a nombre escrito se lo agrupa por ese nombre, así que uno escrito de dos
            formas aparece dos veces.
          </>
        }
      />

      <input
        type="search"
        value={buscar}
        onChange={(e) => cambiarBusqueda(e.target.value)}
        placeholder="Buscar por nombre, apellido, email o contacto…"
        className={`mb-4 w-full max-w-md ${CONTROL_DE_FILTRO}`}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <Tabla columnas={['Cliente', 'Contacto', 'Qué compró', 'Compras', 'Última']}>
        {clientes.map((c) => (
          <tr key={c.idUsuario ?? `externo:${c.nombre}`}>
            <Celda>
              {/* Con cuenta, el nombre lleva al estado de cuenta — la plata de una
                  persona ya tiene su pantalla. Sin cuenta no hay a dónde ir. */}
              {c.idUsuario === null ? (
                <div className="font-medium">
                  {c.nombre}
                  <span className="ml-2 text-xs font-normal text-apagado">sin cuenta</span>
                </div>
              ) : (
                <Link
                  to={`/admin/estado-de-cuenta/${c.idUsuario}`}
                  className="font-medium underline underline-offset-2 hover:text-acento"
                >
                  {c.apellido}, {c.nombre}
                </Link>
              )}
            </Celda>
            <Celda className="text-tenue">
              {c.email && <div>{c.email}</div>}
              {c.telefono && <div className="text-xs">{c.telefono}</div>}
              {c.contacto && <div className="text-xs">{c.contacto}</div>}
              {!c.email && !c.telefono && !c.contacto && <span className="text-apagado">—</span>}
            </Celda>
            <Celda className="text-tenue">
              {c.lineas.map((l) => NOMBRE_DE_LINEA[l]).join(' · ')}
            </Celda>
            <Celda numerica>{c.pagos}</Celda>
            <Celda className="text-tenue">{fecha(c.ultimaCompra)}</Celda>
          </tr>
        ))}

        {!cargando && clientes.length === 0 && (
          <FilaVacia columnas={5}>
            {buscar
              ? 'No hay clientes que coincidan con la búsqueda.'
              : 'Todavía nadie le pagó al estudio sin ser alumno.'}
          </FilaVacia>
        )}
      </Tabla>

      <Paginado
        pagina={pagina}
        totalPaginas={totalPaginas}
        totalElementos={total}
        onCambiar={setPagina}
      />
    </div>
  )
}
