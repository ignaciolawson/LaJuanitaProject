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
   * VERIFICADO el 2026-08-14 (§13) — era el dato de mayor impacto que faltaba
   * para SEO local: sin él, Google no podía cruzar el sitio con una ficha de
   * Google Business Profile ni ubicarlo en el mapa.
   *
   * El nombre del complejo es Office Park **Quatro**. "Office Park Pilar", que
   * aparecía en el relevamiento, es la forma corta y queda superada.
   */
  streetAddress: "Colectora Oeste Ramal Pilar 209, locales 5 y 6 (Office Park Quatro)",
  postalCode: "B1669",

  /**
   * PENDIENTE, y sigue pendiente aunque la dirección ya esté: §13 confirmó la
   * calle, no las coordenadas. Sacarlas de un geocodificador y publicarlas como
   * `GeoCoordinates` sería afirmar una precisión que nadie verificó — y un
   * punto mal puesto en el mapa manda gente a la puerta equivocada.
   *
   * Se completan mirando la ficha real del lugar, no derivándolas del texto.
   */
  geo: null as { latitude: number; longitude: number } | null,

  /**
   * VERIFICADO el 2026-08-14 (§13): 10:00 a 18:00. Alimenta el "Abierto ahora"
   * de Google y es una de las preguntas que más recibe un asistente de IA.
   *
   * Los días son de lunes a viernes porque es lo que se desprende de "horario
   * de atención"; **si el estudio abre sábados, hay que agregarlos acá**, que
   * es el único lugar donde se declaran.
   */
  openingHours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "10:00",
      closes: "18:00",
    },
  ] as { days: string[]; opens: string; closes: string }[] | null,

  /**
   * VERIFICADO el 2026-08-14 (§13): **2021**.
   *
   * ⚠️ Y con eso queda a la vista una contradicción que hay que resolver en el
   * contenido: `sections/Numbers.tsx` dice "desde 2019" y la línea de tiempo de
   * `/nosotros` arranca en 2019. Los dos son texto inventado —el `CLAUDE.md` de
   * esta app ya los listaba como tales— y ahora además contradicen el dato
   * confirmado. **El JSON-LD publica 2021, que es el verificado.**
   */
  foundingDate: "2021",

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
