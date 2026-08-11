import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Imagen social del sitio (Open Graph + X).
 *
 * No existía ninguna: al compartir cualquier link de La Juanita —por WhatsApp,
 * que es el canal real del negocio— salía una tarjeta de texto pelado. Para
 * una academia que se difunde boca a boca y por Instagram, eso es la primera
 * impresión de la marca en el lugar donde más circula el enlace.
 *
 * ── Por qué usa los PNG de marca y no tipografía ──
 *
 * `ImageResponse` renderiza con Satori, que necesita que le pasen los archivos
 * de fuente: no puede usar las de `next/font`, que viven procesadas dentro de
 * `.next`. Traer Archivo por red en tiempo de build agregaría un punto de
 * falla al build por un detalle estético.
 *
 * Y no hace falta: el wordmark arqueado ES la tipografía de la marca, ya
 * dibujada. `public/images/logo/wordmark.png` y `icon.png` son los originales
 * de los que salió el SVG del abanico, y estaban sin usar en el sitio (el
 * `CLAUDE.md` los marcaba como archivos sin referencias). Acá cumplen
 * exactamente la función para la que sirven: marca a tamaño grande, sin
 * depender de que una fuente cargue.
 *
 * El texto de apoyo va en la sans por defecto de Satori, en cuerpo chico y
 * espaciado — es un pie de foto, no un titular, así que no compite con el
 * wordmark ni delata que es otra familia.
 */

export const alt =
  "La Juanita Studio — Academia de DJ y producción de música electrónica en Pilar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0a0a0b";
const BONE = "#e8e1d4";
const RED = "#e52328";

async function asDataUri(relativePath: string) {
  const file = await readFile(join(process.cwd(), "public", relativePath));
  return `data:image/png;base64,${file.toString("base64")}`;
}

/*
 * Los `<img>` de acá abajo son correctos y no se pueden reemplazar por
 * `next/image`: esto no es una página, es una plantilla que Satori convierte a
 * PNG en tiempo de build. Satori entiende un subconjunto de HTML y CSS, y
 * `next/image` —que depende del optimizador y del runtime del navegador— no
 * existe en ese contexto. De ahí el `eslint-disable` de archivo.
 */
/* eslint-disable @next/next/no-img-element */

export default async function Image() {
  const [wordmark, fan] = await Promise.all([
    asDataUri("images/logo/wordmark.png"),
    asDataUri("images/logo/icon.png"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          position: "relative",
        }}
      >
        {/* Abanico de fondo, apenas visible: el mismo gesto que en el hero.
            La geometría está medida para que el abanico termine ARRIBA de la
            banda roja (top 52 + alto 468 = 520, y la banda arranca en 565).
            Cruzándola quedaba un recorte accidental que se leía como un error
            de exportación en vez de una filigrana. */}
        <img
          alt=""
          src={fan}
          width={720}
          height={468}
          style={{
            position: "absolute",
            right: -110,
            top: 52,
            opacity: 0.08,
          }}
        />

        <img
          alt="La Juanita"
          src={wordmark}
          width={640}
          height={220}
          style={{ opacity: 0.96 }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            marginTop: 26,
            color: BONE,
            fontSize: 27,
            letterSpacing: 1.5,
          }}
        >
          <span>Academia de DJ</span>
          <span style={{ color: RED }}>·</span>
          <span>Producción</span>
          <span style={{ color: RED }}>·</span>
          <span>Mix &amp; Mastering</span>
        </div>

        {/* Banda inferior: la referencia geográfica, que es la mitad de la
            promesa de este negocio. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "22px 0",
            background: RED,
            color: "#ffffff",
            fontSize: 21,
            letterSpacing: 5,
          }}
        >
          <span>PILAR</span>
          <span style={{ opacity: 0.6 }}>—</span>
          <span>BUENOS AIRES</span>
          <span style={{ opacity: 0.6 }}>—</span>
          <span>SELLO PROPIO</span>
        </div>
      </div>
    ),
    size,
  );
}
