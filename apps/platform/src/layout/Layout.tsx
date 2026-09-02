import { NavLink, Outlet } from 'react-router'

import { nombreCompleto } from '../api/tipos'
import { useAuth, useUsuario } from '../auth/contexto'
import { Abanico } from '../componentes/Abanico'
import { NOMBRE_DE_ROL } from '../componentes/presentacion'
import { SelectorDeTema } from '../tema/SelectorDeTema'
import { useTema } from '../tema/useTema'
import type { ItemMenu } from './menu'
import { menuPara } from './menu'
import type { Contadores } from './usePendientes'
import { usePendientes } from './usePendientes'

/**
 * El armazón de la aplicación: la navegación y el trabajo, en dos superficies.
 *
 * **Las dos superficies son distintas a propósito** (Fase 3.1, `index.css`). La
 * decisión vieja —todo claro porque se mira ocho horas por día— era correcta
 * para la superficie donde se leen tablas de treinta filas, y equivocada para la
 * navegación, que no se lee: se recorre. Partirlo deja entrar la marca por el
 * shell, que es donde no le compite a ningún dato.
 *
 * **Y el shell sigue al tema** (§12 · A4, decisión de Ignacio): en claro es
 * hueso, en oscuro tinta. Los colores no están acá sino en los tokens
 * `--shell-*`, así que esta columna no sabe que existen dos temas.
 *
 * **NO hay barra superior**, y también es una decisión. Contenía sólo "Hola, X" y
 * el chip de rol: una franja fija en las 36 pantallas para dos datos que nadie
 * mira dos veces. El saludo pasó al Inicio, donde §11 lo puso, y el rol al pie de
 * esta columna. La consecuencia es de jerarquía y es la que importa: sin ese
 * encabezado, **el título de cada pantalla es el `<h1>` de verdad**.
 */
