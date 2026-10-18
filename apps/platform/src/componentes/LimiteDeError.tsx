import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { Boton } from './Boton'
import { PantallaDeEstado } from './PantallaDeEstado'

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
    <PantallaDeEstado
      role="alert"
      codigo="ERR"
      pista="SE TRABÓ EL PLATO"
      titular="Se rayó el vinilo."
      remate="Saltó esta pantalla; el resto del sistema sigue sonando."
      acciones={
        <>
          <Boton type="button" onClick={reintentar}>
            Intentar de nuevo
          </Boton>
          <Boton type="button" variante="secundario" onClick={() => navegar('/')}>
            Volver al inicio
          </Boton>
        </>
      }
    >
      Esta pantalla se rompió al dibujarse. Si vuelve a pasar, avisá copiando esto:
      <Detalle error={error} donde={ubicacion.pathname} />
    </PantallaDeEstado>
  )
}

/**
 * Fuera del router: se rompió el marco. No hay `Link` posible —el router puede
 * ser lo que se rompió— así que las dos salidas son navegaciones del navegador.
 */
function AplicacionRota({ error }: { error: Error }) {
  return (
    <div className="min-h-full px-6 py-12 lg:px-16">
      <PantallaDeEstado
        role="alert"
        codigo="ERR"
        pista="SIN SEÑAL"
        titular="Se cortó la luz en la cabina."
        remate="Esta vez no fue una pantalla: se cayó el sistema entero."
        acciones={
          <>
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
          </>
        }
      >
        El sistema se rompió. Recargá la página; si vuelve a pasar, avisá copiando esto:
        <Detalle error={error} donde={window.location.pathname} />
      </PantallaDeEstado>
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
