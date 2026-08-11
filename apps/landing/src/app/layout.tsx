import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, Space_Mono } from "next/font/google";
import "./globals.css";

import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ThemeScroller } from "@/components/motion/ThemeScroller";
import { Preloader } from "@/components/motion/Preloader";
import { Cursor } from "@/components/motion/Cursor";
import { ScrollFx } from "@/components/motion/ScrollFx";
import { Texture } from "@/components/Texture";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, graph, organizationLd, websiteLd } from "@/lib/seo";

/**
 * Archivo variable con el eje de ancho (wdth 62–125). Ese eje es la razón de
 * elegirla: permite titulares ultra-expandidos y etiquetas condensadas con
 * una sola familia, y de ahí sale el contraste tipográfico del sitio.
 * Sin `axes: ["wdth"]` Next descarga sólo el eje de peso y `font-stretch`
 * no hace absolutamente nada.
 *
 * OJO CON LOS NOMBRES DE VARIABLE. Van por familia (`--font-archivo`) y no
 * por rol (`--font-display`) a propósito: `globals.css` mapea rol → familia
 * en `@theme inline`. Si le ponés acá el mismo nombre que el rol, quedan dos
 * declaraciones de `--font-display` sobre el mismo <html> — la de esta clase
 * y la que Tailwind emite en `:root` — con idéntica especificidad. Gana la
 * de `:root` por orden, y como ahí vale `var(--font-display)` se cicla sola,
 * la variable se invalida y el sitio entero cae a `system-ui`. Sin ningún
 * error de build: compila, deploya, y la tipografía no está.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

/** Cursiva de alto contraste: el contrapunto "humano" al grotesco.
 *  No es variable: hay que pedir peso y estilo explícitos. */
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

/** Mono para metadatos, índices y etiquetas de cabina. */
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "La Juanita Studio — Academia de DJ, producción y sello en Pilar",
    template: "%s | La Juanita Studio",
  },
  description:
    "Academia de DJ y producción de música electrónica en Pilar, Buenos Aires. Equipamiento Pioneer DJ, sala de mastering tratada y un sello discográfico propio detrás tuyo.",
  // OJO: acá NO va `alternates.canonical`.
  //
  // BUG QUE ESTO ARREGLA: estaba puesto como `"/"` para cubrir la home, que es
  // la única página sin metadata propia. Pero `alternates` se HEREDA, y
  // cualquier ruta que no lo pise queda declarando a la home como su versión
  // canónica — o sea, diciéndole a Google "esta página es en realidad la
  // portada, indexá esa". Medido en el HTML generado, `/ingresar` y la página
  // de 404 salían con `canonical` apuntando a la raíz.
  //
  // El canonical de la home lo declara `app/page.tsx`, y el de cada ruta su
  // propio `pageMetadata()`. La de 404 se queda sin canonical, que es lo
  // correcto: una página que no existe no es la versión canónica de nada.
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "La Juanita Studio",
    url: SITE_URL,
    title: "La Juanita Studio — De Pilar a la pista",
    description:
      "Academia de DJ y producción de música electrónica, estudio de mix & mastering y sello discográfico en Pilar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "La Juanita Studio — De Pilar a la pista",
    description:
      "Academia de DJ y producción de música electrónica, estudio de mix & mastering y sello discográfico en Pilar.",
  },
  // Sin `images` a mano ni en `openGraph` ni en `twitter`: las toma la
  // convención de archivo `app/opengraph-image.tsx`, que además emite el
  // tamaño y el `alt` correctos. Declararlas acá pisaría esa detección, que es
  // el mismo problema que ya está documentado abajo para los iconos.
  //
  // Sin `icons` a mano: el icono de pestaña sale del abanico de la marca y
  // lo toman las convenciones de archivo de App Router — `app/icon.png` y
  // `app/apple-icon.png`. Declarar `icons` acá pisaba esa detección y dejaba
  // apuntando al favicon.ico viejo.
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${archivo.variable} ${instrument.variable} ${spaceMono.variable} antialiased`}
    >
      <body>
        {/* Identidad del negocio, en todas las páginas.
            Va en el layout y no en la home porque es la definición de QUIÉN
            publica el sitio: cualquier página puede ser la primera (y a
            menudo la única) que un buscador o un asistente de IA lee. Si la
            entidad viviera sólo en la home, una respuesta generada a partir de
            `/servicios` no tendría forma de saber de qué negocio está
            hablando, dónde queda ni cómo se contacta.
            Los schemas específicos de cada página se referencian a este por
            `@id` en vez de repetirlo. */}
        <JsonLd data={graph(organizationLd(), websiteLd())} />

        {/* Todo lo fijo vive FUERA de #smooth-content: dentro de un elemento
            transformado, `position: fixed` se ancla al padre, no al viewport. */}
        <Preloader />
        <Texture />
        <Cursor />
        <ScrollFx />
        <ThemeScroller />
        <Navbar />

        <SmoothScroll>
          <main>{children}</main>
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
