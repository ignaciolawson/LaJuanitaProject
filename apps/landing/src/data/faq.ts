// Contenido placeholder — validar respuestas reales (precios, políticas) con el cliente.
export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ: FaqItem[] = [
  {
    question: "¿Necesito experiencia previa para anotarme?",
    answer:
      "No. El programa de DJ Nivel Inicial y Producción Musical Electrónica arrancan desde cero. Solo necesitás ganas de aprender.",
  },
  {
    question: "¿Qué equipamiento voy a usar?",
    answer:
      "Todas las clases son con equipamiento Pioneer DJ profesional (CDJ-3000, mixers DJM) y una sala de mastering tratada acústicamente.",
  },
  {
    question: "¿Los cursos tienen certificado?",
    answer:
      "Sí, al finalizar cada programa entregamos un certificado de La Juanita Studio que acredita las horas cursadas y el nivel alcanzado.",
  },
  {
    question: "¿Hay práctica libre fuera del horario de clase?",
    answer:
      "Sí, los alumnos activos tienen acceso a horarios de práctica libre en cabina, sujeto a disponibilidad de sala.",
  },
  {
    question: "¿Cómo son las formas de pago?",
    answer:
      "Aceptamos pago mensual o el programa completo con descuento. Consultanos por transferencia, tarjeta o efectivo.",
  },
  {
    question: "¿Puedo mandar mi track a mastering sin ser alumno?",
    answer:
      "Sí, el servicio de mix & mastering está disponible para cualquier artista, sea alumno de la academia o no.",
  },
];
