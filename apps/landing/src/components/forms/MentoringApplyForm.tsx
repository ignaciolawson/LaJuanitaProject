"use client";

import { Field, ChoiceGroup, TextArea, FormShell } from "@/components/forms/Fields";
import { mandarSolicitud } from "@/lib/api";

/**
 * Cómo se lee cada opción en la ficha que ve administración. Mismo criterio
 * que `ProgramApplyForm`: los `value` son de la interfaz, el buzón lee frases.
 */
const MODALIDAD: Record<string, string> = {
  presencial: "Presencial en Pilar",
  virtual: "Virtual",
};

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
 * Manda `interes: "CURSO"` como los otros dos: la disciplina se elige recién
 * al inscribir, y `MENTORIA` está en el sistema desde `V1`. El programa viaja
 * primero en `detalle` porque es lo que decide a qué pantalla va quien atiende
 * la ficha. **Los campos estructurados (programa, experiencia, modalidad)
 * llegan con `V29`**, y ahí se actualizan los tres formularios de una.
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
          detalle: [
            programName,
            MODALIDAD[String(datos.get("modalidad"))] ?? null,
            RECORRIDO[String(datos.get("recorrido"))] ?? null,
          ]
            .filter(Boolean)
            .join(" · "),
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
