"use client";

import { Field, ChoiceGroup, TextArea, FormShell } from "@/components/forms/Fields";

/**
 * Solicitud de inscripción a un programa.
 *
 * La pregunta de experiencia previa es la que reemplaza a la vieja división
 * "inicial / avanzado": en vez de obligar a la persona a autodiagnosticarse
 * antes de leer nada, se resuelve acá, cuando ya sabe qué se enseña.
 */
export function ProgramApplyForm({ programName }: { programName: string }) {
  return (
    <FormShell
      submitLabel="Solicitar lugar"
      successTitle="Solicitud cargada"
      successBody="Cuando el formulario esté conectado, esto va a llegar al equipo y te responden por mail o WhatsApp en 48 horas hábiles."
    >
      <input type="hidden" name="programa" value={programName} />

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nombre y apellido" name="nombre" required autoComplete="name" placeholder="Juana Pérez" />
        <Field
          label="Teléfono"
          name="telefono"
          type="tel"
          required
          autoComplete="tel"
          placeholder="11 5555 5555"
        />
      </div>

      <Field
        label="Mail"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="vos@mail.com"
      />

      <ChoiceGroup
        label="Cómo querés cursar"
        name="modalidad"
        defaultValue="presencial"
        options={[
          { value: "presencial", label: "Presencial · Pilar" },
          { value: "virtual", label: "Virtual en vivo" },
        ]}
      />

      <ChoiceGroup
        label="¿Tenés experiencia previa?"
        name="experiencia"
        defaultValue="cero"
        options={[
          { value: "cero", label: "Arranco de cero" },
          { value: "algo", label: "Algo, por mi cuenta" },
          { value: "si", label: "Sí, ya toco/produzco" },
        ]}
        columns={3}
      />

      <TextArea
        label="Algo que quieras contarnos (opcional)"
        name="mensaje"
        rows={3}
        placeholder="En qué andás, qué te gustaría lograr, horarios que te sirven…"
      />
    </FormShell>
  );
}
