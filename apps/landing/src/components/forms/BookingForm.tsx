"use client";

import { useState } from "react";
import {
  Field,
  ChoiceGroup,
  ChoiceGrid,
  choiceOption,
  FormShell,
} from "@/components/forms/Fields";
import { SERVICES } from "@/data/services";
import { mandarSolicitud, type Interes } from "@/lib/api";

/**
 * De qué servicio de la landing sale cada interés del sistema.
 *
 * **Son los dos usos de sala que el sistema deja pedir sin que administración
 * los arme**, y del otro lado el catálogo los tiene marcados uno por uno. Si esta
 * página suma un tercer servicio, el valor por defecto es `OTRO` —una ficha que
 * igual llega— y no un valor inventado que la API rechace.
 */
const INTERES_POR_SERVICIO: Record<string, Interes> = {
  cabina: "ALQUILER_CABINA",
  "grabacion-sets": "GRABACION_SET",
};

/** `2026-09-10` → `10/09`. La ficha la lee una persona, no un parser. */
function comoDia(iso: string): string {
  const [anio, mes, dia] = iso.split("-");
  return dia && mes ? `${dia}/${mes}/${anio}` : iso;
}

/**
 * Reserva de cabina / grabación.
 *
 * El resumen de la derecha se actualiza mientras completás: servicio,
 * duración y cantidad de personas. Es lo que evita que una reserva por hora
 * se sienta un trámite a ciegas — ves lo que estás pidiendo antes de pedirlo.
 *
 * El precio mostrado es de referencia y está marcado como tal: prometer un
 * total exacto en un formulario que todavía no valida disponibilidad sería
 * mentirle a quien reserva.
 */
export function BookingForm({ defaultService }: { defaultService?: string }) {
  const [service, setService] = useState(defaultService ?? SERVICES[0].slug);
  const [hours, setHours] = useState(1);
  const [people, setPeople] = useState("1");

  const current = SERVICES.find((s) => s.slug === service) ?? SERVICES[0];
  const hourly = Number(current.price.replace(/[^\d]/g, ""));
  const estimate = hourly * hours;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-14">
      <FormShell
        submitLabel="Pedir reserva"
        successTitle="Recibimos tu pedido"
        successBody="Todavía no reserva la sala: confirmamos disponibilidad y el precio final, y recién ahí te la apartamos. Te escribimos por WhatsApp."
        enviar={async (datos) =>
          mandarSolicitud({
            nombre: String(datos.get("nombre") ?? ""),
            apellido: String(datos.get("apellido") ?? ""),
            email: String(datos.get("email") ?? ""),
            telefono: String(datos.get("telefono") ?? ""),
            interes: INTERES_POR_SERVICIO[service] ?? "OTRO",
            // Fecha, hora, duración y personas viajan en texto: del otro lado
            // nadie los procesa. La reserva la carga administración a mano —no
            // existe sin una seña, y quien pide no tiene cómo ponerla— así que
            // esto es para saber qué proponer, no un pedido que el sistema ejecuta.
            detalle: [
              current.name,
              `${comoDia(String(datos.get("fecha") ?? ""))} a las ${datos.get("hora") ?? ""}`,
              `${hours} ${hours === 1 ? "hora" : "horas"}`,
              people === "2" ? "dos personas" : "una persona",
            ].join(" · "),
          })
        }
      >
        <fieldset>
          <legend className="t-mono text-[color:var(--page-faint)]">Qué querés reservar</legend>
          <ChoiceGrid columns={2} columnsMobile={1} className="mt-3">
            {SERVICES.map((s) => (
              <label key={s.slug} className="cursor-pointer">
                <input
                  type="radio"
                  name="servicio"
                  value={s.slug}
                  checked={service === s.slug}
                  onChange={() => {
                    setService(s.slug);
                    setHours(1);
                  }}
                  className="peer sr-only"
                />
                <span className={choiceOption}>{s.name}</span>
              </label>
            ))}
          </ChoiceGrid>
        </fieldset>

        {/* Nombre y apellido separados: el sistema los guarda en dos columnas y
            partirlos después es adivinar dónde termina el nombre. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Nombre" name="nombre" required autoComplete="given-name" />
          <Field label="Apellido" name="apellido" required autoComplete="family-name" />
        </div>

        {/* El teléfono es obligatorio: todo lo que sigue pasa por WhatsApp. */}
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Teléfono" name="telefono" type="tel" required autoComplete="tel" />
          <Field label="Mail" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Fecha" name="fecha" type="date" required />
          <Field label="Hora de inicio" name="hora" type="time" required />
        </div>

        <fieldset>
          <legend className="t-mono text-[color:var(--page-faint)]">Duración</legend>
          {/* Las etiquetas acá son cortas ("3 horas"), así que en el teléfono
              entran dos por fila sin partirse — a diferencia de la botonera de
              experiencia, que necesita una sola columna. */}
          <ChoiceGrid
            columns={current.durations.length}
            columnsMobile={2}
            className="mt-3"
          >
            {current.durations.map((h) => (
              <label key={h} className="cursor-pointer">
                <input
                  type="radio"
                  name="duracion"
                  value={h}
                  checked={hours === h}
                  onChange={() => setHours(h)}
                  className="peer sr-only"
                />
                <span className={choiceOption}>
                  {h} {h === 1 ? "hora" : "horas"}
                </span>
              </label>
            ))}
          </ChoiceGrid>
        </fieldset>

        <ChoiceGroup
          label="¿Van solos o en dupla?"
          name="personas"
          defaultValue="1"
          onChange={setPeople}
          options={[
            { value: "1", label: "Una persona" },
            { value: "2", label: "Dos personas" },
          ]}
        />
      </FormShell>

      {/* Resumen en vivo */}
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="border border-[color:var(--page-line)] p-6">
          <span className="label">Tu reserva</span>

          <p className="t-display-tight mt-5 text-2xl leading-tight">{current.name}</p>
          <p className="t-serif mt-1 text-lg text-[color:var(--page-muted)]">{current.tagline}</p>

          <dl className="mt-6 space-y-3 border-t border-[color:var(--page-line)] pt-5">
            <div className="flex justify-between gap-4">
              <dt className="t-mono text-[color:var(--page-faint)]">Duración</dt>
              <dd className="t-mono">
                {hours} {hours === 1 ? "hora" : "horas"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="t-mono text-[color:var(--page-faint)]">Personas</dt>
              <dd className="t-mono">{people === "2" ? "Dos" : "Una"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[color:var(--page-line)] pt-3">
              <dt className="t-mono text-[color:var(--page-faint)]">Estimado</dt>
              <dd className="t-display-tight text-xl text-accent">
                ${estimate.toLocaleString("es-AR")}
              </dd>
            </div>
          </dl>

          <p className="t-mono mt-4 leading-relaxed text-[color:var(--page-faint)]">
            Referencia. El precio final se confirma con disponibilidad de sala.
          </p>

          <ul className="mt-6 space-y-2 border-t border-[color:var(--page-line)] pt-5">
            {current.includes.map((item) => (
              <li key={item} className="t-body flex gap-2 text-sm text-[color:var(--page-muted)]">
                <span aria-hidden className="text-accent">
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
