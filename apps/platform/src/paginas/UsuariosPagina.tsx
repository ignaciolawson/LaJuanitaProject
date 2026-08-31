import { useCallback, useEffect, useState } from 'react'

import {
  altaUsuario,
  cambiarActivoUsuario,
  editarUsuario,
  listarUsuarios,
  resetearPasswordUsuario,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { Rol } from '../api/tipos'
import type { UsuarioResumen } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { useUsuario } from '../auth/contexto'
import { puedeOperar } from '../layout/menu'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { AvisoSoloLectura } from '../componentes/SoloLectura'
import { NOMBRE_DE_ROL } from '../componentes/presentacion'

const ROLES = Object.keys(NOMBRE_DE_ROL) as Rol[]

/**
 * Todas las personas con cuenta, sean alumnos o no.
 *
 * Es la pantalla que hace visible la decisión de arquitectura del sistema: acá
 * aparece gente que alquiló una cabina una vez y nunca cursó nada. En el modelo
 * original, que trataba al alumno como el usuario del sistema, esa gente no
 * existía.
 */
export function UsuariosPagina() {
  const yo = useUsuario()
  const puedeEscribir = puedeOperar(yo)

  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<UsuarioResumen | null>(null)
  const [passwordGenerada, setPasswordGenerada] = useState<{ de: string; valor: string } | null>(
    null,
  )

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarUsuarios({ buscar, pagina })
      setUsuarios(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, pagina])

  useEffect(() => {
    const id = setTimeout(cargar, 250)
    return () => clearTimeout(id)
  }, [cargar])

  // Buscar desde la página 3 devolvía vacío y parecía que no había resultados.
  function cambiarBusqueda(texto: string) {
    setBuscar(texto)
    setPagina(0)
  }

  async function alternarActivo(usuario: UsuarioResumen) {
    try {
      await cambiarActivoUsuario(usuario.id, !usuario.activo)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.')
    }
  }

  async function resetearPassword(usuario: UsuarioResumen) {
    setError(null)
    try {
      const resultado = await resetearPasswordUsuario(usuario.id)
      setPasswordGenerada({
        de: `${usuario.nombre} ${usuario.apellido}`,
        valor: resultado.passwordTemporal,
      })
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar la contraseña.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo="Personas"
        aclaracion={<>{cargando ? 'Cargando…' : `${total} ${total === 1 ? 'cuenta' : 'cuentas'}`} · incluye a
            quien solo alquila cabina o compra equipos</>}
        acciones={<>{/* DIRECTIVO lee todo y no escribe nada: no se le ofrece lo que el
            backend le va a negar. Quien autoriza sigue siendo el backend. */}
        {puedeEscribir && <Boton onClick={() => setCreando(true)}>Nueva cuenta</Boton>}</>}
      />

      <AvisoSoloLectura />

      <input
        type="search"
        value={buscar}
        onChange={(e) => cambiarBusqueda(e.target.value)}
        placeholder="Buscar por nombre, apellido o email…"
        className="mb-4 w-full max-w-md rounded-md border border-linea bg-superficie px-3 py-2 text-sm outline-none focus:border-red"
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {passwordGenerada && (
        <PasswordNueva
          de={passwordGenerada.de}
          valor={passwordGenerada.valor}
          onCerrar={() => setPasswordGenerada(null)}
        />
      )}

      {creando && (
        <FormularioCuenta
          puedeAsignarRol={yo.rol === 'ADMIN'}
          onCerrar={() => setCreando(false)}
          onCreada={(nombre, password) => {
            setCreando(false)
            setPasswordGenerada({ de: nombre, valor: password })
            void cargar()
          }}
        />
      )}

      {editando && (
        <FormularioEdicion
          usuario={editando}
          puedeAsignarRol={yo.rol === 'ADMIN'}
          esUnoMismo={editando.id === yo.id}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      )}

      <Tabla columnas={['Persona', 'Contacto', 'Rol', 'Estado', '']}>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <Celda>
                  <span className="font-medium">
                    {u.apellido}, {u.nombre}
                  </span>
                  {u.id === yo.id && <span className="ml-2 text-xs text-apagado">(vos)</span>}
                  {u.debeCambiarPassword && (
                    <span className="ml-2 text-xs text-apagado">· contraseña sin cambiar</span>
                  )}
                </Celda>
                <Celda className="text-tenue">
                  <div>{u.email}</div>
                  {u.telefono && <div className="text-xs">{u.telefono}</div>}
                </Celda>
                <Celda className="text-tenue">{NOMBRE_DE_ROL[u.rol] ?? u.rol}</Celda>
                <Celda>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                      u.activo ? 'border-ink/20 text-ink' : 'border-linea text-apagado'
                    }`}
                  >
                    {u.activo ? 'Activa' : 'Desactivada'}
                  </span>
                </Celda>
                <Celda>
                  {puedeEscribir && (
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <Accion onClick={() => setEditando(u)}>Editar</Accion>
                      <Accion onClick={() => void resetearPassword(u)}>Resetear contraseña</Accion>
                      {/* Desactivarse a uno mismo deja a la persona afuera en el
                          pedido siguiente. El backend lo rechaza; acá además no
                          se ofrece. */}
                      {u.id !== yo.id && (
                        <Accion onClick={() => void alternarActivo(u)}>
                          {u.activo ? 'Desactivar' : 'Reactivar'}
                        </Accion>
                      )}
                    </div>
                  )}
                </Celda>
              </tr>
            ))}

            {!cargando && usuarios.length === 0 && (
              <FilaVacia columnas={5}>
                No hay cuentas que coincidan con la búsqueda.
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

function Accion({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Boton variante="enlace"
      type="button"
      onClick={onClick}>
      {children}
    </Boton>
  )
}

/**
 * La contraseña temporal, mostrada una sola vez.
 *
 * Sirve para el alta y para el reseteo: es el mismo hecho —el sistema generó una
 * credencial que hay que pasar por WhatsApp— y no se puede volver a consultar.
 */
function PasswordNueva({
  de,
  valor,
  onCerrar,
}: {
  de: string
  valor: string
  onCerrar: () => void
}) {
  return (
    <div className="mb-6 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <h3 className="t-seccion">Contraseña de {de}</h3>
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        Pasásela por WhatsApp. El sistema le va a pedir que la cambie cuando entre, y{' '}
        <strong className="text-ink">vence a los 7 días</strong> si no la usa.{' '}
        <strong className="text-ink">No se puede volver a ver:</strong> si se pierde, hay que
        generar otra.
      </p>
      <p className="mt-3 rounded-md border border-linea bg-superficie-2 px-4 py-3 font-mono text-lg tracking-wider">
        {valor}
      </p>
      <Boton className="mt-4" onClick={onCerrar}>
        Listo
      </Boton>
    </div>
  )
}

/**
 * Alta de una cuenta desde administración.
 *
 * Es el único camino que permite crear a alguien con rol, y hasta ahora no
 * estaba conectado a ninguna pantalla: dar de alta a Micaela como STAFF exigía
 * llamar la API con `curl`.
 */
function FormularioCuenta({
  puedeAsignarRol,
  onCerrar,
  onCreada,
}: {
  puedeAsignarRol: boolean
  onCerrar: () => void
  onCreada: (nombre: string, password: string) => void
}) {
  const [datos, setDatos] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: 'USUARIO' as Rol,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      const resultado = await altaUsuario({
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        telefono: datos.telefono || undefined,
        // Un STAFF que mandara un rol recibiría USUARIO igual: lo decide el
        // backend. Acá directamente no se le ofrece el campo.
        rol: puedeAsignarRol ? datos.rol : undefined,
      })
      onCreada(
        `${resultado.usuario.nombre} ${resultado.usuario.apellido}`,
        resultado.passwordTemporal,
      )
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <h3 className="t-seccion mb-4">Nueva cuenta</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre"
          value={datos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
          required
          autoFocus
        />
        <Campo
          etiqueta="Apellido"
          value={datos.apellido}
          onChange={cambiar('apellido')}
          error={errores.apellido}
          required
        />
        <Campo
          etiqueta="Email"
          type="email"
          value={datos.email}
          onChange={cambiar('email')}
          error={errores.email}
          required
        />
        <Campo
          etiqueta="Teléfono"
          type="tel"
          value={datos.telefono}
          onChange={cambiar('telefono')}
          error={errores.telefono}
        />
        {puedeAsignarRol && (
          <CampoSelect etiqueta="Rol" value={datos.rol} onChange={cambiar('rol')}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_DE_ROL[r]}
              </option>
            ))}
          </CampoSelect>
        )}
      </div>

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Creando…' : 'Crear cuenta'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}

/** Edición de los datos de contacto, y del rol si quien edita es ADMIN. */
function FormularioEdicion({
  usuario,
  puedeAsignarRol,
  esUnoMismo,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioResumen
  puedeAsignarRol: boolean
  esUnoMismo: boolean
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [datos, setDatos] = useState({
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    telefono: usuario.telefono ?? '',
    rol: usuario.rol,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    try {
      await editarUsuario(usuario.id, {
        nombre: datos.nombre,
        apellido: datos.apellido,
        email: datos.email,
        telefono: datos.telefono || undefined,
        rol: puedeAsignarRol ? datos.rol : undefined,
      })
      onGuardado()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        else setErrorGeneral(e.message)
      } else {
        setErrorGeneral('No se pudo conectar con el servidor.')
      }
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mb-6 rounded-lg border border-linea bg-superficie shadow-tarjeta p-5">
      <h3 className="t-seccion mb-4">
        Editar a {usuario.nombre} {usuario.apellido}
      </h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre"
          value={datos.nombre}
          onChange={cambiar('nombre')}
          error={errores.nombre}
          required
          autoFocus
        />
        <Campo
          etiqueta="Apellido"
          value={datos.apellido}
          onChange={cambiar('apellido')}
          error={errores.apellido}
          required
        />
        <Campo
          etiqueta="Email"
          type="email"
          value={datos.email}
          onChange={cambiar('email')}
          error={errores.email}
          required
        />
        <Campo
          etiqueta="Teléfono"
          type="tel"
          value={datos.telefono}
          onChange={cambiar('telefono')}
          error={errores.telefono}
        />
        {puedeAsignarRol && (
          <CampoSelect
            etiqueta="Rol"
            value={datos.rol}
            onChange={cambiar('rol')}
            // Cambiarse el rol a uno mismo deja al sistema sin administrador si
            // sos el único ADMIN: el backend lo rechaza, y acá el campo queda
            // bloqueado para que el clic distraído no exista.
            disabled={esUnoMismo}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {NOMBRE_DE_ROL[r]}
              </option>
            ))}
          </CampoSelect>
        )}
      </div>

      {esUnoMismo && puedeAsignarRol && (
        <p className="mt-3 text-xs text-apagado">
          No podés cambiarte el rol a vos mismo: si sos el único administrador, el sistema
          quedaría sin nadie que pueda administrarlo.
        </p>
      )}

      {errorGeneral && (
        <div className="mt-4">
          <Aviso>{errorGeneral}</Aviso>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Boton type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar'}
        </Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
