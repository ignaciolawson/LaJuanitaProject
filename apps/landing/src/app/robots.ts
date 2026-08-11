import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt
 *
 * No existía. Sin él el sitio igual se rastrea (la ausencia equivale a
 * "permitido todo"), pero se pierden dos cosas: el puntero al sitemap, que es
 * la forma más directa de que un buscador descubra las 21 URLs de una, y el
 * control sobre qué NO indexar.
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
 * `/ingresar` se excluye porque es una pantalla de acceso al campus, sin valor
 * de búsqueda. La página además ya declara `robots: { index: false }`; esto es
 * la otra mitad, que ahorra el rastreo.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/ingresar"],
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
        disallow: ["/ingresar"],
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
