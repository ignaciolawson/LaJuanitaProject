import type { NextConfig } from "next";

/**
 * Content-Security-Policy del sitio público.
 *
 * Se escribe AHORA porque hoy es barata: el sitio no carga un solo script de
 * terceros. El día que entre un pixel de Instagram o un chat, escribir la
 * política pasa a ser negociar con cada proveedor.
 *
 * ⚠️ `script-src` lleva `'unsafe-inline'`, y no es un descuido. Next inyecta
 * scripts inline en cada página (el payload de RSC va en
 * `self.__next_f.push(...)`), y la alternativa —un nonce por respuesta— exige
 * middleware, o sea render dinámico: este sitio es 100% estático y perdería
 * su razón de ser. Lo que la política igual impide, que es lo que importa acá,
 * es cargar un script de OTRO origen y, sobre todo, que algo mande datos afuera
 * (`connect-src 'self'`).
 *
 * `'unsafe-eval'` entra SÓLO en desarrollo: el HMR de Next lo necesita y estas
 * cabeceras también corren en `next dev`. En el build de producción no está.
 *
 * Los tres `frame-src` son los embebidos reales del sitio, y no hay más: el
 * mapa de `/contacto` y los dos reproductores que puede traer una nota del blog
 * (`PostBody`). Si aparece un cuarto, va acá o el iframe queda en blanco sin
 * decir por qué.
 */
/**
 * El origen de la API, para `connect-src`.
 *
 * ⚠️ **Sale de la MISMA variable que usa `src/lib/api.ts`, y eso no es prolijidad.**
 * Si las dos se escriben por separado, el día que la API cambie de dominio el
 * `fetch` queda bloqueado por la CSP y **el navegador no muestra nada en la
 * página**: se ve como un formulario que no responde, sin error visible, y lo
 * único que lo delata es la consola. Es el modo de falla más caro que tenía este
 * archivo, porque el síntoma es idéntico al de "el backend está caído".
 *
 * Se guarda sólo el origen —sin path— porque `connect-src` compara orígenes.
 */
function origenDeLaApi(): string {
  const url = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
  try {
    return new URL(url).origin;
  } catch {
    // Una variable mal escrita no puede voltear el build del sitio entero: se
    // cae el envío de los formularios, que es lo que ya pasaba antes de tenerlos.
    return "";
  }
}

const cspDirectivas = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Los estilos inline los escriben React (`style={{…}}`) y el propio Next.
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  // 'self' sigue haciendo falta para lo de Next; el origen de la API es lo
  // único de afuera a lo que este sitio le habla — y le manda una sola cosa:
  // la ficha de un formulario. Ver `src/lib/api.ts`.
  `connect-src 'self' ${origenDeLaApi()}`.trim(),
  "frame-src https://www.google.com https://www.youtube-nocookie.com https://open.spotify.com",
].join("; ");

const nextConfig: NextConfig = {
  /**
   * Cabeceras de seguridad. Ninguna de las dos apps declaraba una sola (SEC-07);
   * la API sí quedaba cubierta, por los defaults de Spring Security.
   *
   * `Permissions-Policy` corta lo que este sitio no usa nunca y deja pasar el
   * resto a propósito: los embebidos de YouTube piden `accelerometer` y
   * `gyroscope` en su `allow`, y una política de documento que los niegue se
   * los quita al iframe.
   *
   * HSTS no está acá: pertenece al proxy que termine el TLS, junto con la
   * decisión de hosting de octubre. Ponerla en la app no sirve si el proxy
   * responde en HTTP.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectivas },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Redundante con `frame-ancestors` en navegadores actuales; sigue
          // sirviendo en los que no leen CSP nivel 2.
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
  images: {
    /**
     * WebP solo, a propósito — no agregar AVIF.
     *
     * AVIF comprime ~20% mejor, pero el optimizador de Next codifica cada
     * combinación (archivo, ancho) la primera vez que alguien la pide, y
     * codificar AVIF es MUCHO más lento que WebP. En una página con seis
     * fotos eso se ve directamente como imágenes que tardan en aparecer en
     * la primera visita. Con las fuentes ya recomprimidas, el 20% extra no
     * paga esa espera.
     */
    formats: ["image/webp"],
    /**
     * Sin el 3840 ni el 2048 del default.
     *
     * Después de recomprimir, la foto más ANCHA de `public/images` mide
     * 1500px (los 2000 son de alto: son casi todas verticales). El
     * optimizador nunca agranda, así que todo breakpoint por encima de 1500
     * devuelve exactamente el mismo archivo — pero lo codifica y lo cachea
     * por separado. Medido con la caché fría: `sala-mastering.jpg` pesaba
     * 35 KB tanto en w=1920 como en w=2048, o sea que el 2048 era un encode
     * completo de más, por foto a pantalla completa, sin un píxel de
     * ganancia. Queda 1920 como único escalón por encima del máximo real,
     * que es el que cubre las pantallas grandes y las de DPR 2.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
};

export default nextConfig;
