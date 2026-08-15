/**
 * Datos de contacto que se MUESTRAN en pantalla.
 *
 * El compañero de este archivo es `data/business.ts`, que guarda lo que se
 * AFIRMA sobre el negocio en JSON-LD. Ahí está explicada la diferencia.
 *
 * Confirmados con el cliente el 2026-08-14 (`docs/requirements/platform.md`
 * §13): dirección, teléfono y horario. Lo que sigue sin existir queda en
 * `null` y no se dibuja — ver `email`.
 */
export const CONTACT = {
  /** VERIFICADO — dirección completa, §13. */
  address: "Office Park Quatro — Colectora Oeste Ramal Pilar 209, locales 5 y 6, Pilar, Buenos Aires",
  /** Versión corta, para el pie y las tarjetas donde la larga no entra. */
  addressShort: "Pilar, Buenos Aires",

  /**
   * NO EXISTE. `hola@lajuanitastudio.com` lo inventó la IA y estuvo publicado
   * como dato de contacto y —peor— como `email` del `LocalBusiness`, o sea
   * como hecho verificado que Google puede levantar (SEO-02).
   *
   * En `null` a propósito: **todo lo que lo consume tiene que saber
   * ausentarse**, no dibujar un `mailto:` vacío. Cuando exista una casilla
   * real, se pone acá y vuelve a aparecer sola en los cuatro lugares.
   *
   * Que no haya mail no deja al negocio incomunicado: el canal real es
   * WhatsApp, que es de lo que trata todo este proyecto.
   */
  email: null as string | null,

  /** VERIFICADO — §13. Antes era `5491100000000`, un número inventado. */
  whatsapp: "5491153108738",
  whatsappDisplay: "+54 9 11 5310-8738",

  /**
   * PENDIENTE — el perfil real. Hoy es el dominio pelado, así que
   * `isPlaceholder()` lo reconoce y queda fuera de `sameAs`.
   */
  instagram: "https://instagram.com",
  /** VERIFICADO — perfil real del sello. */
  spotify: "https://open.spotify.com/intl-es/artist/5OtyxNQ58Q3rvKLj9ezi0s?si=3LHrxDroTemhR6tfMVNn0Q",
  /** PENDIENTE — ídem Instagram. */
  youtube: "https://youtube.com",

  mapsEmbedUrl:
    "https://www.google.com/maps?q=Colectora+Oeste+Ramal+Pilar+209,+Pilar,+Buenos+Aires,+Argentina&output=embed",
  /** Mismo lugar, para abrir en la app de mapas (ver el mapa de /contacto). */
  mapsUrl:
    "https://www.google.com/maps?q=Colectora+Oeste+Ramal+Pilar+209,+Pilar,+Buenos+Aires,+Argentina",
};
