import { NavLink, Outlet } from 'react-router'

import { nombreCompleto } from '../api/tipos'
import { useAuth, useUsuario } from '../auth/contexto'
import { NOMBRE_DE_ROL } from '../componentes/presentacion'
import { menuPara } from './menu'
import { Boton } from '../componentes/Boton'

export function Layout() {
  const { cerrarSesion } = useAuth()
  const usuario = useUsuario()
  const grupos = menuPara(usuario)

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-linea bg-superficie">
        <div className="border-b border-linea px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-acento">
            La Juanita
          </p>
          <p className="mt-0.5 text-xs text-apagado">Gestión</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-6 last:mb-0">
              <p className="t-mono px-2 pb-2 text-apagado">{grupo.titulo}</p>

              <ul>
                {grupo.items.map((item) => (
                  <li key={item.ruta}>
                    {item.disponible ? (
                      <NavLink
                        to={item.ruta}
                        end
                        className={({ isActive }: { isActive: boolean }) =>
                          `flex rounded-md px-2 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'bg-ink font-medium text-bone'
                              : 'text-ink hover:bg-superficie-2'
                          }`
                        }
                      >
                        {item.etiqueta}
                      </NavLink>
                    ) : (
                      // El módulo todavía no existe. Se muestra apagado en vez
                      // de esconderse, para que se vea hacia dónde va el
                      // sistema, y no navega, para que nadie confunda una
                      // pantalla vacía con un error.
                      <span
                        aria-disabled="true"
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-apagado"
                      >
                        {item.etiqueta}
                        <span className="t-mono text-[9px]">pronto</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-linea px-5 py-4">
          <p className="truncate text-sm font-medium">{nombreCompleto(usuario)}</p>
          {/* El rol se dice acá y no en una barra superior: es un dato de quién
              sos, y vive junto al nombre y al logout en vez de ocupar una franja
              propia arriba de las 36 pantallas. */}
          <p className="t-mono mt-1 text-tenue">{NOMBRE_DE_ROL[usuario.rol]}</p>
          <p className="mt-1 truncate text-xs text-apagado">{usuario.email}</p>
          <Boton variante="enlace"
            type="button"
            onClick={cerrarSesion} className="mt-3">
            Cerrar sesión
          </Boton>
        </div>
      </aside>

      {/* NO hay barra superior, y es una decisión (Fase 3.1, 2026-08-31).
          Contenía sólo "Hola, X" y el chip de rol: una franja fija en las 36
          pantallas para dos datos que no cambian y que nadie mira dos veces.
          El saludo pasó al Inicio, que es donde §11 lo puso —"Hola, Micaela ·
          Administradora"— y el rol al pie del sidebar.

          La consecuencia es de jerarquía y es la que importa: sin este
          encabezado, **el título de cada pantalla es el `<h1>` de verdad**. Antes
          el `<h1>` del documento decía "Hola, Ignacio" y el nombre de la pantalla
          era un `<h2>`, que es exactamente lo que `CabeceraDePagina` tenía
          anotado para revisar "de una vez, no de a una". */}
      <main className="min-w-0 flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}
