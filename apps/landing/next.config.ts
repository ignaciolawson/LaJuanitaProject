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
     * Sin el 3840 del default: después de recomprimir, ninguna foto de
     * `public/images` pasa de 2000px de lado largo, así que ese breakpoint
     * sólo generaba una variante extra que nunca es más nítida.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
  },
};

export default nextConfig;
