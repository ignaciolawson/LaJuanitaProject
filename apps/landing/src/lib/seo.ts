import type { Metadata } from "next";

import { BUSINESS, SITE_URL, verifiedProfiles } from "@/data/business";
import { CONTACT } from "@/data/contact";

/**
 * Plomería de SEO: URLs absolutas, metadata por página y constructores de
 * JSON-LD.
 *
 * Los HECHOS del negocio viven en `data/business.ts`; acá sólo está la forma
 * de expresarlos. Si hay que corregir un dato del local, se corrige allá y
 * cambia en los quince lugares donde se declara.
 */

export { SITE_URL };

/**
 * URL absoluta a partir de una ruta interna. Los `@id` y el sitemap la piden.
 *
 * La barra final de la raíz se saca a propósito. `new URL("/", …)` devuelve
 * `https://lajuanitastudio.com/` **con** barra, pero Next resuelve el
 * `canonical: "/"` a `https://lajuanitastudio.com` **sin** barra. Sin
 * normalizar, el sitemap y el canonical de la home declaraban dos strings
 * distintos para la misma página — que es exactamente la clase de señal
 * contradictoria que un sitemap existe para eliminar.
 */
export function absoluteUrl(path = "/"): string {
  const url = new URL(path, SITE_URL).toString();
  return url === `${SITE_URL}/` ? SITE_URL : url;
}

/**
 * `@id` de la entidad principal.
 *
 * Todos los schemas del sitio apuntan acá en vez de repetir el bloque de la
 * organización. Eso es lo que convierte una pila de fragmentos sueltos en UN
 * grafo con una entidad central: el buscador entiende que el `Course` de
 * producción, el `Service` de cabina y el `BlogPosting` de mastering son del
 * mismo negocio, y no de tres negocios que se llaman parecido.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Imagen social por defecto: la que genera `app/opengraph-image.tsx`.
 *
 * TRAMPA QUE ESTO ARREGLA: la convención de archivo `opengraph-image.tsx`
 * inyecta la imagen sola en el segmento donde vive y en sus hijos… salvo que
 * un hijo declare su propio objeto `openGraph`. Next mergea la metadata campo
 * por campo, y `openGraph` es UN campo: declararlo en una página reemplaza el
 * del layout entero, incluida la imagen que había puesto la convención.
 *
 * Como `pageMetadata()` declara `openGraph` en todas las páginas interiores,
 * el resultado medido fue que sólo la home y las notas del blog tenían
 * `og:image`: las once páginas restantes —incluidas las tres de programa, que
 * son las que alguien comparte por WhatsApp— salían sin imagen. Por eso la
 * default va explícita acá.
 *
 * Se referencia sin el hash de caché que Next agrega en la home
 * (`?e3672ba9…`), porque ese hash no está expuesto en ninguna API pública. La
 * URL sin hash resuelve al mismo PNG; lo único que se pierde es el
 * cache-busting automático si la imagen cambia.
 */
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "La Juanita Studio — Academia de DJ y producción de música electrónica en Pilar",
};

/**
 * Metadata de una página.
 *
 * El canonical es la razón de ser de este helper. No había ninguno en el sitio
 * — 22 páginas generadas, cero `<link rel="canonical">` — y sin él cualquier
 * variante de URL que llegue a existir (con `?utm_source=`, con barra final,
 * en www y sin www, en el dominio de preview de Vercel) es para Google una
 * página distinta con el mismo contenido. Con un canonical autorreferencial
 * todas esas variantes consolidan sus señales en una sola URL.
 */
export function pageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
  publishedTime,
  authors,
}: {
  title: string;
  description: string;
  path: string;
  images?: string[];
  type?: "website" | "article";
  publishedTime?: string;
  authors?: string[];
}): Metadata {
  const url = absoluteUrl(path);
  const socialImages = images ?? [OG_IMAGE];

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: BUSINESS.name,
      locale: "es_AR",
      images: socialImages,
      ...(type === "article" && publishedTime ? { publishedTime } : {}),
      ...(type === "article" && authors ? { authors } : {}),
    },
    twitter: {
      // `summary_large_image` y no `summary`: el sitio ya genera una imagen de
      // 1200×630 (`opengraph-image.tsx`). Con `summary` a secas, X la recorta a
      // una miniatura cuadrada al costado del texto y se desperdicia.
      card: "summary_large_image",
      title,
      description,
      images: socialImages,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════
//  JSON-LD
// ═══════════════════════════════════════════════════════════════════

type Json = Record<string, unknown>;

/** Saca las claves vacías. Ver la regla dura de `data/business.ts`. */
function compact(obj: Json): Json {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === null || v === undefined) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
}

/**
 * La entidad principal del negocio.
 *
 * Va con dos tipos a la vez y no es un capricho: `LocalBusiness` es lo que
 * hace que Google lo trate como un lugar físico con zona de influencia (la
 * mitad del valor de este sitio es que alguien en Pilar busque "clases de dj
 * cerca"), y `EducationalOrganization` es lo que describe lo que realmente
 * vende. Con uno solo se pierde una de las dos lecturas.
 *
 * Los campos que faltan (dirección, teléfono, horarios) NO se rellenan: se
 * omiten. Ver `data/business.ts`.
 */
