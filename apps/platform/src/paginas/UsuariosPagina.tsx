import { useCallback, useEffect, useState } from 'react'

import {
  altaProfesor,
  altaUsuario,
  cambiarActivoUsuario,
  editarProfesor,
  editarUsuario,
  listarProfesores,
  listarUsuarios,
  resetearPasswordUsuario,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { Rol } from '../api/tipos'
import type { ProfesorResumen, UsuarioResumen } from '../api/tiposAdmin'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { Bloque, Hueco } from '../componentes/Bloque'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
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
  const [error, setError] = useErrorPasajero()

  const [creando, setCreando] = useState(false)
  const [editando, setEditando] = useState<UsuarioResumen | null>(null)

  /**
   * Quiénes son profesores, para poder decirlo en cada fila.
   *
   * ⚠️ **Se cruza acá y no viene en `UsuarioResumen`, a propósito.** Ponerlo en
   * el DTO obliga a resolver la relación por fila —un N+1— o a meter un join en
   * un listado paginado, y lo que se gana es un booleano. La lista de profesores
   * **no pagina y no va a paginar**: su tamaño lo decide la nómina del estudio,
   * que son unas pocas personas, y eso está escrito en `ProfesorRepository` con
   * todas las letras. Traerla entera es un pedido chico y fijo.
   *
   * Con `incluirInactivos` porque acá interesa **la relación**, no si sigue
   * dando clases: alguien de baja ya es profesor, y ofrecerle "Hacer profesor"
   * terminaría en el 409 del UNIQUE.
   */
  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])
  const [tocandoProfesor, setTocandoProfesor] = useState<UsuarioResumen | null>(null)

  const cargarProfesores = useCallback(async () => {
    // Sin `catch` que avise: que falle esta lista no puede romper la pantalla de
    // usuarios, que sirve para otras cinco cosas. Se degrada a no mostrar la
    // columna, no a un error rojo sobre un listado que cargó bien.
    try {
      setProfesores(await listarProfesores(true))
    } catch {
      setProfesores([])
    }
  }, [])

  useEffect(() => {
    void cargarProfesores()
  }, [cargarProfesores])

  const profesorDe = (idUsuario: number) => profesores.find((p) => p.idUsuario === idUsuario)
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
  }, [buscar, pagina, setError])

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
        className={`mb-4 w-full max-w-md ${CONTROL_DE_FILTRO}`}
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

      {tocandoProfesor && (
        <FormularioProfesor
          usuario={tocandoProfesor}
          profesor={profesorDe(tocandoProfesor.id)}
          onCerrar={() => setTocandoProfesor(null)}
          onGuardado={() => {
            setTocandoProfesor(null)
            // Sólo la lista de profesores: el listado de usuarios no cambió, y
            // recargarlo haría saltar la página que se está mirando.
            void cargarProfesores()
          }}
        />
      )}

      {/* ⚠️ **"Rol" y "Profesor" son DOS EJES y por eso son dos columnas.**
          Permisos (qué puede administrar) y relaciones de negocio (si da clases)
          son independientes desde el primer commit de este sistema: Ghezz es
          STAFF *y* profesor *y* alquila cabina, sin ninguna contradicción.
          Mostrarlos en una sola columna los haría ver como valores de la misma
          cosa, que es exactamente el modelo equivocado que este proyecto
          corrigió al principio. */}
      <Tabla columnas={['Persona', 'Contacto', 'Rol', 'Profesor', 'Estado', '']}>
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
                  <RelacionDeProfesor profesor={profesorDe(u.id)} />
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
                      <Accion onClick={() => setTocandoProfesor(u)}>
                        {profesorDe(u.id) ? 'Profesor…' : 'Hacer profesor'}
                      </Accion>
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
 * Si esta persona da clases, dicho en la fila.
 *
 * **De baja NO es "no es profesor"**, y por eso son tres estados y no dos: la
 * fila sigue existiendo, su portal de profesor sigue abierto para ver el
 * historial de lo que dictó, y lo único que cambia es que no se la ofrece al
 * armar una inscripción nueva. Dibujarla como "—" haría que alguien intente
 * hacerla profesor otra vez y se coma el 409 del índice único.
 */
