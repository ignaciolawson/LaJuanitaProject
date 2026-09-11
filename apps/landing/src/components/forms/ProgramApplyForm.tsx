"use client";

import { Field, ChoiceGroup, TextArea, FormShell } from "@/components/forms/Fields";
import { mandarSolicitud, type Disciplina, type Experiencia, type Modalidad } from "@/lib/api";

/**
 * De lo que la persona marca a lo que el sistema guarda (`V29`).
 *
 * Los `value` de los radios son de la interfaz; lo que viaja es el valor del
 * CHECK del sistema, **como campo y no como frase**: hasta `V29` esto se
 * mandaba adentro de `detalle` (*"Presencial en Pilar · arranca de cero"*) y el
 * buzón lo leía; ahora lo lee el alta para prellenar el nivel, y una frase no
 * se prellena. El buzón arma su propia lectura desde el valor.
 *
 * Tipados contra el enum para que agregar una opción acá sin agregarla allá
 * no compile, en vez de mandar `undefined` en silencio.
 */
const MODALIDAD: Record<string, Modalidad> = {
  presencial: "PRESENCIAL",
  virtual: "VIRTUAL",
};

const EXPERIENCIA: Record<string, Experiencia> = {
  cero: "CERO",
  algo: "ALGO",
  si: "TOCA",
};

/**
 * Solicitud de inscripción a un programa.
 *
 * La pregunta de experiencia previa es la que reemplaza a la vieja división
 * "inicial / avanzado": en vez de obligar a la persona a autodiagnosticarse
 * antes de leer nada, se resuelve acá, cuando ya sabe qué se enseña. **Y se
 * manda tal cual** —no traducida a un nivel—: el nivel lo sugiere el sistema al
 * inscribir y quien inscribe lo puede cambiar (P64).
 */
export function ProgramApplyForm({
  programName,
  disciplina,
}: {
  programName: string;
  /** Cómo se llama este programa en el sistema; sale de `data/programs.ts`. */
  disciplina: Disciplina;
}) {
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
          // Las tres como campos (`V29`). Ya no va `detalle`: decir lo mismo
          // dos veces es tener dos definiciones de lo que la persona pidió.
          disciplina,
          modalidad: MODALIDAD[String(datos.get("modalidad"))],
          experiencia: EXPERIENCIA[String(datos.get("experiencia"))],
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
