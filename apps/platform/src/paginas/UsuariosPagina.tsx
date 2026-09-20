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
import type { GrupoDeCuentas, UsuarioResumen } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque } from '../componentes/Bloque'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { Campo, CampoSelect } from '../componentes/Campo'
import { Paginado } from '../componentes/Paginado'
import { PasswordNueva, type MotivoDeLaClave } from '../componentes/PasswordNueva'
import { useUsuario } from '../auth/contexto'
import { puedeOperar } from '../layout/menu'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { AvisoSoloLectura } from '../componentes/SoloLectura'
import { NOMBRE_DE_ROL } from '../componentes/presentacion'
import { TraerALaVista } from '../componentes/TraerALaVista'

const ROLES = Object.keys(NOMBRE_DE_ROL) as Rol[]

/**
 * El Directorio —todas las personas con cuenta— y, con `grupo`, una de sus
 * partes: el Equipo (P77).
 *
 * Es la única pantalla donde una persona se ve **entera**, con sus dos ejes: el
 * rol (permisos, lo que Spring Security lee) y las relaciones (alumno,
 * profesor — lo que arma el portal). Acá se otorga el rol y se administra la
 * cuenta; las relaciones se dan en Alumnos y Profesores, que son sus índices.
 * Hasta la §19 esta pantalla se llamaba "Personas" y tenía un botón *"Hacer
 * profesor"* por fila — el modelo asomando por la pantalla en vez del trámite.
 *
 * Con `grupo="EQUIPO"` lista sólo los roles administrativos, con el admin
 * adentro (P77 · 2), y **filtra el servidor**: hacerlo acá sobre una página de
 * veinte sería el listado que miente a los veintiuno.
 */
export function UsuariosPagina({ grupo = 'TODOS' }: { grupo?: GrupoDeCuentas }) {
  const yo = useUsuario()
  const puedeEscribir = puedeOperar(yo)
  const esEquipo = grupo === 'EQUIPO'

  const [usuarios, setUsuarios] = useState<UsuarioResumen[]>([])
  const [total, setTotal] = useState(0)
  const [totalPaginas, setTotalPaginas] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<UsuarioResumen | null>(null)

  // La clave recién generada, con la persona entera: el botón de WhatsApp
  // necesita el teléfono y el mail, no sólo el nombre para el título.
  const [passwordGenerada, setPasswordGenerada] = useState<{
    de: UsuarioResumen
    valor: string
    motivo: MotivoDeLaClave
  } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const resultado = await listarUsuarios({ buscar, pagina, grupo })
      setUsuarios(resultado.contenido)
      setTotal(resultado.totalElementos)
      setTotalPaginas(resultado.totalPaginas)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [buscar, pagina, grupo, setError])

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
        de: resultado.usuario,
        valor: resultado.passwordTemporal,
        motivo: 'reseteo',
      })
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar la contraseña.')
    }
  }

  return (
    <div>
      <CabeceraDePagina
        titulo={esEquipo ? 'Equipo' : 'Directorio'}
        aclaracion={
          <>
            {cargando ? 'Cargando…' : `${total} ${total === 1 ? 'cuenta' : 'cuentas'}`}
            {esEquipo
              ? ' · quienes administran La Juanita: admin, dirección y staff'
              : ' · todas las personas con cuenta, sean lo que sean para el estudio'}
          </>
        }
        acciones={
          <>
            {/* DIRECTIVO lee todo y no escribe nada: no se le ofrece lo que el
                backend le va a negar. Y en Equipo el alta sólo se le ofrece al
                ADMIN, porque sólo él puede dar un rol: una cuenta creada por
                STAFF nace USUARIO y no aparecería en esta lista. */}
            {puedeEscribir && (!esEquipo || yo.rol === 'ADMIN') && (
              <Boton onClick={() => setCreando(true)}>Nueva cuenta</Boton>
            )}
          </>
        }
      />

      <AvisoSoloLectura />

      <input
        type="search"
        value={buscar}
        onChange={(e) => cambiarBusqueda(e.target.value)}
        placeholder="Buscar por nombre, apellido o email…"
        className={`mb-4 w-full max-w-md ${CONTROL_DE_FILTRO}`}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {passwordGenerada && (
        <TraerALaVista>
          <PasswordNueva
            de={passwordGenerada.de}
            valor={passwordGenerada.valor}
            motivo={passwordGenerada.motivo}
            onCerrar={() => setPasswordGenerada(null)}
          />
        </TraerALaVista>
      )}

      {creando && (
        <TraerALaVista>
          <FormularioCuenta
            puedeAsignarRol={yo.rol === 'ADMIN'}
            onCerrar={() => setCreando(false)}
            onCreada={(usuario, password) => {
              setCreando(false)
              setPasswordGenerada({ de: usuario, valor: password, motivo: 'cuenta-nueva' })
              void cargar()
            }}
          />
        </TraerALaVista>
      )}

      {editando && (
        <TraerALaVista>
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
        </TraerALaVista>
      )}

      {/* ⚠️ **"Rol" y "Relaciones" son DOS EJES y por eso son dos columnas.**
          Permisos (qué puede administrar) y relaciones de negocio (si cursa, si
          da clases) son independientes desde el primer commit de este sistema:
          Ghezz es STAFF *y* profesor *y* alquila cabina, sin ninguna
          contradicción. Mostrarlos en una sola columna los haría ver como
          valores de la misma cosa, que es exactamente el modelo equivocado que
          este proyecto corrigió al principio. */}
      <Tabla columnas={['Persona', 'Contacto', 'Rol', 'Relaciones', 'Estado', '']}>
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
                <Celda className="text-tenue">
                  <Relaciones usuario={u} />
                </Celda>
                <Celda>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                      u.activo ? 'border-texto/20 text-texto' : 'border-linea text-apagado'
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
              <FilaVacia columnas={6}>
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

/**
 * Qué es esta persona para el estudio, dicho en la fila. Vacío es "sólo tiene
 * cuenta": alguien que alquiló una cabina o se registró desde la web.
 *
 * Es un dato y no un botón: la relación se da en Alumnos y en Profesores, que
 * son sus índices (P77). Acá se la ve, para que la persona se lea entera.
 */
function Relaciones({ usuario }: { usuario: UsuarioResumen }) {
  const cuales = [usuario.esAlumno && 'Alumno', usuario.esProfesor && 'Profesor'].filter(Boolean)
  if (cuales.length === 0) return <span className="text-apagado">—</span>
  return <>{cuales.join(' · ')}</>
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
  onCreada: (usuario: UsuarioResumen, password: string) => void
}) {
  const [datos, setDatos] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    rol: 'USUARIO' as Rol,
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
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
      onCreada(resultado.usuario, resultado.passwordTemporal)
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
    <Bloque titulo="Nueva cuenta" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
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
    </Bloque>
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
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
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
    <Bloque titulo={<>Editar a {usuario.nombre} {usuario.apellido}</>} className="mb-6">
      <form onSubmit={onSubmit} noValidate>
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
    </Bloque>
  )
}
