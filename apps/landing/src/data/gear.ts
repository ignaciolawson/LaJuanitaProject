/**
 * La Juanita Shop — venta de equipamiento.
 *
 * Las cuatro categorías salen del posteo real de Instagram: controladores,
 * monitores de estudio, auriculares y accesorios.
 *
 * ⚠️ A propósito NO hay marcas ni modelos. No sé qué stock manejan, y poner
 * "Pioneer DDJ-FLX4" en una web es un compromiso de venta: si no lo tienen,
 * alguien llega al local a buscarlo. Cada categoría describe el RANGO y el
 * criterio, y la conversión es una consulta — que además es como venden
 * ellos según el propio posteo ("te asesoramos para que elijas el equipo
 * ideal según tu nivel, presupuesto y objetivos").
 *
 * Cuando tengas el catálogo, esto se reemplaza por productos con precio.
 */

export type GearCategory = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Qué entra en la categoría, sin nombrar modelos. */
  covers: string[];
  /** Ícono de lucide-react, resuelto en el componente. */
  icon: "controller" | "monitor" | "headphones" | "accessories";
};

export const GEAR: GearCategory[] = [
  {
    slug: "controladores",
    name: "Controladores",
    tagline: "El corazón del setup",
    description:
      "Desde controladores de dos canales para arrancar en casa hasta equipos de estándar de club. Te ayudamos a elegir según dónde vas a tocar, no según lo que está de moda.",
    covers: [
      "Controladores de entrada, dos canales",
      "Equipos de cuatro canales para cabina",
      "Reproductores y mixers de estándar de club",
      "Interfaces y controladores para producción",
    ],
    icon: "controller",
  },
  {
    slug: "monitores",
    name: "Monitores de estudio",
    tagline: "Escuchar lo que hay, no lo que querés oír",
    description:
      "Monitores de campo cercano y subwoofers para que tus mezclas se traduzcan afuera. La elección depende tanto del monitor como del cuarto donde va: eso también lo charlamos.",
    covers: [
      "Monitores de campo cercano, 5\" a 8\"",
      "Subwoofers para completar el rango bajo",
      "Soportes, aisladores y tratamiento básico",
      "Cableado balanceado",
    ],
    icon: "monitor",
  },
  {
    slug: "auriculares",
    name: "Auriculares",
    tagline: "Para cabina y para mezclar",
    description:
      "Auriculares de DJ, que necesitan aislamiento y aguante, y auriculares de estudio, que necesitan honestidad. No son lo mismo y casi nadie te lo aclara antes de comprar.",
    covers: [
      "Auriculares cerrados para cabina",
      "Auriculares de referencia para mezcla",
      "In-ears para monitoreo",
      "Repuestos: almohadillas y cables",
    ],
    icon: "headphones",
  },
  {
    slug: "accesorios",
    name: "Accesorios",
    tagline: "Lo que siempre falta",
    description:
      "Todo lo que no aparece en la foto del setup pero sin lo cual no tocás: cables, fichas, soportes, fundas, iluminación y repuestos.",
    covers: [
      "Cables RCA, XLR, jack y adaptadores",
      "Soportes de laptop y de controlador",
      "Fundas y bolsos de traslado",
      "Iluminación y repuestos varios",
    ],
    icon: "accessories",
  },
];
