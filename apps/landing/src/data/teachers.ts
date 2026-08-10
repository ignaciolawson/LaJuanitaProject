export type Teacher = {
  name: string;
  role: string;
  bio: string;
  image: string;
};

export const TEACHERS: Teacher[] = [
  {
    name: "Ghezz",
    role: "Director de Producción, Sello y Mastering",
    bio: "Al frente del área de producción y del sello discográfico. Referente en mastering, con años de trayectoria formando productores.",
    image: "/images/artistas/ghezz.webp",
  },
  {
    name: "Najles",
    role: "Profesor de DJ — Mezcla y Performance",
    // Placeholder — confirmar bio real.
    bio: "DJ activo en la escena local, especializado en mezcla armónica y lectura de pista para dancefloor.",
    image: "/images/artistas/najles.webp",
  },
  {
    name: "Chapa Castelo",
    role: "Profesores de Producción Musical",
    // Placeholder — confirmar bio real.
    bio: "Dúo de productores enfocado en diseño de sonido y arreglo, acompañan a los alumnos en el armado de su primer EP.",
    image: "/images/artistas/chapa-castelo.webp",
  },
];
