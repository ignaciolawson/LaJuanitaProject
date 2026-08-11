/**
 * Inserta un bloque de datos estructurados.
 *
 * Es un server component sin `"use client"` a propósito: el JSON-LD tiene que
 * estar en el HTML que sale del servidor. Si lo inyectara un efecto de
 * cliente, Google lo vería igual (renderiza JavaScript) pero los crawlers de
 * los motores de respuesta —que en su mayoría NO ejecutan JS— se llevarían una
 * página sin ninguna descripción del negocio. Justo lo contrario de lo que
 * este marcado existe para lograr.
 *
 * `JSON.stringify` sin espacios y con el escape de `<` para que un `</script>`
 * dentro de un string de contenido no pueda cerrar la etiqueta antes de tiempo.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
