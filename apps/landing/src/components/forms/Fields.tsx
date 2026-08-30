"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";

/**
 * Primitivas de formulario.
 *
 * ✅ **Conectados el 2026-08-30.** Los formularios mandan de verdad: cada uno
 * arma su ficha y `FormShell` la manda a `POST /api/solicitantes`, que del otro
 * lado es una fila en el buzón de administración. Durante casi tres semanas esto
 * contestaba *"listo, lo recibimos"* sin que el pedido saliera del navegador —el
 * aviso visible de "todavía no se envía" se había sacado por pedido explícito el
 * 2026-08-09— y **ese era el motivo por el que este sitio no se podía publicar**.
 *
 * ⚠️ Lo que hay que no romper está en `FormShell`: **el mensaje de éxito se
 * muestra sólo si el envío salió bien.** Un `catch` que igual dé por enviado
 * reabre el mismo agujero con más código.
 *
 * Decisiones de estilo: sin cajas redondeadas ni fondos grises. Los campos
 * son una línea inferior que se enciende en rojo al enfocarse — más cerca
 * de una planilla de estudio que de un formulario de SaaS, y coherente con
 * el resto del sistema.
 */

/**
 * El borde va con `--page-field` y no con `--page-line`: es un componente de
 * interfaz, no una línea decorativa, y a 0.16 de opacidad daba 1,42:1 — la
 * mitad del 3:1 que pide AA para saber dónde se escribe.
 *
 * Y NO lleva `outline-none`. Lo llevaba, y con eso anulaba el
 * `:focus-visible` global de `globals.css` (un outline rojo de 2px con 3px de
 * offset, que está bien definido) y lo dejaba reemplazado por `focus:border-red`:
 * o sea que navegando con teclado, saber en qué campo estabas dependía de
 * notar que una línea de 1px había cambiado de tono. El cambio de borde se
 * conserva, pero como refuerzo del outline, no en su lugar.
 */
const fieldBase =
  "w-full border-0 border-b border-[color:var(--page-field)] bg-transparent px-0 py-3 text-[color:var(--page-fg)] transition-colors placeholder:text-[color:var(--page-faint)] focus:border-red";

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
        {required && <span className="ml-1 text-accent">*</span>}
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
  columnsMobile,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  /** Columnas de 640px para arriba. */
  columns?: number;
  /**
   * Columnas abajo de 640px. Por defecto se topea en 2, que es lo máximo que
   * entra en un teléfono con etiquetas cortas; si las etiquetas son largas
   * ("Sí, ya toco/produzco") hay que bajarlo a 1 explícitamente.
   */
  columnsMobile?: number;
  /** Opcional: para los formularios que muestran un resumen en vivo. */
  onChange?: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="t-mono text-[color:var(--page-faint)]">{label}</legend>
      <ChoiceGrid columns={columns} columnsMobile={columnsMobile} className="mt-3">
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
            <span className={choiceOption}>{opt.label}</span>
          </label>
        ))}
      </ChoiceGrid>
    </fieldset>
  );
}

/**
 * Grilla responsive de opciones. La usan `ChoiceGroup` y los grupos que se
 * arman a mano (categorías de equipos, servicios, duración de la reserva),
 * para que todos partan igual en un teléfono.
 */
export function ChoiceGrid({
  children,
  columns = 2,
  columnsMobile,
  className,
}: {
  children: ReactNode;
  columns?: number;
  columnsMobile?: number;
  className?: string;
}) {
  return (
    <div
      className={clsx("choice-grid", className)}
      style={
        {
          "--choice-cols": columns,
          "--choice-cols-sm": columnsMobile ?? Math.min(columns, 2),
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * Estilo compartido del "botón" de opción (el <span> encima del input).
 * El `display` lo pone `.choice-option` en globals.css — ver el comentario
 * ahí: una utilidad `block` acá le ganaría al centrado vertical en táctil.
 */
export const choiceOption =
  "choice-option t-mono border border-[color:var(--page-field)] px-3 py-3 text-center text-[color:var(--page-muted)] transition-colors peer-checked:border-red peer-checked:bg-red peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red";

/**
 * Envoltorio de formulario: manda, y recién ahí confirma.
 *
 * **Quién manda es esto y no cada formulario**, y quién sabe leerse a sí mismo es
 * cada formulario: por eso `enviar` recibe el `FormData` ya armado y devuelve la
 * ficha. Con el envío repetido en los cuatro, agregarle un campo a la ficha
 * significaría acordarse cuatro veces.
 *
 * ⚠️ **El mensaje de éxito sale sólo si el envío salió bien.** Es la regla entera
 * de este componente: hasta el 2026-08-30 contestaba "listo" sin mandar nada, y
 * eso es lo que tenía a la landing sin publicar. Si el pedido falla, se muestra el
 * mensaje que vino de la API y **el formulario queda como estaba**, con lo que la
 * persona escribió adentro, para que pueda reintentar sin volver a completarlo.
 */
export function FormShell({
  children,
  submitLabel,
  successTitle,
  successBody,
  compact = false,
  enviar,
}: {
  children: ReactNode;
  submitLabel: string;
  successTitle: string;
  successBody: string;
  compact?: boolean;
  /** Lee el formulario y manda la ficha. Tira si no llegó. */
  enviar: (datos: FormData) => Promise<void>;
}) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

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
          className="t-mono link-u mt-6 text-accent"
        >
          Cargar otra
        </button>
      </div>
    );
  }

  return (
    /* Sin `noValidate`: estaba puesto y anulaba los `required` de todos los
       campos, así que el formulario contestaba "listo, lo recibimos" con
       nombre, teléfono y mail vacíos — la marca roja del asterisco no
       validaba nada. */
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        setEnviando(true);
        setError(null);
        try {
          await enviar(datos);
          setSent(true);
        } catch (fallo) {
          setError(
            fallo instanceof Error
              ? fallo.message
              : "No pudimos enviar tu solicitud. Probá de nuevo en un momento.",
          );
        } finally {
          setEnviando(false);
        }
      }}
      className={clsx("grid gap-6", compact ? "sm:gap-6" : "sm:gap-7")}
    >
      {children}

      {error && (
        <p
          role="alert"
          className="t-body border border-red/40 bg-red-tint p-4 text-sm text-[color:var(--page-fg)]"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2">
        <button
          type="submit"
          disabled={enviando}
          className="btn btn--solid disabled:opacity-60"
          data-cursor="ENVIAR"
        >
          {enviando ? "Enviando…" : submitLabel}
          <span aria-hidden className="text-[1.25em] leading-none">
            ↗
          </span>
        </button>
      </div>
    </form>
  );
}
