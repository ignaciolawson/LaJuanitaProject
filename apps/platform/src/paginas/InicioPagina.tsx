import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { agenda, listarDeudores, listarSolicitantes } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { miAgenda, misAlumnos } from '../api/docencia'
import {
  listarSolicitudes,
  miEstadoDeCuenta,
  misCursos,
  misMateriales,
  misReservas,
  misSolicitudes,
} from '../api/portal'
import { resumenFinanciero } from '../api/tablero'
import { useUsuario } from '../auth/contexto'
import { Abanico } from '../componentes/Abanico'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { importe } from '../componentes/dinero'
import { NOMBRE_DE_DISCIPLINA, NOMBRE_DE_ROL } from '../componentes/presentacion'
import { diaYMes, hhmm, hoy, sumarDias } from '../componentes/semana'
import { fraseDelDia } from '../datos/frases'
import { puedeOperar, puedeVerElTableroCompleto } from '../layout/menu'

/**
 * El Inicio.
 *
 * **Contesta "¿qué tengo que hacer ahora?", no "¿cómo viene el negocio?"**
 * (`mejoras.md` §11). Lo segundo es el Tablero y ya existe; si esta pantalla
 * empieza a contestarlo también, quedan dos lugares con números solapados que
 * pueden discrepar — exactamente lo que el Módulo 8 evitó al **no** recalcular
 * la caja y traerla de `PagoService.caja`.
 *
 * De ahí salen las tres reglas que la gobiernan:
 *
 * 1. **Solo hoy/ahora.** Sin selector de período y sin gráficos. El único bloque
 *    que mira un rango son los números, y ese rango es fijo —el mes en curso— y
 *    va con su link al Tablero, que es donde se elige un período.
 * 2. **Se compone con los tres predicados que ya existen**, igual que `menu.ts`:
 *    la relación (`esAlumno` / `esProfesor`), `puedeOperar` y
 *    `puedeVerElTableroCompleto`. **Ninguno autoriza nada** — el backend resuelve
 *    el rol contra la base en cada pedido; acá sólo se elige qué pedir.
 *    Consecuencia: un ADMIN ve tareas Y números, un DIRECTIVO sólo números, un
 *    STAFF sólo tareas. Y Ghezz —STAFF *y* profesor— ve el bloque operativo y el
 *    suyo de docencia, sin contradicción.
 * 3. **Las tarjetas vacías se muestran.** Una tarjeta sin contenido dice "no hay
 *    pedidos esperando respuesta"; no se esfuma. Es la misma regla que el informe
 *    de uso de salas, la grilla de ocupación y el semáforo gris del Módulo 5: un
 *    hueco se lee como que el sistema perdió el dato. Y además **"todo al día" es
 *    información**, que es lo que Micaela quiere ver de un vistazo a la mañana.
 *
 * ⚠️ **Cada bloque falla solo.** Son hasta nueve pedidos y se disparan juntos; si
 * uno se cae, esa tarjeta muestra su error y las demás siguen. Con un único
 * estado de error, un endpoint caído dejaría la primera pantalla del sistema en
 * blanco para todo el mundo.
 */
