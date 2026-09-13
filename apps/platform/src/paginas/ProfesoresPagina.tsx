import { useCallback, useEffect, useState } from 'react'

import {
  altaProfesor,
  cambiarActivoUsuario,
  editarProfesor,
  editarUsuario,
  listarProfesores,
  resetearPasswordUsuario,
} from '../api/administracion'
import { ApiError } from '../api/cliente'
import type { ProfesorResumen, UsuarioResumen } from '../api/tiposAdmin'
import { useUsuario } from '../auth/contexto'
import { Aviso, Boton } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { BuscadorDePersonas } from '../componentes/BuscadorDePersonas'
import { Campo } from '../componentes/Campo'
import { CONTROL_DE_FILTRO } from '../componentes/controles'
import { PasswordNueva, type MotivoDeLaClave } from '../componentes/PasswordNueva'
import { usePuedeEscribir, AvisoSoloLectura } from '../componentes/SoloLectura'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { Bloque } from '../componentes/Bloque'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

/**
 * Profesores: quiénes dan clases, con su alta y su edición (P77 · 1).
 *
 * Es el molde de Alumnos, y existe desde la §19 porque hasta entonces esta
 * relación se otorgaba con un botón escondido en la fila del listado de cuentas
 * —*"Hacer profesor"*—: el modelo asomando por la pantalla (*"agregarle la
 * relación a un usuario"*) en vez del trámite (*"dar de alta un profe"*). El
 * backend estaba entero desde §14 · B2; lo que faltaba era el índice.
 *
 * **La lista no pagina y no va a paginar**: su tamaño lo decide la nómina del
 * estudio, y eso está escrito en `ProfesorRepository`. Por defecto muestra sólo
 * a quien sigue dando clases; los de baja se piden, porque **de baja no es "no
 * es profesor"** — la fila sigue, su portal sigue abierto sobre el historial de
 * lo que dictó, y lo único que cambió es que no se lo ofrece en una inscripción
 * nueva.
 *
 * **Tiene lo mismo que Equipo** (Ignacio, 2026-09-12): buscar, editar los datos
 * de la persona, resetear la contraseña y desactivar la cuenta, desde la fila.
 * Son acciones sobre **la cuenta** —las mismas llamadas que hace el Directorio—
 * y conviven con la que es de la relación (*sigue dando clases*, adentro de
 * Editar). Que sean dos cosas distintas se lee en la fila: *De baja* es que no
 * da clases, *cuenta desactivada* es que no entra. La búsqueda filtra acá y no
 * en el servidor, por lo mismo que la lista no pagina: son veinte filas.
 */
