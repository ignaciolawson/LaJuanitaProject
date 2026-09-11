import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Abanico } from './Abanico'
import { Boton } from './Boton'

/**
 * Lo que se ve cuando una pantalla tira un error al dibujarse.
 *
 * ⚠️ **Hasta la §16 no había ni uno en toda la SPA**, y la consecuencia fue el
 * hallazgo A6: un `null` en una fecha desmontaba el árbol entero y quedaba el
 * fondo del tema — que en oscuro es negro. Lo que Ignacio pudo reportar fue
 * *"se pone todo en negro"*, porque no había más para ver. **Sin esto todo bug
 * de render se ve igual, y eso no sólo arruina el diagnóstico: arruina el
 * reporte.** Una pantalla que explica el error convierte un reporte inservible
 * en uno accionable (`mejoras.md` §16 · A6).
 *
 * Son dos alcances porque son dos preguntas distintas:
 *
 *   pantalla    la que se rompió es UNA pantalla. El sidebar sigue, se puede ir
 *               a otra. Vive en el `Layout`, alrededor del `<Outlet />`, con
 *               `key` en el path para que navegar a otra ruta la reinicie sola.
 *   aplicacion  se rompió el marco mismo (el `Layout`, el `AuthProvider`, una
 *               puerta). No hay sidebar al que volver; la salida es recargar.
 *
 * ⚠️ **El mensaje del error se muestra, con el path.** No es para quien usa el
 * sistema —que no lo va a entender— sino para que lo copie tal cual al avisar.
 * *"TypeError: Cannot read properties of null (reading 'slice')"* en
 * `/admin/buzon` es un diagnóstico; *"se pone en negro"* no.
 *
 * Es una clase porque no hay otra forma: `getDerivedStateFromError` no tiene
 * equivalente en hooks, y el `errorElement` de react-router sólo existe en el
 * router de datos, que este sistema no usa.
 */
export class LimiteDeError extends Component<
  { alcance: 'pantalla' | 'aplicacion'; children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(lanzado: unknown) {
    return { error: lanzado instanceof Error ? lanzado : new Error(String(lanzado)) }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // React ya lo loguea en desarrollo; en producción es lo único que queda
    // del stack de componentes, que el mensaje en pantalla no lleva.
    console.error('Pantalla rota:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return this.props.alcance === 'pantalla' ? (
      <PantallaRota error={error} reintentar={() => this.setState({ error: null })} />
    ) : (
      <AplicacionRota error={error} />
    )
  }
}

/** Dentro del `Layout`: la pantalla se rompió y el resto del sistema no. */
function PantallaRota({ error, reintentar }: { error: Error; reintentar: () => void }) {
  const ubicacion = useLocation()
  const navegar = useNavigate()

  return (
    <div role="alert" className="rounded-lg border border-red/30 bg-red/5 px-6 py-8">
      <h1 className="t-titulo">Esta pantalla se rompió</h1>
      <p className="mt-2 max-w-prose text-sm text-tenue">
        El resto del sistema sigue andando. Si vuelve a pasar, avisá copiando esto:
      </p>
      <Detalle error={error} donde={ubicacion.pathname} />
      <div className="mt-5 flex gap-3">
        <Boton type="button" onClick={reintentar}>
          Intentar de nuevo
        </Boton>
        <Boton type="button" variante="secundario" onClick={() => navegar('/')}>
          Volver al inicio
        </Boton>
      </div>
    </div>
  )
}

/**
 * Fuera del router: se rompió el marco. No hay `Link` posible —el router puede
 * ser lo que se rompió— así que las dos salidas son navegaciones del navegador.
 */
function AplicacionRota({ error }: { error: Error }) {
  return (
    <div role="alert" className="grid min-h-full place-items-center px-6 py-12">
      <div className="flex max-w-lg flex-col items-center text-center">
        <Abanico className="mb-5 h-10 w-auto text-linea" arco={false} />
        <h1 className="t-titulo">El sistema se rompió</h1>
        <p className="mt-2 text-sm text-tenue">
          Recargá la página. Si vuelve a pasar, avisá copiando esto:
        </p>
        <Detalle error={error} donde={window.location.pathname} />
        <div className="mt-5 flex gap-3">
          <Boton type="button" onClick={() => window.location.reload()}>
            Recargar
          </Boton>
          <Boton
            type="button"
            variante="secundario"
            onClick={() => window.location.assign(import.meta.env.BASE_URL ?? '/')}
          >
            Volver al inicio
          </Boton>
        </div>
      </div>
    </div>
  )
}

/** El path y el error, tal cual, para copiar al avisar. */
function Detalle({ error, donde }: { error: Error; donde: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-md border border-linea bg-superficie-2 px-3 py-2 text-left text-xs text-texto">
      {donde}
      {'\n'}
      {error.name}: {error.message}
    </pre>
  )
}
