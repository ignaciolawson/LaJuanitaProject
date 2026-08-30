"use client";

import { Field, ChoiceGroup, TextArea, FormShell } from "@/components/forms/Fields";
import { mandarSolicitud } from "@/lib/api";

/**
 * Cómo se lee cada opción en la ficha que ve administración.
 *
 * Los `value` viajan cortos porque son de la interfaz; en el buzón se lee una
 * frase. Sin esto la ficha diría "cero" y "presencial", que a quien llama no le
 * dicen lo mismo que "arranca de cero, presencial en Pilar".
 */
const MODALIDAD: Record<string, string> = {
  presencial: "Presencial en Pilar",
  virtual: "Virtual en vivo",
};

const EXPERIENCIA: Record<string, string> = {
  cero: "arranca de cero",
  algo: "algo por su cuenta",
  si: "ya toca o produce",
};

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
      successTitle="Recibimos tu solicitud"
      successBody="Te escribimos por WhatsApp o mail para contarte cómo sigue y coordinar el horario. Si necesitás algo antes, escribinos por WhatsApp."
      enviar={async (datos) =>
        mandarSolicitud({
          nombre: String(datos.get("nombre") ?? ""),
          apellido: String(datos.get("apellido") ?? ""),
          email: String(datos.get("email") ?? ""),
          telefono: String(datos.get("telefono") ?? ""),
          interes: "CURSO",
          // El programa es lo primero del detalle porque es lo que decide a qué
          // pantalla va quien atiende la ficha.
          detalle: [
            programName,
            MODALIDAD[String(datos.get("modalidad"))] ?? null,
            EXPERIENCIA[String(datos.get("experiencia"))] ?? null,
          ]
            .filter(Boolean)
            .join(" · "),
          mensaje: String(datos.get("mensaje") ?? "") || undefined,
        })
      }
    >
      <input type="hidden" name="programa" value={programName} />

      {/* Nombre y apellido separados, no un campo partido después: el sistema los
          guarda en dos columnas y partir "Juana Pérez López" es adivinar dónde
          termina el nombre. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" required autoComplete="given-name" placeholder="Juana" />
        <Field label="Apellido" name="apellido" required autoComplete="family-name" placeholder="Pérez" />
      </div>

      {/* El teléfono es obligatorio y no es una preferencia de esta pantalla: el
          sistema no manda mails —no hay infraestructura de correo ni la va a
          haber— así que todo lo que sigue después de esto pasa por WhatsApp. */}
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
        label="Cómo querés cursar"
        name="modalidad"
        defaultValue="presencial"
        options={[
          { value: "presencial", label: "Presencial · Pilar" },
          { value: "virtual", label: "Virtual en vivo" },
        ]}
      />

      {/* Una sola columna en el teléfono: estas etiquetas son frases, y en
          tres columnas de ~80px se partían en cinco renglones cada una. */}
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
        columnsMobile={1}
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
