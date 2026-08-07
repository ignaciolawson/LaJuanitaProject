"use client";

import { useState } from "react";
import Link from "next/link";
import { Field } from "@/components/forms/Fields";

/**
 * Formulario de ingreso.
 *
 * ⚠️ NO AUTENTICA NADA. No hay backend, no hay sesión, no hay validación de
 * credenciales. Al enviar muestra un aviso explícito de que todavía no está
 * conectado, en vez de fingir un error de contraseña o un redirect a un
 * campus que no existe: hacer parecer que funciona es peor que decir que no.
 *
 * Cuando exista el backend, el `onSubmit` es el único punto a cambiar.
 */
export function LoginForm() {
  const [tried, setTried] = useState(false);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
      }}
      className="grid gap-7"
    >
      <Field
        label="Mail"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="vos@mail.com"
      />
      <Field
        label="Contraseña"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" name="recordarme" className="peer sr-only" />
          <span className="block h-4 w-4 border border-[color:var(--page-line)] transition-colors peer-checked:border-red peer-checked:bg-red peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-red" />
          <span className="t-mono text-[color:var(--page-muted)]">Mantener sesión</span>
        </label>

        <button type="button" className="t-mono link-u text-[color:var(--page-faint)]">
          Olvidé mi contraseña
        </button>
      </div>

      <button type="submit" className="btn btn--solid mt-2 justify-center" data-cursor="ENTRAR">
        Iniciar sesión
        <span aria-hidden className="text-[1.25em] leading-none">
          ↗
        </span>
      </button>

      {tried && (
        <p
          role="status"
          className="t-body border border-red/40 bg-red-tint p-4 text-sm text-[color:var(--page-fg)]"
        >
          El campus todavía no está conectado — esta pantalla es sólo la
          maqueta visual. Para cualquier gestión, escribinos por{" "}
          <Link href="/contacto" className="link-u text-red">
            contacto
          </Link>
          .
        </p>
      )}
    </form>
  );
}
