import type { Metadata, Viewport } from "next";
import "./globals.css";

import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { ThemeScroller } from "@/components/motion/ThemeScroller";
import { Preloader } from "@/components/motion/Preloader";
import { Cursor } from "@/components/motion/Cursor";
import { ScrollFx } from "@/components/motion/ScrollFx";
import { Texture } from "@/components/Texture";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Archivo variable con el eje de ancho (wdth 62–125). Ese eje es la razón de
 * elegirla: permite titulares ultra-expandidos y etiquetas condensadas con
 * una sola familia, y de ahí sale el contraste tipográfico del sitio.
 * Sin `axes: ["wdth"]` Next descarga sólo el eje de peso y `font-stretch`
 * no hace absolutamente nada.
 */
const archivo = { variable: "font-a" };

/** Cursiva de alto contraste: el contrapunto "humano" al grotesco. */
const instrument = { variable: "font-b" };

/** Mono para metadatos, índices y etiquetas de cabina. */
const spaceMono = { variable: "font-c" };

export const metadata: Metadata = {
  metadataBase: new URL("https://lajuanitastudio.com"),
  title: {
    default: "La Juanita Studio — Academia de DJ, producción y sello en Pilar",
    template: "%s | La Juanita Studio",
  },
  description:
    "Academia de DJ y producción de música electrónica en Pilar, Buenos Aires. Equipamiento Pioneer DJ, sala de mastering tratada y un sello discográfico propio detrás tuyo.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "La Juanita Studio",
    title: "La Juanita Studio — De Pilar a la pista",
    description:
      "Academia de DJ y producción de música electrónica, estudio de mix & mastering y sello discográfico en Pilar.",
  },
  icons: { icon: "/favicon.ico" },
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
