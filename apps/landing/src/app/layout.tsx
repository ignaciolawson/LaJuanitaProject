import type { Metadata } from "next";
import { Syne, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Cursor } from "@/components/Cursor";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Atmosphere } from "@/components/Atmosphere";
import { ScrollFx } from "@/components/ScrollFx";
import { Deck } from "@/components/Deck";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "La Juanita Studio | Academia de DJ y Sello Discográfico",
    template: "%s | La Juanita Studio",
  },
  description:
    "Academia de DJ y producción de música electrónica y sello discográfico en Pilar. Formate con equipamiento profesional Pioneer DJ y llevá tu sonido al siguiente nivel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-white font-body">
        <Atmosphere />
        <ScrollFx />
        <Cursor />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Deck />
      </body>
    </html>
  );
}