function RelacionDeProfesor({ profesor }: { profesor?: ProfesorResumen }) {
  if (!profesor) return <span className="text-apagado">—</span>

  return (
    <div>
      <div>{profesor.especialidad ?? 'Sin especialidad'}</div>
      {!profesor.activo && <div className="text-xs text-apagado">De baja</div>}
    </div>
  )
}

/**
 * Darle —o corregirle— la relación de profesor a una persona.
 *
 * ⚠️ **Esto no existía en ninguna capa hasta el 2026-09-05** (§14 · B2).
 * `/api/profesores` tenía un solo GET: seis pantallas del Módulo 5, el selector
 * de la inscripción y la agenda del profesor leían una tabla que **nada sabía
 * poblar**, así que la única forma de que alguien fuera profesor era un INSERT a
 * mano. Nada fallaba, porque una capacidad que no existe no tiene nada que
 * romper. Lo encontró Ignacio preguntando lo más simple: *"¿cómo se lo da de
 * alta como profe?"*.
 *
 * **Vive acá y no en una pantalla propia** porque ser profesor es una relación
 * de una persona, y ésta es la pantalla de las personas — la misma donde se
 * otorga el rol, que es el otro eje. Es lo que el modelo de este proyecto dice
 * desde el principio: *una fila de `profesor` se crea dándole la relación a un
 * `usuario`*.
 */
function FormularioProfesor({
  usuario,
  profesor,
  onCerrar,
  onGuardado,
}: {
  usuario: UsuarioResumen
  profesor?: ProfesorResumen
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [especialidad, setEspecialidad] = useState(profesor?.especialidad ?? '')
  const [activo, setActivo] = useState(profesor?.activo ?? true)
  const [error, setError] = useErrorPasajero()
  const [guardando, setGuardando] = useState(false)

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setError(null)
    try {
      if (profesor) {
        await editarProfesor(profesor.idProfesor, { especialidad: especialidad || null, activo })
      } else {
        await altaProfesor({ idUsuario: usuario.id, especialidad: especialidad || undefined })
      }
      onGuardado()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar.')
      setGuardando(false)
    }
  }

  return (
    <Bloque titulo={profesor ? 'Profesor' : 'Hacer profesor'} className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        <p className="mb-4 text-sm text-tenue">
          <span className="font-medium text-texto">
            {usuario.nombre} {usuario.apellido}
          </span>
          {!profesor && (
            <>
              {' '}
              va a poder ver <span className="text-texto">Mi agenda</span>,{' '}
              <span className="text-texto">Mis alumnos</span> y{' '}
              <span className="text-texto">Subir material</span> la próxima vez que entre.
            </>
          )}
        </p>

        <Campo
          etiqueta="Especialidad"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
          placeholder="DJ, Producción, Ableton…"
          ayuda="Opcional. Es una nota para adentro, no cambia ningún permiso."
          autoFocus
        />

        {/* Sólo al editar: alguien recién hecho profesor está activo por
            definición, y ofrecer la casilla en el alta invita a crear una
            relación nacida de baja, que no le sirve a nadie. */}
        {profesor && (
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="mt-1"
            />
            <span>
              Sigue dando clases
              <span className="block text-xs text-tenue">
                Destildado no se ofrece al armar una inscripción nueva. La relación no se
                borra: sigue viendo el historial de las clases que dio.
              </span>
            </span>
          </label>
        )}

        {error && (
          <div className="mt-4">
            <Aviso>{error}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : profesor ? 'Guardar' : 'Hacer profesor'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Bloque>
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
    <Bloque titulo={<>Contraseña de {de}</>} className="mb-6">
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        Pasásela por WhatsApp. El sistema le va a pedir que la cambie cuando entre, y{' '}
        <strong className="text-texto">vence a los 7 días</strong> si no la usa.{' '}
        <strong className="text-texto">No se puede volver a ver:</strong> si se pierde, hay que
        generar otra.
      </p>
      <Hueco className="mt-3 font-mono text-lg tracking-wider">
        {valor}
      </Hueco>
      <Boton className="mt-4" onClick={onCerrar}>
        Listo
      </Boton>
    </Bloque>
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
