"use client";

import { Field, ChoiceGroup, TextArea, FormShell } from "@/components/forms/Fields";
import { GEAR } from "@/data/gear";

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
      successTitle="Consulta cargada"
      successBody="Cuando el formulario esté conectado, esto llega al equipo del shop y te responden con opciones y precios actualizados."
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Nombre y apellido" name="nombre" required autoComplete="name" />
        <Field label="Teléfono" name="telefono" type="tel" required autoComplete="tel" />
      </div>

      <Field label="Mail" name="email" type="email" required autoComplete="email" />

      <fieldset>
        <legend className="t-mono text-[color:var(--page-faint)]">
          Qué estás buscando
        </legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {GEAR.map((category) => (
            <label key={category.slug} className="cursor-pointer">
              <input
                type="checkbox"
                name="categorias"
                value={category.slug}
                className="peer sr-only"
              />
              <span className="t-mono block border border-[color:var(--page-line)] px-3 py-3 text-center text-[color:var(--page-muted)] transition-colors peer-checked:border-red peer-checked:bg-red peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red">
                {category.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <ChoiceGroup
        label="¿En qué nivel estás?"
        name="nivel"
        defaultValue="arrancando"
        columns={3}
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
