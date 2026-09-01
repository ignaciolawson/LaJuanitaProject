import type { Tema } from './tema'

/**
 * El interruptor de tema, en el pie del sidebar.
 *
 * **Es un `<button>` a mano por la misma razón que el de cerrar sesión**, y la
 * razón está escrita en `Layout.tsx`: las variantes de `Boton` están
 * calibradas contra el papel y sobre tinta no se ven. El shell tiene paleta
 * propia; estos dos son sus únicos controles.
 *
 * **Dice a dónde va, no dónde está.** "Tema oscuro" estando en claro es una
 * acción; "Tema claro" estando en claro es una etiqueta que parece un estado y
 * hace dudar de qué pasa si la tocás. Es la misma razón por la que el sistema
 * escribe "Anular" y no "Anulado" en sus botones.
 */
export function SelectorDeTema({ tema, alternar }: { tema: Tema; alternar: () => void }) {
  const vaHacia = tema === 'claro' ? 'oscuro' : 'claro'

  return (
    <button
      type="button"
      onClick={alternar}
      // `aria-pressed` y no un `role="switch"`: para quien usa lector de
      // pantalla esto es un botón que alterna, y el estado que importa es si
      // el tema oscuro está puesto o no.
      aria-pressed={tema === 'oscuro'}
      className="flex items-center gap-2 text-xs font-medium text-shell-tenue transition-colors hover:text-shell-texto"
    >
      <span
        aria-hidden
        className={`relative h-3.5 w-6 shrink-0 rounded-full border border-shell-linea transition-colors ${
          tema === 'oscuro' ? 'bg-red/70' : 'bg-shell-activo'
        }`}
      >
        <span
          className={`absolute top-0.5 h-2 w-2 rounded-full bg-shell-texto transition-[left] duration-200 ${
            tema === 'oscuro' ? 'left-3' : 'left-0.5'
          }`}
        />
      </span>
      Tema {vaHacia}
    </button>
  )
}