export function ProfesoresPagina() {
  const yo = useUsuario()
  const puedeEscribir = usePuedeEscribir()

  const [profesores, setProfesores] = useState<ProfesorResumen[]>([])
  const [incluirInactivos, setIncluirInactivos] = useState(false)
  const [buscar, setBuscar] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  const [mostrandoAlta, setMostrandoAlta] = useState(false)
  const [editando, setEditando] = useState<ProfesorResumen | null>(null)
  const [passwordGenerada, setPasswordGenerada] = useState<{
    de: UsuarioResumen
    valor: string
    motivo: MotivoDeLaClave
  } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setProfesores(await listarProfesores(incluirInactivos))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [incluirInactivos, setError])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function alternarCuenta(profesor: ProfesorResumen) {
    setError(null)
    try {
      await cambiarActivoUsuario(profesor.idUsuario, !profesor.cuentaActiva)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado de la cuenta.')
    }
  }

  async function resetearPassword(profesor: ProfesorResumen) {
    setError(null)
    try {
      const resultado = await resetearPasswordUsuario(profesor.idUsuario)
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

  const activos = profesores.filter((p) => p.activo).length
  const visibles = profesores.filter((p) => coincide(p, buscar))

  return (
    <div>
      <CabeceraDePagina
        titulo="Profesores"
        aclaracion={
          <>
            {cargando
              ? 'Cargando…'
              : `${activos} ${activos === 1 ? 'profesor da' : 'profesores dan'} clases hoy`}
          </>
        }
        acciones={
          <>
            {/* DIRECTIVO lee todo y no escribe nada: no se le ofrece lo que el
                backend le va a negar. */}
            {puedeEscribir && <Boton onClick={() => setMostrandoAlta(true)}>Nuevo profesor</Boton>}
          </>
        }
      />

      <AvisoSoloLectura />

      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <input
          type="search"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por nombre, apellido, email o especialidad…"
          className={`w-full max-w-md ${CONTROL_DE_FILTRO}`}
        />
        <label className="flex items-center gap-2 text-sm text-tenue">
          <input
            type="checkbox"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
          />
          Mostrar también a quienes ya no dan clases
        </label>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {passwordGenerada && (
        <PasswordNueva
          de={passwordGenerada.de}
          valor={passwordGenerada.valor}
          motivo={passwordGenerada.motivo}
          aclaracion={
            passwordGenerada.motivo === 'profesor-nuevo' ? (
              <>
                Cuando entre ya va a ver <span className="text-texto">Mi agenda</span>,{' '}
                <span className="text-texto">Mis alumnos</span> y{' '}
                <span className="text-texto">Subir material</span>.
              </>
            ) : undefined
          }
          onCerrar={() => setPasswordGenerada(null)}
        />
      )}

      {mostrandoAlta && (
        <FormularioAlta
          onCerrar={() => setMostrandoAlta(false)}
          onCreado={(cuentaNueva) => {
            setMostrandoAlta(false)
            if (cuentaNueva) {
              setPasswordGenerada({ ...cuentaNueva, motivo: 'profesor-nuevo' })
            }
            void cargar()
          }}
        />
      )}

      {editando && (
        <FormularioEdicion
          profesor={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            void cargar()
          }}
        />
      )}

      <Tabla columnas={['Profesor', 'Contacto', 'Especialidad', 'Estado', '']}>
        {visibles.map((p) => (
          <tr key={p.idProfesor}>
            <Celda>
              <span className="font-medium">
                {p.apellido}, {p.nombre}
              </span>
              {p.idUsuario === yo.id && <span className="ml-2 text-xs text-apagado">(vos)</span>}
              {p.debeCambiarPassword && (
                <span className="ml-2 text-xs text-apagado">· contraseña sin cambiar</span>
              )}
            </Celda>
            <Celda className="text-tenue">
              <div>{p.email}</div>
              {p.telefono && <div className="text-xs">{p.telefono}</div>}
            </Celda>
            <Celda className="text-tenue">
              {p.especialidad ?? <span className="text-apagado">Sin especialidad</span>}
            </Celda>
            <Celda>
              {/* Dos estados y no uno, porque son dos cosas: la relación (da
                  clases o no) y la cuenta (entra o no). Un profe de baja con la
                  cuenta activa sigue viendo el historial de lo que dictó. */}
              <span
                className={`rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${
                  p.activo ? 'border-texto/20 text-texto' : 'border-linea text-apagado'
                }`}
              >
                {p.activo ? 'Da clases' : 'De baja'}
              </span>
              {!p.cuentaActiva && (
                <span className="ml-2 text-xs text-apagado">· cuenta desactivada</span>
              )}
            </Celda>
            <Celda>
              {puedeEscribir && (
                <div className="flex justify-end gap-3 whitespace-nowrap">
                  <Accion onClick={() => setEditando(p)}>Editar</Accion>
                  <Accion onClick={() => void resetearPassword(p)}>Resetear contraseña</Accion>
                  {/* Desactivarse a uno mismo deja a la persona afuera en el
                      pedido siguiente. El backend lo rechaza; acá además no se
                      ofrece — igual que en Equipo. */}
                  {p.idUsuario !== yo.id && (
                    <Accion onClick={() => void alternarCuenta(p)}>
                      {p.cuentaActiva ? 'Desactivar cuenta' : 'Reactivar cuenta'}
                    </Accion>
                  )}
                </div>
              )}
            </Celda>
          </tr>
        ))}

        {!cargando && visibles.length === 0 && (
          <FilaVacia columnas={5}>
            {buscar
              ? 'No hay profesores que coincidan con la búsqueda.'
              : incluirInactivos
                ? 'Todavía no hay profesores cargados.'
                : 'Nadie da clases hoy.'}
          </FilaVacia>
        )}
      </Tabla>
    </div>
  )
}

