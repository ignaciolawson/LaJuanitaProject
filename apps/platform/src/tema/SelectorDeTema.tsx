import type { Tema } from './tema'

/**
 * El interruptor de tema. Vive en dos lugares: el pie del sidebar y las puertas.
 *
 * **Es un `<button>` a mano por la misma razón que el de cerrar sesión**, y la
 * razón está escrita en `Layout.tsx`: las variantes de `Boton` están
 * calibradas contra el papel y sobre el shell no se ven.
 *
 * ⚠️ **Y por eso tiene dos tonos** (§12 · A6). En la puerta el interruptor va
 * en la mitad de papel —la de tinta es la marca y no cambia—, o sea sobre otra
 * superficie, con otros tokens. Es la misma partición que `Boton` documenta;
 * la diferencia es que acá son dos juegos de un solo control y no la promesa de
 * duplicar cada variante futura.
 *
 * **Dice a dónde va, no dónde está.** "Tema oscuro" estando en claro es una
 * acción; "Tema claro" estando en claro es una etiqueta que parece un estado y
 * hace dudar de qué pasa si la tocás. Es la misma razón por la que el sistema
 * escribe "Anular" y no "Anulado" en sus botones.
 */
const TONO = {
  shell: {
    texto: 'text-shell-tenue hover:text-shell-texto',
    riel: 'border-shell-linea',
    encendido: 'bg-shell-acento/70',
    apagado: 'bg-shell-activo',
    perilla: 'bg-shell-texto',
  },
  lienzo: {
    texto: 'text-tenue hover:text-texto',
    riel: 'border-linea-control',
    encendido: 'bg-acento/70',
    apagado: 'bg-superficie-2',
    perilla: 'bg-texto',
  },
}

export function SelectorDeTema({
  tema,
  alternar,
  tono = 'shell',
}: {
  tema: Tema
  alternar: () => void
  tono?: keyof typeof TONO
}) {
  const vaHacia = tema === 'claro' ? 'oscuro' : 'claro'
  const c = TONO[tono]

  return (
    <button
      type="button"
      onClick={alternar}
      // `aria-pressed` y no un `role="switch"`: para quien usa lector de
      // pantalla esto es un botón que alterna, y el estado que importa es si
      // el tema oscuro está puesto o no.
      aria-pressed={tema === 'oscuro'}
      className={`flex items-center gap-2 text-xs font-medium transition-colors ${c.texto}`}
    >
      <span
        aria-hidden
        className={`relative h-3.5 w-6 shrink-0 rounded-full border transition-colors ${c.riel} ${
          tema === 'oscuro' ? c.encendido : c.apagado
        }`}
      >
        <span
          className={`absolute top-0.5 h-2 w-2 rounded-full transition-[left] duration-200 ${c.perilla} ${
            tema === 'oscuro' ? 'left-3' : 'left-0.5'
          }`}
        />
      </span>
      Tema {vaHacia}
    </button>
  )
}
