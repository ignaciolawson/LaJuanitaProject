import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