/** La búsqueda de la lista: nombre, apellido, email o especialidad, sin acentos ni mayúsculas. */
function coincide(p: ProfesorResumen, buscar: string): boolean {
  const patron = normalizar(buscar)
  if (patron === '') return true
  return [p.nombre, p.apellido, p.email, p.especialidad ?? '']
    .map(normalizar)
    .some((campo) => campo.includes(patron))
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function Accion({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Boton variante="enlace" type="button" onClick={onClick}>
      {children}
    </Boton>
  )
}

/** Lo que `PasswordNueva` necesita de un profesor recién creado, en la forma de una cuenta. */
function cuentaDe(p: ProfesorResumen): UsuarioResumen {
  return {
    id: p.idUsuario,
    nombre: p.nombre,
    apellido: p.apellido,
    email: p.email,
    telefono: p.telefono,
    rol: 'USUARIO',
    activo: p.cuentaActiva,
    debeCambiarPassword: p.debeCambiarPassword,
    esAlumno: false,
    esProfesor: true,
  }
}

/**
 * Alta de un profesor: a alguien que ya tiene cuenta, o creándole la cuenta en
 * el mismo pedido. Es el formulario de alta de Alumnos con otra relación
 * detrás, y por lo mismo: los dos caminos son un solo pedido y una sola
 * transacción, así que si la relación falla no queda una cuenta huérfana.
 *
 * - **Ya tiene cuenta** → `idUsuario`. No hay contraseña que mostrar.
 * - **Es nueva** → `usuarioNuevo`, y el sistema devuelve la contraseña temporal.
 */
function FormularioAlta({
  onCerrar,
  onCreado,
}: {
  onCerrar: () => void
  /** Con cuenta nueva llega la clave para mostrar; con cuenta previa, `null`. */
  onCreado: (cuentaNueva: { de: UsuarioResumen; valor: string } | null) => void
}) {
  const [tieneCuenta, setTieneCuenta] = useState(false)
  const [persona, setPersona] = useState<UsuarioResumen | null>(null)
  const [datos, setDatos] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    especialidad: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useErrorPasajero()
  const [enviando, setEnviando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)

    if (tieneCuenta && !persona) {
      setErrorGeneral('Elegí a la persona, o cargala como cuenta nueva.')
      setEnviando(false)
      return
    }

    try {
      const resultado = await altaProfesor({
        ...(tieneCuenta
          ? { idUsuario: persona!.id }
          : {
              usuarioNuevo: {
                nombre: datos.nombre,
                apellido: datos.apellido,
                email: datos.email,
                telefono: datos.telefono || undefined,
              },
            }),
        especialidad: datos.especialidad || undefined,
      })

      // Sin cuenta nueva no hay contraseña que mostrar: se cierra directo, para
      // no dejar a alguien esperando un dato que no existe. Con cuenta nueva la
      // clave la muestra la pantalla, con el mismo bloque del reseteo.
      onCreado(
        resultado.passwordTemporal
          ? { de: cuentaDe(resultado.profesor), valor: resultado.passwordTemporal }
          : null,
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
    <Bloque titulo="Nuevo profesor" className="mb-6">
      <form onSubmit={onSubmit} noValidate>
        {/* La pregunta va PRIMERO, como en Alumnos: es lo que decide qué campos
            siguen. Ghezz ya tiene cuenta —alquila cabina— y un invitado no. */}
        <fieldset className="mb-4">
          <legend className="t-mono mb-2 text-tenue">¿Ya tiene cuenta?</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tieneCuenta"
                checked={!tieneCuenta}
                onChange={() => {
                  setTieneCuenta(false)
                  setPersona(null)
                  setErrores({})
                }}
              />
              No, es nueva
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="tieneCuenta"
                checked={tieneCuenta}
                onChange={() => {
                  setTieneCuenta(true)
                  setErrores({})
                }}
              />
              Sí, ya se registró
            </label>
          </div>
        </fieldset>

        {tieneCuenta ? (
          <BuscadorDePersonas
            elegida={persona}
            onElegir={setPersona}
            ayuda="Alguien que ya entró al sistema — por ejemplo, para alquilar la cabina."
          />
        ) : (
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
          </div>
        )}

        {/* La especialidad es del profesor, no de la cuenta: va en los dos caminos. */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Especialidad"
            value={datos.especialidad}
            onChange={cambiar('especialidad')}
            placeholder="DJ, Producción, Ableton…"
            ayuda="Opcional. Es una nota para adentro, no cambia ningún permiso."
          />
        </div>

        {errorGeneral && (
          <div className="mt-4">
            <Aviso>{errorGeneral}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={enviando}>
            {enviando ? 'Creando…' : tieneCuenta ? 'Hacer profesor' : 'Crear profesor'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Bloque>
  )
}

/**
 * Editar al profesor: sus datos de contacto, la especialidad, y si sigue dando
 * clases.
 *
 * Son **dos pedidos** porque son dos cosas —la cuenta (`PUT /api/usuarios`) y
 * la relación (`PUT /api/profesores`)— y cada uno va sólo si algo suyo cambió:
 * corregir la especialidad no toca la cuenta, así que un STAFF que edita a
 * Ghezz (que es STAFF) no se come el 403 de la cuenta por una especialidad. Si
 * el primero pasa y el segundo falla, lo que quedó guardado es verdad igual y
 * el error dice qué faltó.
 *
 * **No hay forma de borrarlo, y es deliberado**: dar de baja es `activo: false`.
 * La fila se queda para que quien dejó de dar clases siga viendo el historial de
 * las que dictó y para que esas clases no queden apuntando a nadie.
 */
function FormularioEdicion({
  profesor,
  onCerrar,
  onGuardado,
}: {
  profesor: ProfesorResumen
  onCerrar: () => void
  onGuardado: () => void
}) {
  const [datos, setDatos] = useState({
    nombre: profesor.nombre,
    apellido: profesor.apellido,
    email: profesor.email,
    telefono: profesor.telefono ?? '',
  })
  const [especialidad, setEspecialidad] = useState(profesor.especialidad ?? '')
  const [activo, setActivo] = useState(profesor.activo)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [error, setError] = useErrorPasajero()
  const [guardando, setGuardando] = useState(false)

  function cambiar(campo: keyof typeof datos) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setDatos((previo) => ({ ...previo, [campo]: e.target.value }))
  }

  async function onSubmit(evento: React.FormEvent) {
    evento.preventDefault()
    setGuardando(true)
    setErrores({})
    setError(null)
    try {
      const cuentaCambio =
        datos.nombre !== profesor.nombre ||
        datos.apellido !== profesor.apellido ||
        datos.email !== profesor.email ||
        datos.telefono !== (profesor.telefono ?? '')
      if (cuentaCambio) {
        await editarUsuario(profesor.idUsuario, {
          nombre: datos.nombre,
          apellido: datos.apellido,
          email: datos.email,
          telefono: datos.telefono || undefined,
        })
      }
      const relacionCambio =
        (especialidad || null) !== profesor.especialidad || activo !== profesor.activo
      if (relacionCambio) {
        await editarProfesor(profesor.idProfesor, { especialidad: especialidad || null, activo })
      }
      onGuardado()
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.errores) setErrores(e.errores)
        else setError(e.message)
      } else {
        setError('No se pudo guardar.')
      }
      setGuardando(false)
    }
  }

  return (
    <Bloque titulo={<>Profesor · {profesor.nombreCompleto}</>} className="mb-6">
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
          <Campo
            etiqueta="Especialidad"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
            placeholder="DJ, Producción, Ableton…"
            ayuda="Opcional. Es una nota para adentro, no cambia ningún permiso."
          />
        </div>

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
              Destildado no se ofrece al armar una inscripción nueva. La relación no se borra:
              sigue viendo el historial de las clases que dio.
            </span>
          </span>
        </label>

        {error && (
          <div className="mt-4">
            <Aviso>{error}</Aviso>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Boton>
          <Boton type="button" variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Bloque>
  )
}
