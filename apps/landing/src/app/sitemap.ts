import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo";
import { PROGRAMS } from "@/data/programs";
import { POSTS } from "@/data/posts";

/**
 * sitemap.xml
 *
 * No existía. En un sitio de 21 URLs sin enlaces entrantes todavía, es la
 * diferencia entre que Google descubra las páginas de a poco siguiendo enlaces
 * y que las conozca todas desde la primera visita.
 *
 * ── Sobre las prioridades ──
 *
 * `priority` es una señal débil y relativa: no le dice a Google qué tan
 * importante es una página en internet, sólo cómo se ordenan entre ellas
 * dentro de este sitio. El orden acá sigue la intención comercial: las páginas
 * de programa son las que capturan la búsqueda con intención de compra ("curso
 * de dj en pilar"), así que van arriba de los índices que sólo listan.
 *
 * `/ingresar` no está, y es a propósito: está excluida en `robots.ts` y marcada
 * `noindex`. Meterla acá sería pedirle a Google que rastree algo que en la
 * misma respuesta le pedimos que ignore — la clase de señal contradictoria que
 * ensucia el informe de cobertura de Search Console.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  }[] = [
    { path: "/", priority: 1, changeFrequency: "monthly" },
    { path: "/programas", priority: 0.9, changeFrequency: "monthly" },
    { path: "/servicios", priority: 0.9, changeFrequency: "monthly" },
    { path: "/equipos", priority: 0.7, changeFrequency: "monthly" },
    { path: "/sello", priority: 0.7, changeFrequency: "monthly" },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" },
    { path: "/profesores", priority: 0.6, changeFrequency: "yearly" },
    { path: "/nosotros", priority: 0.6, changeFrequency: "yearly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/contacto", priority: 0.8, changeFrequency: "yearly" },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),

    // Detalle de programas: la intención de compra cae acá, no en el índice.
    ...PROGRAMS.map((program) => ({
      url: absoluteUrl(`/programas/${program.slug}`),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),

    // Notas: `lastModified` sale de la fecha real de la nota y no de `now`.
    // Poner la fecha de build en todo es lo que hace que un sitemap deje de
    // servir — si todo cambió hoy, nada cambió.
    ...POSTS.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: new Date(post.date),
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
  ];
}
