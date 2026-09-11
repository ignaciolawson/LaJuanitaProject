"use client";

import { Field, ChoiceGroup, TextArea, FormShell } from "@/components/forms/Fields";
import { mandarSolicitud, type Modalidad } from "@/lib/api";

/** Mismo mapa que en `ProgramApplyForm`: del radio al valor del sistema. */
const MODALIDAD: Record<string, Modalidad> = {
  presencial: "PRESENCIAL",
  virtual: "VIRTUAL",
};

/**
 * El recorrido sigue yendo en `detalle`, como frase, y no en `experiencia`.
 *
 * `experiencia` guarda una sola pregunta —cuánto ya hace de esto: cero, algo,
 * ya toca— y ésta es otra: hace cuánto. Meterla en la misma columna la
 * volvería una columna cuyo significado depende del programa, que es lo que
 * el buzón rechazó desde su primera migración. Quien atiende la lee igual.
 */
const RECORRIDO: Record<string, string> = {
  poco: "toca hace menos de un año",
  algo: "toca hace 1 a 3 años",
  mucho: "toca hace más de 3 años",
};

/**
 * Pedido de una sesión de mentoría (`mejoras.md` §16 · A7, P67).
 *
 * **Es un formulario distinto al de los cursos, y no una variante con un
 * campo menos.** El de los cursos pregunta si arrancás de cero, y acá eso no
 * tiene sentido: la mentoría es para quien ya toca. Lo que sí sirve saber es
 * hace cuánto y qué quiere destrabar —que es lo primero que el mentor va a
 * preguntar, así que mejor que llegue escrito.
 *
 * Manda `interes: "CURSO"` como los otros dos, con `disciplina: "MENTORIA"`
 * como campo (`V29`). **Y `experiencia: "TOCA"` fijo**: este formulario no lo
 * pregunta porque su público ya toca (P67) — es la premisa del programa, no
 * un dato que la persona tenga que confirmar. Lo que sí pregunta, hace cuánto,
 * va en `detalle`.
 */
export function MentoringApplyForm({ programName }: { programName: string }) {
  return (
    <FormShell
      submitLabel="Pedir una sesión"
      successTitle="Recibimos tu pedido"
      successBody="Te escribimos por WhatsApp para coordinar la primera sesión y contarte el precio. Si necesitás algo antes, escribinos por WhatsApp."
      enviar={async (datos) =>
        mandarSolicitud({
          nombre: String(datos.get("nombre") ?? ""),
          apellido: String(datos.get("apellido") ?? ""),
          email: String(datos.get("email") ?? ""),
          telefono: String(datos.get("telefono") ?? ""),
          interes: "CURSO",
          disciplina: "MENTORIA",
          experiencia: "TOCA",
          modalidad: MODALIDAD[String(datos.get("modalidad"))],
          detalle: RECORRIDO[String(datos.get("recorrido"))],
          mensaje: String(datos.get("mensaje") ?? "") || undefined,
        })
      }
    >
      <input type="hidden" name="programa" value={programName} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" required autoComplete="given-name" placeholder="Juana" />
        <Field label="Apellido" name="apellido" required autoComplete="family-name" placeholder="Pérez" />
      </div>

      {/* El teléfono es obligatorio por lo mismo que en los cursos: todo lo que
          sigue pasa por WhatsApp. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field
          label="Teléfono"
          name="telefono"
          type="tel"
          required
          autoComplete="tel"
          placeholder="11 5555 5555"
        />
        <Field
          label="Mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vos@mail.com"
        />
      </div>

      <ChoiceGroup
        label="Cómo preferís hacerla"
        name="modalidad"
        defaultValue="presencial"
        options={[
          { value: "presencial", label: "Presencial · Pilar" },
          { value: "virtual", label: "Virtual" },
        ]}
      />

      <ChoiceGroup
        label="¿Hace cuánto tocás?"
        name="recorrido"
        defaultValue="algo"
        options={[
          { value: "poco", label: "Menos de un año" },
          { value: "algo", label: "Entre 1 y 3 años" },
          { value: "mucho", label: "Más de 3 años" },
        ]}
        columns={3}
        columnsMobile={1}
      />

      {/* Obligatorio, a diferencia del mensaje de los cursos: una mentoría sin
          saber qué quiere destrabar la persona es una sesión que arranca de
          cero, que es justo lo que la mentoría no es. */}
      <TextArea
        label="Dónde estás y qué querés destrabar"
        name="mensaje"
        required
        rows={4}
        placeholder="Dónde tocás, qué te está frenando, si tenés un set grabado para que escuchemos…"
      />
    </FormShell>
  );
}
