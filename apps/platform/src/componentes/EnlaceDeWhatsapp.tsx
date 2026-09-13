/**
 * El link a WhatsApp.
 *
 * Es un `<a>` y no un `<button>` **a propósito**: abre otra aplicación, así que
 * tiene que poder abrirse en otra pestaña, copiarse y todo lo que un link hace.
 * Se dibuja como un botón para que se lea como una acción, que es lo que es:
 * secundario adentro de un resultado, donde lo principal ya pasó; principal en
 * la ficha de equipos, donde escribir ES el trabajo.
 *
 * Vivía adentro del buzón; salió a `componentes/` el 2026-09-12 cuando la
 * contraseña reseteada también se manda por acá (Directorio, Equipo y
 * Profesores), para que el link se dibuje igual en todos lados.
 */
export function EnlaceDeWhatsapp({
  href,
  variante = 'secundario',
  children,
}: {
  href: string
  variante?: 'principal' | 'secundario'
  children: React.ReactNode
}) {
  const estilo =
    variante === 'principal'
      ? 'rounded-md bg-accion px-4 py-2.5 text-sm text-accion-texto hover:bg-red hover:text-bone'
      : 'rounded-md border border-linea-control bg-superficie px-3 py-1.5 text-xs text-texto hover:border-red hover:text-acento'
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={`inline-block font-medium transition-colors ${estilo}`}
    >
      {children}
    </a>
  )
}
