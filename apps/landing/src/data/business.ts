/**
 * Datos de la entidad "La Juanita Studio" — la fuente única de verdad para
 * datos estructurados, SEO local y comprensión por motores de IA.
 *
 * ── POR QUÉ ESTE ARCHIVO EXISTE, SEPARADO DE `contact.ts` ──
 *
 * `contact.ts` guarda lo que se MUESTRA en pantalla. Esto guarda lo que se
 * AFIRMA sobre el negocio en JSON-LD, o sea lo que Google usa para armar su
 * ficha del lugar y lo que un LLM va a repetir cuando alguien le pregunte por
 * academias de DJ en Pilar. Son públicos distintos con un requisito distinto:
 * en pantalla, un dato provisorio se lee como provisorio; en datos
 * estructurados, un dato provisorio se propaga como un hecho.
 *
 * ⚠️ REGLA DURA: acá NO entra nada inventado ni "de ejemplo". Un teléfono
 * placeholder en un `LocalBusiness` no es un TODO cosmético — es un número de
 * teléfono equivocado publicado como dato verificado, que Google puede
 * levantar y mostrar, y que después cuesta muchísimo corregir. Por eso los
 * campos sin confirmar salen como `null` y los constructores de JSON-LD los
 * omiten en vez de rellenarlos.
 *
 * Ver `VERIFICADO` / `PENDIENTE` en cada bloque.
 */

/** Dominio de producción. Sale de acá el `metadataBase`, los canonical y el sitemap. */
export const SITE_URL = "https://lajuanitastudio.com";

export const BUSINESS = {
  /** VERIFICADO — marca real, sale del logo y de todo el sitio. */
  name: "La Juanita Studio",
  /** VERIFICADO — sub-marcas usadas en el sitio. */
  labelName: "La Juanita Records",
  shopName: "La Juanita Shop",

  /**
   * VERIFICADO — es lo que el negocio hace, deducido del contenido real del
   * sitio (programas, servicios, sello, shop). Redactado en una sola frase
   * autocontenida a propósito: es el fragmento que un motor de respuesta
   * puede citar sin necesitar el resto de la página.
   */
  description:
    "La Juanita Studio es una academia de DJ y producción de música electrónica en Pilar, provincia de Buenos Aires, que además funciona como estudio de mix y mastering, sello discográfico y tienda de equipamiento. Se enseña sobre Pioneer CDJ-3000 y mixers DJM en cabina real, y la sala de mastering está tratada acústicamente.",

  /** VERIFICADO — ciudad y provincia aparecen en todo el sitio. */
  city: "Pilar",
  region: "Buenos Aires",
  regionCode: "AR-B",
  country: "AR",
  countryName: "Argentina",

  /**
   * PENDIENTE — calle y número. Hoy el sitio dice sólo "Pilar, Buenos Aires".
   * Sin esto el `LocalBusiness` va sin `streetAddress` (sigue siendo válido y
   * útil: localidad + provincia + país son datos reales), pero Google no puede
   * cruzarlo con una ficha de Google Business Profile ni ubicarlo en el mapa.
   * Es el dato de mayor impacto que falta para SEO local.
   */
  streetAddress: null as string | null,
  postalCode: null as string | null,

  /**
   * PENDIENTE — coordenadas. Van juntas con la dirección; sin dirección
   * confirmada, poner un punto en el mapa es inventar dónde queda el local.
   */
  geo: null as { latitude: number; longitude: number } | null,

  /**
   * PENDIENTE — horarios de atención. No están en ningún lado del sitio.
   * Formato esperado (schema.org OpeningHoursSpecification), por ejemplo:
   *   [{ days: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
   *      opens: "14:00", closes: "22:00" }]
   * Es lo segundo más valioso para SEO local: alimenta el "Abierto ahora" de
   * Google y es una de las preguntas que más le hacen a un asistente de IA.
   */
  openingHours: null as
    | { days: string[]; opens: string; closes: string }[]
    | null,

  /**
   * PENDIENTE — año de fundación. El sitio dice "desde 2019" en
   * `sections/Numbers.tsx` y en la línea de tiempo de `/nosotros`, pero el
   * `CLAUDE.md` marca las dos cosas como inventadas. Un `foundingDate` falso
   * es exactamente el tipo de dato que un LLM repite como verdad.
   */
  foundingDate: null as string | null,

  /**
   * VERIFICADO — el equipamiento aparece en `data/services.ts` y en los
   * programas. Es información factual concreta, que es justo lo que los
   * motores de respuesta citan (a diferencia de "el mejor estudio de la zona").
   */
  equipment: [
    "Pioneer CDJ-3000",
    "Mixer Pioneer DJM-900NXS2",
    "Ableton Live",
    "Sala de mastering tratada acústicamente",
  ],

  /** VERIFICADO — las áreas reales del negocio, tal como están en el sitio. */
  areas: [
    "Academia de DJ",
    "Producción de música electrónica",
    "Mix & mastering",
    "Alquiler de cabina",
    "Grabación de sets",
    "Sello discográfico",
    "Venta de equipamiento",
  ],

  /**
   * VERIFICADO — zona de influencia. Pilar y los partidos linderos del
   * corredor norte. No es una promesa comercial: `areaServed` describe desde
   * dónde puede venir alguien a una sede física, y estas son las localidades
   * que el propio contenido menciona como su escena.
   */
  areaServed: ["Pilar", "Del Viso", "Escobar", "Tortuguitas", "Zona Norte", "Buenos Aires"],
} as const;

/**
 * Detecta los placeholders que quedaron en `data/contact.ts`.
 *
 * No alcanza con "si existe el dato, publicalo": los valores placeholder son
 * strings perfectamente válidos. `https://instagram.com` es una URL correcta y
 * `5491100000000` es un teléfono con el formato correcto — pasan cualquier
 * validación de tipos y llegan enteros al JSON-LD. Lo que los delata es que
 * son genéricos, así que hay que reconocerlos explícitamente.
 */
export function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return (
    v === "" ||
    // Teléfono de ejemplo: 11 0000-0000
    v.includes("1100000000") ||
    // Perfil social sin perfil: el dominio pelado, con o sin barra final
    /^https?:\/\/(www\.)?(instagram|youtube|facebook|twitter|x|tiktok)\.com\/?$/.test(v)
  );
}

/** Sólo las URLs de perfiles que son reales, para `sameAs`. */
export function verifiedProfiles(profiles: Record<string, string>): string[] {
  return Object.values(profiles).filter((url) => !isPlaceholder(url));
}
