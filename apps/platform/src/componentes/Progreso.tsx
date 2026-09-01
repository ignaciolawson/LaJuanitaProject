/**
 * El avance de un curso, dibujado como una fila de pasos.
 *
 * **Por qué pasos y no una barra**: los cursos de esta academia son de 8 clases
 * (DJ) y 16 (Producción) — números chicos y contables. Una barra al 62% obliga
 * a hacer la cuenta para saber cuántas clases quedan, que es *la* pregunta que
 * el alumno vino a hacerse; ocho cuadraditos con cinco llenos se leen sin
 * contar. Una barra recién gana cuando el total es tan grande que los pasos
 * dejan de distinguirse, y por eso hay un tope.
 *
 * Y de paso se parece a lo que esta gente mira todo el día: la fila de pasos de
 * un secuenciador. No es un chiste visual — es que la forma ya significa
 * "avance por unidades" para quien entra acá.
 *
 * ⚠️ **Es puro CSS.** La plataforma no tiene GSAP ni ninguna librería de
 * animación, y esta pieza no es motivo para sumar una (decisión de Ignacio,
 * 2026-09-01: nada de animaciones pesadas en un sistema que se usa).
 */
export function Progreso({
  hechas,
  total,
  className = '',
}: {
  hechas: number
  total: number
  className?: string
}) {
  /**
   * Arriba de esto los pasos quedan más finos que la separación y la fila se
   * lee como una línea rayada. Ningún curso del catálogo llega acá —el más
   * largo es Producción con 16—, así que el tope es una red y no un caso.
   */
  const MAXIMO_DE_PASOS = 24

  // ⚠️ `total` en cero rompía el cálculo del ancho: daba `width: NaN%`, que el
  // navegador descarta sin decir nada y deja la barra vacía — o sea, un curso
  // sin clases contratadas se veía igual que uno recién empezado.
  const seguro = Math.max(total, 0)
  const llenos = Math.min(Math.max(hechas, 0), seguro)

  if (seguro === 0) {
    return <p className={`text-xs text-apagado ${className}`}>Sin clases contratadas.</p>
  }

  if (seguro > MAXIMO_DE_PASOS) {
    return (
      <div
        className={`h-1.5 overflow-hidden rounded-full bg-linea ${className}`}
        role="img"
        aria-label={`${llenos} de ${seguro} clases tomadas`}
      >
        <div
          className="h-full rounded-full bg-red transition-[width] duration-500"
          style={{ width: `${(llenos / seguro) * 100}%` }}
        />
      </div>
    )
  }

  return (
    // Un solo `role="img"` con su etiqueta, y los pasos ocultos: para un lector
    // de pantalla "5 de 8 clases tomadas" es la información entera. Sin esto
    // serían ocho elementos sin nombre, que es peor que no dibujar nada.
    <div
      className={`flex gap-1 ${className}`}
      role="img"
      aria-label={`${llenos} de ${seguro} clases tomadas`}
    >
      {Array.from({ length: seguro }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-2 flex-1 rounded-sm transition-colors duration-300 ${
            i < llenos ? 'bg-red' : 'bg-linea'
          }`}
        />
      ))}
    </div>
  )
}