export function Layout() {
  const { cerrarSesion } = useAuth()
  const usuario = useUsuario()
  const grupos = menuPara(usuario)
  const { tema, alternar } = useTema(usuario)
  const { contadores } = usePendientes(usuario)

  return (
    <div className="flex min-h-full">
      {/* `h-screen` + `sticky`: con siete grupos y treinta y un ítems, un ADMIN
          tiene más menú que pantalla. La columna se queda quieta y scrollea sólo
          la lista; la marca y la identidad no se van de la vista. */}
      <aside className="costura-shell grano-shell sticky top-0 z-10 flex h-screen w-60 shrink-0 flex-col overflow-hidden bg-shell text-shell-texto">
        {/* La marca, que en el resto del sistema no aparece: el abanico está
            reservado para login, vacíos y acá. ⚠️ El rojo va en
            `--shell-acento`, que es el que está calibrado contra el fondo del
            shell de cada tema: sobre el hueso del claro, `--red` mide 2,98:1 y
            la barra del ítem activo es información, no adorno. */}
        <div className="flex items-center gap-3 border-b border-shell-linea px-5 py-5">
          <Abanico className="h-9 w-auto shrink-0 text-shell-acento" />
          <div className="min-w-0">
            <p className="t-mono text-shell-texto">La Juanita</p>
            <p className="t-mono text-shell-tenue">Gestión</p>
          </div>
        </div>

        <nav className="zona-shell flex-1 overflow-y-auto py-5">
          {grupos.map((grupo) => (
            <div key={grupo.titulo} className="mb-6 last:mb-0">
              {/* Título de dominio y etiqueta de ítem comparten color: lo que los
                  separa es la tipografía —mono en versalita contra texto
                  corrido—, que es como esta marca jerarquiza en los dos lados. */}
              <p className="t-mono px-5 pb-2 text-shell-tenue">{grupo.titulo}</p>

              <ul>
                {grupo.items.map((item) => (
                  <li key={item.ruta}>
                    {item.disponible ? (
                      <NavLink
                        to={item.ruta}
                        end
                        className={({ isActive }: { isActive: boolean }) =>
                          // El borde va siempre, transparente cuando no está
                          // activo: si apareciera sólo al activarse, el texto se
                          // correría dos píxeles cada vez que navegás.
                          `flex items-center justify-between gap-2 border-l-2 py-1.5 pr-3 pl-3.5 text-sm transition-colors ${
                            isActive
                              ? 'border-shell-acento bg-shell-activo font-medium text-shell-texto'
                              : 'border-transparent text-shell-tenue hover:bg-shell-activo hover:text-shell-texto'
                          }`
                        }
                      >
                        <span className="truncate">{item.etiqueta}</span>
                        <Pastilla item={item} contadores={contadores} />
                      </NavLink>
                    ) : (
                      // El módulo todavía no existe. Se muestra apagado en vez
                      // de esconderse, para que se vea hacia dónde va el
                      // sistema, y no navega, para que nadie confunda una
                      // pantalla vacía con un error.
                      <span
                        aria-disabled="true"
                        className="flex items-center justify-between border-l-2 border-transparent py-1.5 pr-3 pl-3.5 text-sm text-shell-tenue opacity-60"
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

        <div className="border-t border-shell-linea px-5 py-4">
          <p className="truncate text-sm font-medium text-shell-texto">
            {nombreCompleto(usuario)}
          </p>
          {/* El rol se dice acá y no en una barra propia arriba de las 36
              pantallas: es un dato de quién sos, y vive junto al nombre. */}
          <p className="t-mono mt-1 text-shell-tenue">{NOMBRE_DE_ROL[usuario.rol]}</p>
          <p className="mt-1 truncate text-xs text-shell-tenue">{usuario.email}</p>

          {/* ⚠️ El único `<button>` a mano que queda en la aplicación, y es
              deliberado: las variantes de `Boton` están calibradas contra el
              papel —`text-tenue`, `hover:text-acento`— y sobre tinta no se ven.
              Darle a `Boton` un juego de colores para el shell obligaría a que
              cada variante futura tenga su gemela oscura, para un solo control.
              El shell tiene una paleta propia y este es su único botón. */}
          <div className="mt-3 flex flex-col gap-2.5">
            <SelectorDeTema tema={tema} alternar={alternar} />
            <button
              type="button"
              onClick={cerrarSesion}
              className="self-start text-xs font-medium text-shell-tenue underline underline-offset-2 transition-colors hover:text-shell-acento"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}

/**
 * El número al lado de un ítem del menú (`mejoras.md` §13 · B1).
 *
 * ⚠️ **Cero no se dibuja, y tampoco se dibuja lo que no vino.** Son dos motivos
 * distintos para no mostrar nada y los dos importan:
 *
 * - Un `(0)` fijo en cuatro ítems, en las 36 pantallas, es ruido permanente que
 *   además entrena a no mirar el lugar donde después aparece el número que sí
 *   importa. La ausencia de pastilla ya dice "no hay nada".
 * - Un contador que no llegó —el pedido falló— queda en `undefined` y el ítem se
 *   dibuja como se dibujaba antes de que esto existiera. Inventar un cero ahí
 *   sería afirmar que la bandeja está vacía sin haberla podido mirar.
 *
 * Y **no usa el rojo de la marca**, que en este sistema es un bisturí: un acento
 * por pantalla. Cuatro pastillas rojas fijas en la columna se comerían al único
 * rojo que tiene que resaltar. Va en el color activo del shell, que es el mismo
 * con el que la columna marca dónde estás parado.
 */
function Pastilla({ item, contadores }: { item: ItemMenu; contadores: Contadores }) {
  if (!item.contador) return null

  const cuantos = contadores[item.contador]
  if (cuantos === undefined || cuantos === 0) return null

  return (
    <span
      className="t-mono shrink-0 rounded-full bg-shell-activo px-1.5 py-0.5 text-[10px] text-shell-texto tabular-nums"
      // El número solo no dice de qué es cuando se lo lee fuera de contexto, que
      // es exactamente cómo lo lee un lector de pantalla al recorrer la lista.
      aria-label={`${cuantos} sin resolver`}
    >
      {cuantos}
    </span>
  )
}
