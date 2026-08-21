import { NavLink, Outlet } from 'react-router'

import { nombreCompleto, type UsuarioActual } from '../api/tipos'
import { useAuth, useUsuario } from '../auth/contexto'
import { menuPara } from './menu'

/** Etiqueta legible del rol. El enum crudo no se le muestra a nadie. */
const NOMBRE_DE_ROL: Record<UsuarioActual['rol'], string> = {
  ADMIN: 'Administración',
  DIRECTIVO: 'Dirección',
  STAFF: 'Equipo',
  USUARIO: 'Usuario',
}

export function Layout() {
  const { cerrarSesion } = useAuth()
  const usuario = useUsuario()
  const grupos = menuPara(usuario)

  return (
    <div className="flex min-h-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-linea bg-white">
        <div className="border-b border-linea px-5 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-acento">
            La Juanita
          </p>
          <p className="mt-0.5 text-xs text-apagado">Gestión</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-6 last:mb-0">
              <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-apagado">
                {grupo.titulo}
              </p>

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
                              : 'text-ink hover:bg-bone-2/50'
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
                        <span className="text-[9px] uppercase tracking-wider">
                          pronto
                        </span>
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
          <p className="truncate text-xs text-apagado">{usuario.email}</p>
          <button
            type="button"
            onClick={cerrarSesion}
            className="mt-3 text-xs text-tenue underline underline-offset-2 transition-colors hover:text-acento"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-linea bg-white px-8 py-4">
          <h1 className="text-sm font-medium">Hola, {usuario.nombre}</h1>
          <span className="rounded-full border border-linea px-2.5 py-1 text-[11px] uppercase tracking-wider text-tenue">
            {NOMBRE_DE_ROL[usuario.rol]}
          </span>
        </header>

        <main className="flex-1 px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
