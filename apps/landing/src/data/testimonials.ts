// Contenido placeholder — reemplazar por testimonios reales de alumnos.
export type Testimonial = {
  name: string;
  program: string;
  quote: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Martina G.",
    program: "DJ — Nivel Inicial",
    quote:
      "Entré sin saber nada de mezcla y en tres meses ya estaba armando mis primeros sets. Los profesores están siempre presentes en cabina.",
  },
  {
    name: "Tomás R.",
    program: "Producción Musical Electrónica",
    quote:
      "Terminé el curso con un EP terminado, algo que no me imaginaba lograr. El nivel de detalle en las devoluciones marcó la diferencia.",
  },
  {
    name: "Lucía F.",
    program: "Mix & Mastering",
    quote:
      "La sala está tratada de una forma impresionante, se nota apenas entrás. Aprendí a escuchar mis propias mezclas de otra manera.",
  },
];