export function organizationLd(): Json {
  const profiles = verifiedProfiles({
    instagram: CONTACT.instagram,
    spotify: CONTACT.spotify,
    youtube: CONTACT.youtube,
  });

  return compact({
    "@type": ["LocalBusiness", "EducationalOrganization"],
    "@id": ORG_ID,
    name: BUSINESS.name,
    description: BUSINESS.description,
    url: SITE_URL,
    logo: absoluteUrl("/images/logo/icon.png"),
    image: absoluteUrl("/opengraph-image"),
    // `compact()` lo omite si es `null`, que es justo el caso hoy: el email
    // que estaba acá no existe, lo inventó la IA, y en un `LocalBusiness` un
    // dato inventado no es un TODO — es un hecho verificado que Google levanta.
    email: CONTACT.email,
    // El teléfono, en cambio, es real desde §13. Va en formato internacional
    // porque es lo que schema.org espera y lo que permite cruzarlo con la
    // ficha del lugar.
    telephone: `+${CONTACT.whatsapp}`,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: BUSINESS.streetAddress,
      addressLocality: BUSINESS.city,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    }),
    geo: BUSINESS.geo
      ? { "@type": "GeoCoordinates", ...BUSINESS.geo }
      : null,
    openingHoursSpecification: BUSINESS.openingHours?.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days,
      opens: h.opens,
      closes: h.closes,
    })),
    foundingDate: BUSINESS.foundingDate,
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "Place", name })),
    knowsAbout: BUSINESS.areas,
    sameAs: profiles,
    inLanguage: "es-AR",
  });
}

export function websiteLd(): Json {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: BUSINESS.name,
    description: BUSINESS.description,
    publisher: { "@id": ORG_ID },
    inLanguage: "es-AR",
  };
}

/**
 * Migas de pan.
 *
 * El sitio no dibuja un breadcrumb visible, y aun así vale: Google lo usa para
 * reemplazar la URL cruda del resultado por la ruta legible
 * ("lajuanitastudio.com › Programas › Convertite en DJ"), que es más clara y
 * mide mejor en CTR. `position` arranca en 1 y la home siempre es la primera.
 */
export function breadcrumbLd(trail: { name: string; path: string }[]): Json {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Inicio", path: "/" }, ...trail].map(
      (item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      }),
    ),
  };
}

/**
 * Un programa de formación.
 *
 * `Course` y no `Product`: lo que se vende es formación con fecha de inicio y
 * modalidad, y `Course` es el tipo que Google entiende para eso.
 *
 * Sin `offers`. Los precios de `data/programs.ts` están marcados como
 * inventados en el CLAUDE.md, y un precio en JSON-LD es una promesa: Google lo
 * muestra en el resultado y un asistente de IA lo dicta como si fuera firme.
 * Cuando los precios estén confirmados, se agrega acá un bloque `offers` con
 * `price`, `priceCurrency: "ARS"` y `category`.
 */
export function courseLd(program: {
  slug: string;
  name: string;
  description: string;
  modality: string;
  levelLabel: string;
}): Json {
  const online = /virtual/i.test(program.modality);

  return compact({
    "@type": "Course",
    "@id": `${absoluteUrl(`/programas/${program.slug}`)}#course`,
    name: program.name,
    description: program.description,
    url: absoluteUrl(`/programas/${program.slug}`),
    provider: { "@id": ORG_ID },
    educationalLevel: program.levelLabel,
    inLanguage: "es-AR",
    hasCourseInstance: {
      "@type": "CourseInstance",
      // `blended` cuando el mismo programa se cursa presencial o virtual en
      // vivo, que es literalmente lo que dice `modality`.
      courseMode: online ? ["onsite", "online"] : "onsite",
      location: {
        "@type": "Place",
        name: BUSINESS.name,
        address: compact({
          "@type": "PostalAddress",
          streetAddress: BUSINESS.streetAddress,
          addressLocality: BUSINESS.city,
          addressRegion: BUSINESS.region,
          addressCountry: BUSINESS.country,
        }),
      },
    },
  });
}

/** Un servicio del estudio (cabina, grabación). */
export function serviceLd(service: {
  slug: string;
  name: string;
  description: string;
}): Json {
  return {
    "@type": "Service",
    "@id": `${absoluteUrl(`/servicios#${service.slug}`)}`,
    name: service.name,
    description: service.description,
    serviceType: service.name,
    provider: { "@id": ORG_ID },
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "Place", name })),
  };
}

/**
 * Preguntas frecuentes.
 *
 * Es el schema de mayor rendimiento del sitio para motores de respuesta: son
 * pares pregunta/respuesta ya delimitados, en lenguaje natural y
 * autocontenidos — exactamente la unidad que un LLM extrae y cita. Las
 * respuestas tienen que ser IDÉNTICAS a las visibles en `/faq`.
 */
export function faqLd(items: { question: string; answer: string }[]): Json {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/** Una nota del blog. */
export function blogPostingLd(post: {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  cover: string;
}): Json {
  const url = absoluteUrl(`/blog/${post.slug}`);

  return {
    "@type": "BlogPosting",
    "@id": `${url}#post`,
    headline: post.title,
    description: post.excerpt,
    url,
    mainEntityOfPage: url,
    image: absoluteUrl(post.cover),
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Person", name: post.author },
    publisher: { "@id": ORG_ID },
    inLanguage: "es-AR",
  };
}

/** Un profesor. Da señal de E-E-A-T: detrás de la enseñanza hay personas. */
export function personLd(teacher: {
  name: string;
  role: string;
  bio: string;
  image: string;
}): Json {
  return {
    "@type": "Person",
    name: teacher.name,
    jobTitle: teacher.role,
    description: teacher.bio,
    image: absoluteUrl(teacher.image),
    worksFor: { "@id": ORG_ID },
  };
}

/** Envuelve los nodos en un `@graph` con un solo `@context`. */
export function graph(...nodes: Json[]): Json {
  return { "@context": "https://schema.org", "@graph": nodes };
}
