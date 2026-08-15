import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt
 *
 * No existía. Sin él el sitio igual se rastrea (la ausencia equivale a
 * "permitido todo"), pero se pierde el puntero al sitemap, que es la forma más
 * directa de que un buscador descubra las 18 URLs de una.
 *
 * ── Sobre los bots de IA ──
 *
 * Están permitidos explícitamente, y es una decisión, no un descuido. Estos
 * crawlers son los que alimentan las respuestas de ChatGPT, Perplexity, Claude
 * y las AI Overviews de Google: bloquearlos evita que el contenido se use para
 * entrenar, pero también hace imposible que el negocio sea CITADO ahí. Para
 * una academia local que hoy no tiene tráfico orgánico, aparecer en la
 * respuesta de "dónde estudiar DJ en zona norte" vale bastante más que
 * proteger textos de marketing.
 *
 * `Google-Extended` es el caso menos evidente: no es un crawler, es un control
 * sobre el uso de lo ya rastreado por Googlebot en Gemini y las AI Overviews.
 * Bloquearlo no reduce el rastreo, sólo saca al negocio de las respuestas.
 *
 * `CCBot` (Common Crawl) queda afuera: es un dataset de entrenamiento a granel
 * que no cita fuentes ni deriva tráfico. Es el único bloqueo que sale gratis.
 *
 * ── Por qué NO hay `Disallow: /ingresar` ──
 *
 * Lo hubo, con este comentario al lado: *"la página ya declara
 * `robots: { index: false }`; esto es la otra mitad, que ahorra el rastreo"*.
 * **No eran dos mitades: una anulaba a la otra.**
 *
 * Para obedecer un `noindex` hay que leerlo, y para leerlo hay que descargar la
 * página — que es exactamente lo que el `Disallow` prohíbe. Y las catorce
 * páginas del sitio enlazan a `/ingresar` desde el layout (navbar, menú móvil y
 * pie), así que Google descubre la URL igual, ve que no puede rastrearla, nunca
 * llega al `noindex` y **puede indexarla sin contenido**: es lo que Search
 * Console reporta como "Indexada aunque bloqueada por robots.txt".
 *
 * Se elige una de las dos, no se suman. Queda el `noindex`, que es la que
 * efectivamente saca la página del índice; el rastreo de una URL en un sitio de
 * veinte no cuesta nada. Si algún día hiciera falta ahorrarlo, el camino es
 * `rel="nofollow"` en los tres enlaces del layout, no volver a poner esta línea.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        // Bots de motores de respuesta: permitidos para poder ser citados.
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "PerplexityBot",
          "Perplexity-User",
          "ClaudeBot",
          "Claude-User",
          "anthropic-ai",
          "Google-Extended",
          "Applebot-Extended",
          "Bingbot",
        ],
        allow: "/",
      },
      {
        // Entrenamiento a granel sin cita ni tráfico de vuelta.
        userAgent: "CCBot",
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
