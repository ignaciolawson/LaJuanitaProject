/**
 * Servicios de alquiler — placeholder, confirmar precios y qué incluye.
 *
 * Van separados de los programas a propósito: un programa es una decisión
 * de meses y una reserva es una decisión de diez minutos. Mezclarlos en la
 * misma grilla obliga a la persona a filtrar mentalmente antes de entender
 * qué está mirando.
 */

export type Service = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** "A consultar" desde el 2026-10-15 (eran $18.000 y $65.000 la hora, placeholders sin validar; están en el historial de git). */
  price: string;
  priceNote: string;
  includes: string[];
  /** Duraciones ofrecidas en el selector de reserva, en horas. */
  durations: number[];
  image: string;
};

export const SERVICES: Service[] = [
  {
    slug: "cabina",
    name: "Alquiler de cabina",
    tagline: "El equipo, para vos solo",
    description:
      "Cabina completa por hora para practicar, preparar un set o probar material antes de una fecha. Reservás, venís y tocás: no hace falta ser alumno.",
    price: "A consultar",
    priceNote: "Escribinos y te pasamos el valor por hora",
    includes: [
      "2× Pioneer CDJ-3000 y mixer DJM-900NXS2",
      "Monitoreo de cabina y auriculares de referencia",
      "Entrada USB y conexión para tu propia notebook",
      "Sala climatizada y aislada",
      "Agua y café incluidos",
    ],
    durations: [1, 2, 3, 4],
    image: "/images/estudio/equipos.jpg",
  },
  {
    slug: "grabacion-sets",
    name: "Grabación de sets",
    tagline: "Tu set, filmado y con audio real",
    description:
      "Cabina más registro audiovisual: audio tomado directo del mixer y cámaras fijas. Salís con el material editado y listo para publicar.",
    price: "A consultar",
    priceNote: "Escribinos y te pasamos el valor por hora",
    includes: [
      "Todo lo del alquiler de cabina",
      "Audio grabado directo del mixer, sin ruido de sala",
      "Dos cámaras fijas en 4K con iluminación armada",
      "Edición y color del video final",
      "Entrega en formato vertical y horizontal",
      "Master de audio del set incluido",
    ],
    durations: [1, 2, 3],
    image: "/images/espacio/GSet.jpg",
  },
];

export function getService(slug: string) {
  return SERVICES.find((s) => s.slug === slug);
}
