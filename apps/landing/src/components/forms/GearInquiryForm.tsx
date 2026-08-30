"use client";

import {
  Field,
  ChoiceGroup,
  ChoiceGrid,
  choiceOption,
  TextArea,
  FormShell,
} from "@/components/forms/Fields";
import { GEAR } from "@/data/gear";
import { mandarSolicitud } from "@/lib/api";

const NIVEL: Record<string, string> = {
  arrancando: "arrancando",
  tocando: "ya toca",
  renovando: "renueva cabina",
};

const PRESUPUESTO: Record<string, string> = {
  "no-se": "presupuesto sin definir",
  definido: "presupuesto definido",
};

/**
 * Consulta de equipamiento.
 *
 * Las tres preguntas —qué categoría, qué nivel, qué presupuesto— son las
 * que el vendedor haría igual apenas empieza la charla. Preguntarlas acá no
 * agrega fricción: le ahorra dos mensajes de ida y vuelta a los dos lados.
 *
 * El presupuesto va por rangos y no por monto exacto: pedir una cifra
 * cerrada espanta a quien todavía está averiguando, que es justo el público
 * de esta página.
 */
export function GearInquiryForm() {
  return (
    <FormShell
      submitLabel="Enviar consulta"
      successTitle="Recibimos tu consulta"
      successBody="Te escribimos con opciones y precios actualizados. Los equipos se piden a Pioneer, así que la disponibilidad la confirmamos al responderte."
      enviar={async (datos) =>
        mandarSolicitud({
          nombre: String(datos.get("nombre") ?? ""),
          apellido: String(datos.get("apellido") ?? ""),
          email: String(datos.get("email") ?? ""),
          telefono: String(datos.get("telefono") ?? ""),
          interes: "EQUIPOS",
          // Las categorías son checkboxes: `getAll`, no `get`. Con `get` viajaría
          // sólo la primera y la ficha diría que alguien pregunta por una sola
          // cosa cuando marcó tres.
          detalle: [
            datos.getAll("categorias").map(String).map(nombreDeCategoria).join(", ") || null,
            NIVEL[String(datos.get("nivel"))] ?? null,
            PRESUPUESTO[String(datos.get("presupuesto"))] ?? null,
          ]
            .filter(Boolean)
            .join(" · "),
          mensaje: String(datos.get("mensaje") ?? "") || undefined,
        })
      }
    >
      {/* Nombre y apellido separados: el sistema los guarda en dos columnas. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nombre" name="nombre" required autoComplete="given-name" />
        <Field label="Apellido" name="apellido" required autoComplete="family-name" />
      </div>

      {/* El teléfono es obligatorio: la respuesta va por WhatsApp. */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Teléfono" name="telefono" type="tel" required autoComplete="tel" />
        <Field label="Mail" name="email" type="email" required autoComplete="email" />
      </div>

      <fieldset>
        <legend className="t-mono text-[color:var(--page-faint)]">
          Qué estás buscando
        </legend>
        <ChoiceGrid columns={2} columnsMobile={1} className="mt-3">
          {GEAR.map((category) => (
            <label key={category.slug} className="cursor-pointer">
              <input
                type="checkbox"
                name="categorias"
                value={category.slug}
                className="peer sr-only"
              />
              <span className={choiceOption}>{category.name}</span>
            </label>
          ))}
        </ChoiceGrid>
      </fieldset>

      <ChoiceGroup
        label="¿En qué nivel estás?"
        name="nivel"
        defaultValue="arrancando"
        columns={3}
        columnsMobile={1}
        options={[
          { value: "arrancando", label: "Arrancando" },
          { value: "tocando", label: "Ya toco" },
          { value: "renovando", label: "Renuevo cabina" },
        ]}
      />

      <ChoiceGroup
        label="Presupuesto aproximado"
        name="presupuesto"
        defaultValue="no-se"
        columns={2}
        options={[
          { value: "no-se", label: "Todavía no sé" },
          { value: "definido", label: "Lo tengo definido" },
        ]}
      />

      <TextArea
        label="Contanos un poco más (opcional)"
        name="mensaje"
        rows={3}
        placeholder="Qué equipo tenés hoy, dónde vas a tocar, si te interesa algo puntual…"
      />
    </FormShell>
  );
}

/** El slug de una categoría no le dice nada a quien atiende la ficha. */
function nombreDeCategoria(slug: string): string {
  return GEAR.find((c) => c.slug === slug)?.name ?? slug;
}
