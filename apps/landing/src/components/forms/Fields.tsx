"use client";

import { useId, useState, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Primitivas de formulario.
 *
 * ⚠️ TODO ESTO ES VISUAL. No hay backend, no se envía nada a ningún lado:
 * el submit sólo muestra el estado de confirmación. Cuando exista el
 * endpoint, el único lugar a tocar es el `onSubmit` de <FormShell>.
 *
 * Decisiones de estilo: sin cajas redondeadas ni fondos grises. Los campos
 * son una línea inferior que se enciende en rojo al enfocarse — más cerca
 * de una planilla de estudio que de un formulario de SaaS, y coherente con
 * el resto del sistema.
 */

const fieldBase =
  "w-full border-0 border-b border-[color:var(--page-line)] bg-transparent px-0 py-3 text-[color:var(--page-fg)] outline-none transition-colors placeholder:text-[color:var(--page-faint)] focus:border-red";

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="t-mono block text-[color:var(--page-faint)]">
        {label}
        {required && <span className="ml-1 text-red">*</span>}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={clsx(fieldBase, "t-body mt-1")}
      />
    </div>
  );
}

export function TextArea({
  label,
  name,
  placeholder,
  rows = 4,
}: {
  label: string;
  name: string;
  placeholder?: string;
  rows?: number;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="t-mono block text-[color:var(--page-faint)]">
        {label}
      </label>
      <textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        className={clsx(fieldBase, "t-body mt-1 resize-none")}
      />
    </div>
  );
}

/**
 * Grupo de opciones tipo "botonera". Es un fieldset con radios reales —
 * accesible por teclado y por lector de pantalla — con los inputs ocultos
 * visualmente y el estilo puesto sobre el label.
 */
export function ChoiceGroup({
  label,
  name,
  options,
  defaultValue,
  columns = 2,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  columns?: number;
  /** Opcional: para los formularios que muestran un resumen en vivo. */
  onChange?: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="t-mono text-[color:var(--page-faint)]">{label}</legend>
      <div
        className="mt-3 grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {options.map((opt) => (
          <label
            key={opt.value}
            className="group relative cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              defaultChecked={defaultValue === opt.value}
              onChange={() => onChange?.(opt.value)}
              className="peer sr-only"
            />
            <span className="t-mono block border border-[color:var(--page-line)] px-3 py-3 text-center text-[color:var(--page-muted)] transition-colors peer-checked:border-red peer-checked:bg-red peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red">
              {opt.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Envoltorio de formulario con estado de confirmación.
 *
 * Al enviar no llama a ningún endpoint: muestra el mensaje de éxito y deja
 * el aviso de que la solicitud todavía no viaja a ningún lado, para que
 * nadie se quede esperando una respuesta que no va a llegar.
 */
export function FormShell({
  children,
  submitLabel,
  successTitle,
  successBody,
  compact = false,
}: {
  children: ReactNode;
  submitLabel: string;
  successTitle: string;
  successBody: string;
  compact?: boolean;
}) {
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <div className="border border-red/40 bg-red-tint p-8">
        <span className="label">Listo</span>
        <p className="t-display-tight mt-4 text-2xl">{successTitle}</p>
        <p className="t-body mt-3 max-w-[46ch] text-sm text-[color:var(--page-muted)]">
          {successBody}
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="t-mono link-u mt-6 text-red"
        >
          Cargar otra
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
      className={clsx("grid gap-6", compact ? "sm:gap-6" : "sm:gap-7")}
    >
      {children}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
        <button type="submit" className="btn btn--solid" data-cursor="ENVIAR">
          {submitLabel}
          <span aria-hidden className="text-[1.25em] leading-none">
            ↗
          </span>
        </button>
        <p className="t-mono max-w-[34ch] text-[color:var(--page-faint)]">
          Demo visual — todavía no se envía a ningún lado
        </p>
      </div>
    </form>
  );
}
