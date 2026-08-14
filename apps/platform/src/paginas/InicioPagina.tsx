import { useUsuario } from '../auth/contexto'

/**
 * Primera pantalla protegida. Deliberadamente no hace nada útil todavía:
 * su trabajo es probar que el circuito completo cierra (Postgres → JPA →
 * REST → credencial firmada → ruta protegida) y mostrar qué devolvió
 * `GET /api/me`, que es de donde sale el menú.
 *
 * Se reemplaza por el panel real cuando exista el módulo de alumnos.
 */
export function InicioPagina() {
  const usuario = useUsuario()

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold tracking-tight">Entraste al sistema</h2>
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        El login funciona de punta a punta. Todavía no hay módulos: el primero
        es Alumnos, en septiembre. Las secciones apagadas del menú son las que
        vienen.
      </p>

      <section className="mt-8 rounded-lg border border-linea bg-white">
        <h3 className="border-b border-linea px-5 py-3 text-xs font-semibold uppercase tracking-wider text-tenue">
          Lo que devolvió <code className="font-mono">GET /api/me</code>
        </h3>

        <dl className="divide-y divide-linea text-sm">
          <Dato etiqueta="Nombre" valor={usuario.nombre} />
          <Dato etiqueta="Apellido" valor={usuario.apellido} />
          <Dato etiqueta="Email" valor={usuario.email} />
          <Dato etiqueta="Rol (permisos)" valor={usuario.rol} />
          <Dato etiqueta="¿Es alumno?" valor={usuario.esAlumno ? 'Sí' : 'No'} />
          <Dato etiqueta="¿Es profesor?" valor={usuario.esProfesor ? 'Sí' : 'No'} />
        </dl>
      </section>

      <p className="mt-4 text-xs leading-relaxed text-apagado">
        El rol y las relaciones son dos ejes distintos: el rol dice qué podés
        administrar, las relaciones dicen qué sos para el negocio. Alguien puede
        ser del equipo <em>y</em> profesor <em>y</em> alquilarse una cabina, las
        tres cosas a la vez.
      </p>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex gap-4 px-5 py-3">
      <dt className="w-40 shrink-0 text-tenue">{etiqueta}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  )
}
