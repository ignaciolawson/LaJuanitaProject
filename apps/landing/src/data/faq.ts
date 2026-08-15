/**
 * Preguntas frecuentes.
 *
 * ⚠️ Sigue habiendo respuestas que el cliente tiene que validar (están
 * marcadas abajo una por una). Lo que ya NO es placeholder son las que se
 * derivan de datos que el propio sitio afirma en otro lado: modalidad,
 * duración, equipamiento y ubicación salen de `programs.ts`, `services.ts` y
 * `business.ts`.
 *
 * ── Por qué las respuestas están escritas así ──
 *
 * Esta página alimenta el `FAQPage` de `/faq`, que es el marcado del sitio con
 * más chance de ser citado por un asistente de IA. Un asistente no lee la
 * página: extrae UNA respuesta y la repite fuera de contexto. Así que cada
 * respuesta tiene que sostenerse sola.
 *
 * En concreto, y por eso se reescribieron:
 *  - Nombrar el sujeto en vez de dar por sentado el contexto. "Sí, tenemos" no
 *    sirve citado; "La Juanita Studio entrega un certificado" sí.
 *  - Poner el dato concreto (Pilar, CDJ-3000, 6 meses) en la respuesta y no
 *    sólo en la pregunta.
 *  - Entre 40 y 60 palabras: alcanza para responder de verdad y es lo que
 *    entra completo en un fragmento.
 *
 * BUG DE CONTENIDO QUE ESTO ARREGLA: la primera respuesta hablaba de "DJ Nivel
 * Inicial", un programa que dejó de existir cuando los dos cursos de DJ se
 * unificaron en "Convertite en DJ" (ver la nota en `data/programs.ts`). O sea
 * que el FAQ ofrecía un curso que no está en ningún otro lado del sitio: mal
 * para quien lo lee, y peor como dato estructurado, porque es exactamente el
 * tipo de afirmación que un LLM repite como si fuera vigente.
 */
export type FaqItem = {
  question: string;
  answer: string;
};

export const FAQ: FaqItem[] = [
  {
    question: "¿Necesito experiencia previa para anotarme?",
    answer:
      "No. Los programas Convertite en DJ y Producción Musical Electrónica arrancan desde cero, y quien ya viene mezclando o produciendo saltea lo que tiene resuelto. El nivel se define en la solicitud, con una pregunta sobre experiencia previa, así que no hace falta autodiagnosticarse antes de empezar.",
  },
  {
    question: "¿Dónde queda La Juanita Studio?",
    answer:
      "La sede está en Pilar, provincia de Buenos Aires, y de ahí llega gente de Del Viso, Escobar, Tortuguitas y el resto de la zona norte. Los programas de DJ y de producción también se cursan de forma virtual en vivo, así que se puede estudiar desde cualquier lado.",
  },
  {
    question: "¿Qué equipamiento voy a usar?",
    answer:
      "Las clases son sobre equipamiento Pioneer DJ profesional: reproductores CDJ-3000 y mixer DJM-900NXS2, el mismo estándar que hay en cualquier club. La producción se trabaja en Ableton Live, y la mezcla y el mastering en una sala tratada acústicamente con monitoreo de referencia.",
    // Validar con el cliente: confirmar modelo exacto del mixer del aula.
  },
  {
    question: "¿Cuánto duran los programas?",
    // Confirmado en `docs/requirements/platform.md` §13 (2026-08-14). Se
    // publica la CANTIDAD DE CLASES y no una cantidad de meses: ninguna clase
    // se pierde, así que la fecha de fin depende de cada alumno. Un número de
    // meses acá se lee como compromiso.
    answer:
      "Los programas de La Juanita Studio se miden en clases, no en meses: Convertite en DJ son 8 clases y Producción Musical Electrónica son 16, en ambos casos una clase por semana de una hora y media. Como ninguna clase se pierde —si falta el alumno o el profesor se recupera—, el curso termina cuando se dictaron todas las clases contratadas.",
  },
  {
    question: "¿Puedo alquilar la cabina sin ser alumno?",
    answer:
      "Sí. El alquiler de cabina de La Juanita Studio se reserva por hora y está abierto a cualquiera, sea alumno o no: se usa para practicar, preparar un set o probar material antes de una fecha. También se puede reservar la grabación de sets, con audio directo del mixer y dos cámaras.",
  },
  {
    question: "¿Hay práctica libre fuera del horario de clase?",
    answer:
      "Sí. Los alumnos activos tienen acceso a horarios de práctica libre en cabina, sujeto a disponibilidad de sala. En el programa Convertite en DJ la práctica libre está incluida mientras dure la cursada, sin costo extra: tocar sólo durante las clases no alcanza para tomar soltura.",
  },
  {
    question: "¿Los cursos tienen certificado?",
    answer:
      "Sí, al finalizar cada programa La Juanita Studio entrega un certificado que acredita las horas cursadas y el nivel alcanzado.",
    // Validar con el cliente: confirmar que el certificado existe y qué dice.
  },
  {
    question: "¿Cómo son las formas de pago?",
    answer:
      "Se puede pagar mes a mes o el programa completo con descuento. Consultanos por transferencia, tarjeta o efectivo.",
    // Validar con el cliente: confirmar medios de pago y el descuento por pago total.
  },
  {
    question: "¿Puedo mandar mi track a mastering sin ser alumno?",
    answer:
      "Sí. El servicio de mix y mastering de La Juanita Studio está disponible para cualquier artista, sea alumno de la academia o no. Se trabaja en la sala tratada, sobre tu propio material, y el arranque se coordina por consulta porque depende del cupo de sala disponible.",
  },
];