export function InicioPagina() {
  const usuario = useUsuario()
  const opera = puedeOperar(usuario)
  const veLosNumeros = puedeVerElTableroCompleto(usuario)

  // Se calcula una sola vez: si hoy() se recalculara en cada render, cambiaría la
  // identidad del rango y los efectos volverían a pedir para siempre.
  const [rango] = useState(() => ({
    hoy: hoy(),
    enUnMes: sumarDias(hoy(), 28),
    primeroDelMes: hoy().slice(0, 7) + '-01',
  }))

  // Un solo pedido de reservas alimenta dos tarjetas —la próxima reserva y la
  // próxima clase—, que es la diferencia entre lo que uno alquila y lo que cursa.
  const reservas = useDato(() => misReservas(rango.hoy, rango.enUnMes))
  const cuenta = useDato(() => miEstadoDeCuenta())
  const pedidos = useDato(() => misSolicitudes())

  const cursos = useDato(() => misCursos(), usuario.esAlumno)
  const materiales = useDato(() => misMateriales(), usuario.esAlumno)

  const clasesDeHoy = useDato(() => miAgenda(rango.hoy, rango.hoy), usuario.esProfesor)
  const alumnos = useDato(() => misAlumnos(), usuario.esProfesor)

  const agendaDeHoy = useDato(() => agenda({ desde: rango.hoy, hasta: rango.hoy }), opera)
  const pedidosDeSala = useDato(() => listarSolicitudes('PENDIENTE', 0, 1), opera)
  const solicitantes = useDato(() => listarSolicitantes({ estado: 'PENDIENTE' }), opera)
  const deudores = useDato(() => listarDeudores(), opera)

  const numeros = useDato(() => resumenFinanciero(rango.primeroDelMes, rango.hoy), veLosNumeros)

  const proximas = (reservas.dato ?? [])
    .filter((r) => r.estado !== 'CANCELADA' && r.estado !== 'REPROGRAMADA')
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))

  return (
    <div>
      {/* El saludo dice quién sos Y qué sos. Es el lugar natural donde la pantalla
          te dice que sos admin, y con eso cierra §9.5. */}
      <CabeceraDePagina
        titulo={'Hola, ' + usuario.nombre}
        aclaracion={
          <>
            {NOMBRE_DE_ROL[usuario.rol]} · lo que necesita tu atención hoy.
            {veLosNumeros && (
              <>
                {' '}
                Los números del negocio, por período, están en el{' '}
                <Link
                  to="/admin/tablero"
                  className="underline underline-offset-2 hover:text-acento"
                >
                  Tablero
                </Link>
                .
              </>
            )}
          </>
        }
      />

      <FraseDelDia fecha={rango.hoy} />

      <Grupo titulo="Lo mío">
        <Tarjeta
          titulo="Mi próxima reserva"
          estado={reservas}
          enlace={['/mis-reservas', 'Ver mis reservas']}
        >
          {() =>
            proximas.length === 0 ? (
              <Nada>No tenés nada agendado.</Nada>
            ) : (
              <Cuando reserva={proximas[0]} />
            )
          }
        </Tarjeta>

        <Tarjeta
          titulo="Mis pedidos"
          estado={pedidos}
          enlace={['/mis-solicitudes', 'Ver mis pedidos']}
        >
          {(lista) => {
            const esperando = lista.filter((p) => p.estado === 'PENDIENTE')
            return esperando.length === 0 ? (
              <Nada>Ningún pedido esperando respuesta.</Nada>
            ) : (
              <>
                <p className="t-dato">{esperando.length}</p>
                <p className="mt-1 text-sm text-tenue">
                  {esperando.length === 1
                    ? 'pedido esperando respuesta'
                    : 'pedidos esperando respuesta'}
                </p>
              </>
            )
          }}
        </Tarjeta>

        <Tarjeta titulo="Lo que debo" estado={cuenta} enlace={['/mis-pagos', 'Ver mi cuenta']}>
          {(c) => {
            const debe = c.saldos.filter((s) => s.adeudado > 0)
            return debe.length === 0 ? (
              <Nada>Estás al día.</Nada>
            ) : (
              <ul>
                {debe.map((s) => (
                  <li key={s.moneda} className="t-dato text-acento">
                    {importe(s.adeudado, s.moneda)}
                  </li>
                ))}
              </ul>
            )
          }}
        </Tarjeta>
      </Grupo>

      {usuario.esAlumno && (
        <Grupo titulo="Mi formación">
          {/* La cifra que este sistema existe para llevar: `V9` §5 lo dice con
              todas las letras —"¿cuántas clases le quedan a Juan?"—. Si el alumno
              entra y no la ve, el Inicio no sirve. */}
          <Tarjeta
            titulo="Clases que me quedan"
            estado={cursos}
            enlace={['/mis-cursos', 'Ver mis cursos']}
          >
            {(lista) => {
              const vigentes = lista.filter(
                (c) => c.estado === 'ACTIVA' || c.estado === 'PAUSADA',
              )
              return vigentes.length === 0 ? (
                <Nada>No tenés ningún curso vigente.</Nada>
              ) : (
                <ul className="space-y-2">
                  {vigentes.map((c) => (
                    <li key={c.idInscripcion} className="flex items-baseline gap-2">
                      <span className="t-dato">{c.clasesRestantes}</span>
                      <span className="text-sm text-tenue">
                        de {NOMBRE_DE_DISCIPLINA[c.disciplina]}
                        {c.estado === 'PAUSADA' && ' · en pausa'}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }}
          </Tarjeta>

          <Tarjeta
            titulo="Mi próxima clase"
            estado={reservas}
            enlace={['/mis-reservas', 'Ver mis reservas']}
          >
            {() => {
              const clase = proximas.find((r) => r.esClase)
              return clase ? <Cuando reserva={clase} /> : <Nada>No tenés clases agendadas.</Nada>
            }}
          </Tarjeta>

          {/* Se llama "el último" y no "material nuevo": no hay marca de leído en
              ningún lado, así que decir "nuevo" sería afirmar algo que el sistema
              no sabe. */}
          <Tarjeta
            titulo="Mi último material"
            estado={materiales}
            enlace={['/mis-materiales', 'Ver mis materiales']}
          >
            {(lista) => {
              const ultimo = [...lista].sort((a, b) =>
                b.fechaSubida.localeCompare(a.fechaSubida),
              )[0]
              return ultimo ? (
                <>
                  <p className="t-seccion">{ultimo.titulo}</p>
                  <p className="mt-1 text-sm text-tenue">
                    {ultimo.profesor} · {diaYMes(ultimo.fechaSubida.slice(0, 10))}
                  </p>
                </>
              ) : (
                <Nada>Todavía no tenés materiales.</Nada>
              )
            }}
          </Tarjeta>
        </Grupo>
      )}

      {usuario.esProfesor && (
        <Grupo titulo="Mis clases">
          <Tarjeta titulo="Clases de hoy" estado={clasesDeHoy} enlace={['/mi-agenda', 'Ver mi agenda']}>
            {(lista) => {
              const dando = lista.filter(
                (r) => r.estado !== 'CANCELADA' && r.estado !== 'REPROGRAMADA',
              )
              return dando.length === 0 ? (
                <Nada>Hoy no tenés clases.</Nada>
              ) : (
                <ul className="space-y-1 text-sm">
                  {dando.map((r) => (
                    <li key={r.idReserva}>
                      <span className="t-cifra font-medium">{hhmm(r.horaInicio)}</span> · {r.sala}{' '}
                      · <span className="text-tenue">{r.tipoUso}</span>
                    </li>
                  ))}
                </ul>
              )
            }}
          </Tarjeta>

          {/* El semáforo gris del Módulo 5: `null` no es `VA_BIEN`. Encontrar a los
              alumnos que nadie miró es para lo que se abre esa lista, así que el
              Inicio es el mejor lugar para que aparezcan solos. */}
          <Tarjeta
            titulo="Alumnos sin marcar"
            estado={alumnos}
            enlace={['/mis-alumnos', 'Ver mis alumnos']}
          >
            {(lista) => {
              const sinMarcar = lista.filter((a) => a.estadoSeguimiento === null)
              return sinMarcar.length === 0 ? (
                <Nada>Todos tus alumnos tienen seguimiento.</Nada>
              ) : (
                <>
                  <p className="t-dato">{sinMarcar.length}</p>
                  <p className="mt-1 text-sm text-tenue">
                    {sinMarcar.length === 1 ? 'alumno sin mirar' : 'alumnos sin mirar'}
                  </p>
                </>
              )
            }}
          </Tarjeta>
        </Grupo>
      )}

      {opera && (
        <Grupo titulo="Operación">
          <Tarjeta
            titulo="La agenda de hoy"
            estado={agendaDeHoy}
            enlace={['/admin/reservas', 'Abrir el calendario']}
          >
            {(lista) => {
              const vivas = lista.filter(
                (r) => r.estado !== 'CANCELADA' && r.estado !== 'REPROGRAMADA',
              )
              return vivas.length === 0 ? (
                <Nada>Hoy no hay nada reservado.</Nada>
              ) : (
                <>
                  <p className="t-dato">{vivas.length}</p>
                  <p className="mt-1 text-sm text-tenue">
                    {vivas.length === 1 ? 'reserva hoy' : 'reservas hoy'} · desde las{' '}
                    {hhmm(vivas.map((r) => r.horaInicio).sort()[0])}
                  </p>
                </>
              )
            }}
          </Tarjeta>

          <Tarjeta
            titulo="Pedidos de sala"
            estado={pedidosDeSala}
            enlace={['/admin/solicitudes', 'Abrir la bandeja']}
          >
            {(pagina) =>
              pagina.totalElementos === 0 ? (
                <Nada>No hay pedidos esperando respuesta.</Nada>
              ) : (
                <>
                  <p className="t-dato">{pagina.totalElementos}</p>
                  <p className="mt-1 text-sm text-tenue">sin responder</p>
                </>
              )
            }
          </Tarjeta>

          <Tarjeta
            titulo="Solicitantes nuevos"
            estado={solicitantes}
            enlace={['/admin/buzon', 'Abrir el buzón']}
          >
            {(pagina) =>
              pagina.totalElementos === 0 ? (
                <Nada>Nadie escribió desde la web.</Nada>
              ) : (
                <>
                  <p className="t-dato">{pagina.totalElementos}</p>
                  <p className="mt-1 text-sm text-tenue">sin atender</p>
                </>
              )
            }
          </Tarjeta>

          <Tarjeta
            titulo="Deudores"
            estado={deudores}
            enlace={['/admin/deudores', 'Ver los deudores']}
          >
            {(lista) => {
              const vencidos = lista.filter((d) => d.vencido).length
              return lista.length === 0 ? (
                <Nada>No hay deudas anotadas. Todo al día.</Nada>
              ) : (
                <>
                  <p className="t-dato">{lista.length}</p>
                  <p className="mt-1 text-sm text-tenue">
                    {vencidos > 0
                      ? vencidos + ' con más de 7 días'
                      : 'ninguna pasó los 7 días todavía'}
                  </p>
                </>
              )
            }}
          </Tarjeta>
        </Grupo>
      )}

      {veLosNumeros && (
        <Grupo titulo="Los números del mes">
          <Tarjeta
            titulo="Caja del mes"
            estado={numeros}
            enlace={['/admin/tablero', 'Abrir el tablero']}
          >
            {(resumen) =>
              resumen.caja.length === 0 ? (
                <Nada>Todavía no hubo movimientos este mes.</Nada>
              ) : (
                <ul className="space-y-2">
                  {resumen.caja.map((c) => (
                    <li key={c.moneda}>
                      <span className="t-dato">{importe(c.neto, c.moneda)}</span>
                      <span className="ml-2 text-sm text-tenue">neto</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </Tarjeta>

          <Tarjeta
            titulo="Pendiente de cobro"
            estado={numeros}
            enlace={['/admin/deudores', 'Ver los deudores']}
          >
            {(resumen) =>
              resumen.pendientes.length === 0 ? (
                <Nada>No queda nada por cobrar.</Nada>
              ) : (
                <ul className="space-y-2">
                  {resumen.pendientes.map((p) => (
                    <li key={p.moneda}>
                      <span className="t-dato text-acento">{importe(p.monto, p.moneda)}</span>
                      {/* Lo vencido va aparte y no sumado: una deuda de ayer y una
                          de hace tres meses no se reclaman igual, y es la
                          distinción que el aviso automático de §6 usa. */}
                      <span className="ml-2 text-sm text-tenue">
                        {p.vencido > 0
                          ? importe(p.vencido, p.moneda) + ' pasó los 7 días'
                          : 'nada vencido'}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            }
          </Tarjeta>
        </Grupo>
      )}
    </div>
  )
}

// == Las piezas ==============================================================

/**
 * La frase del día.
 *
 * **Es el único lugar de las 36 pantallas donde el sistema no dice un dato**, y
 * es a propósito que sea acá: el Inicio es la única pantalla donde alguien
 * todavía no vino a hacer nada. En cualquier otra sería ruido encima de lo que
 * la persona vino a leer.
 *
 * También es el primer uso de `.t-serif` en toda la plataforma. La familia
 * estaba cargada en el `index.html` desde el principio y no la usaba ni una
 * pantalla: la itálica es el único acento humano de esta marca y estaba
 * declarada, paga y sin estrenar.
 *
 * ⚠️ **La atribución es un link a la fuente y no un nombre suelto.** Es la
 * misma regla que `datos/frases.ts` sostiene con el tipo: si la frase es de
 * alguien, se tiene que poder ir a chequear que la dijo.
 */
function FraseDelDia({ fecha }: { fecha: string }) {
  const frase = fraseDelDia(fecha)

  return (
    <section className="relative mb-8 overflow-hidden rounded-lg bg-shell px-6 py-6 text-shell-texto sm:px-8">
      {/* El abanico como marca de agua. Va recortado por el borde de la banda
          —no entero y centrado— porque así es un gesto de marca y no un dibujo:
          entero pediría ser mirado, y lo que hay que leer acá es la frase. */}
      {/* ⚠️ El `aria-hidden` va en este `<span>` y no en el `<Abanico>`, aunque
          ahí compile: TypeScript exime del chequeo de props a los atributos con
          guion, así que `aria-hidden` sobre un componente propio pasa el
          typecheck **y se descarta en silencio** — `Abanico` no lo reenvía al
          SVG. Compila, se ve igual, y el lector de pantalla lee el dibujo. */}
      <span aria-hidden className="pointer-events-none absolute -top-6 -right-8">
        <Abanico className="h-40 w-auto text-red/12" />
      </span>
      <div aria-hidden className="grano-shell absolute inset-0" />

      <blockquote className="relative max-w-2xl">
        <p className="t-serif text-xl leading-snug sm:text-2xl">{frase.texto}</p>

        {frase.tipo === 'cita' && (
          <footer className="t-mono mt-3 text-shell-tenue">
            <a
              href={frase.fuente}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 transition-colors hover:text-shell-texto"
            >
              {frase.autor}
            </a>
          </footer>
        )}
      </blockquote>
    </section>
  )
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="t-mono mb-3 text-tenue">{titulo}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  )
}

/**
 * Una tarjeta del Inicio.
 *
 * Se hace cargo de los tres estados —cargando, error y dato— para que ninguna
 * tarjeta se olvide de alguno: si cada una los dibujara por su cuenta, la que se
 * olvide del error va a mostrar su vacío, y **"no hay deudores" cuando en
 * realidad el pedido falló** es la peor mentira que puede decir esta pantalla.
 */
function Tarjeta<T>({
  titulo,
  estado,
  enlace,
  children,
}: {
  titulo: string
  estado: Estado<T>
  /** A dónde se va a resolver esto, y con qué palabras. */
  enlace: [string, string]
  children: (dato: T) => ReactNode
}) {
  const [a, texto] = enlace

  return (
    <section className="flex flex-col rounded-lg border border-linea bg-superficie shadow-tarjeta px-5 py-4">
      <h3 className="t-mono text-apagado">{titulo}</h3>

      <div className="mt-3 grow">
        {estado.cargando ? (
          <p className="text-sm text-apagado">Cargando…</p>
        ) : estado.error ? (
          <p className="text-sm text-acento">{estado.error}</p>
        ) : estado.dato !== undefined ? (
          children(estado.dato)
        ) : null}
      </div>

      <Link
        to={a}
        className="mt-4 text-xs text-tenue underline underline-offset-2 hover:text-acento"
      >
        {texto}
      </Link>
    </section>
  )
}

/** El vacío de una tarjeta. Se muestra, no se esconde. */
function Nada({ children }: { children: ReactNode }) {
  return <p className="text-sm text-tenue">{children}</p>
}

function Cuando({
  reserva,
}: {
  reserva: { fecha: string; horaInicio: string; sala: string; tipoUso: string }
}) {
  return (
    <>
      <p className="t-seccion">
        <span className="t-cifra">{diaYMes(reserva.fecha)}</span> a las{' '}
        <span className="t-cifra">{hhmm(reserva.horaInicio)}</span>
      </p>
      <p className="mt-1 text-sm text-tenue">
        {reserva.sala} · {reserva.tipoUso}
      </p>
    </>
  )
}

// == El estado de un bloque ==================================================

type Estado<T> = { cargando: boolean; dato?: T; error?: string }

/**
 * Pide un dato una sola vez, y sólo si a esta persona le corresponde.
 *
 * `activo` es lo que evita pedir algo que va a volver 403: un USUARIO no llama a
 * `/api/pagos/deudores`. **No autoriza nada** —el backend resuelve el rol contra
 * la base en cada pedido—, sólo evita el pedido inútil y el cartel de error.
 *
 * Se llama `useDato` y no `usarDato` por lo mismo que `usePuedeEscribir`: el
 * prefijo `use` lo impone React —y lo verifica el linter—, así que entra en la
 * fila de "nombres que el framework impone" de `CLAUDE.md`. El resto del nombre
 * sigue en castellano, como todo lo demás.
 *
 * La función de carga se guarda en un ref a propósito: se redefine en cada render
 * (es una lambda), y si estuviera en las dependencias del efecto, el efecto se
 * volvería a disparar para siempre.
 */
function useDato<T>(cargar: () => Promise<T>, activo = true): Estado<T> {
  const [estado, setEstado] = useState<Estado<T>>({ cargando: activo })
  const fn = useRef(cargar)
  fn.current = cargar

  useEffect(() => {
    if (!activo) return

    let vivo = true
    fn.current()
      .then((dato) => {
        if (vivo) setEstado({ cargando: false, dato })
      })
      .catch((e: unknown) => {
        if (vivo) {
          setEstado({
            cargando: false,
            error: e instanceof ApiError ? e.message : 'No se pudo cargar esto.',
          })
        }
      })

    return () => {
      vivo = false
    }
  }, [activo])

  return estado
}
