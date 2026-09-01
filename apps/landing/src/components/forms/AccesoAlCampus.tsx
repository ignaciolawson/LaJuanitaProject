"use client";

import { useState } from "react";
import Link from "next/link";

import { Field } from "./Fields";
import { iniciarSesion } from "@/lib/sesion";

/**
 * La puerta al campus. **Ahora sí es un formulario, y eso cambió el 2026-08-31.**
 *
 * Durante meses acá hubo dos links, y era la decisión correcta con la
 * información de entonces. El problema no era escribir el formulario: era que
 * **una sesión iniciada acá no se le podía entregar a la plataforma.** Son dos
 * aplicaciones, y `localStorage` no se comparte entre orígenes distintos: el
 * token quedaba guardado de este lado, donde no hay ninguna pantalla que lo use,
 * y la plataforma seguía pidiendo entrar. Las dos salidas conocidas eran peores
 * que el problema:
 *
 * - **Pasar el token por la URL** al redirigir. Queda en el historial del
 *   navegador, en el `Referer` y en cualquier extensión instalada. Es el patrón
 *   que la industria abandonó, y este proyecto se toma el trabajo de que las tres
 *   formas de fallar un login tarden lo mismo — no es coherente regalar la
 *   credencial en una barra de direcciones.
 * - **Apostar a que las dos apps queden en el mismo dominio**, que era la
 *   decisión de hosting que faltaba tomar.
 *
 * **Se tomó la segunda, y dejó de ser una apuesta**: landing en `/`, plataforma
 * en `/app`, backend en `/api`, todo detrás de un proxy. Con un solo origen
 * `localStorage` se comparte y la entrega es directa, sin token en la URL. El
 * mecanismo está en `@/lib/sesion`, con la advertencia de acoplamiento que hay
 * que leer antes de tocarlo.
 *
 * Lo que NO volvió: *"olvidé mi contraseña"*. No existe y no puede existir —no
 * hay infraestructura de correo—, así que ofrecerlo mandaba a la persona a una
 * puerta que no abre. La salida real es escribir, y es la que está abajo.
 */

/**
 * Dónde vive la plataforma. **Es una ruta del mismo origen, no una URL.**
 *
 * Sólo la usa "Crear mi cuenta": el registro sigue siendo una pantalla de la
 * plataforma y no se duplica acá. Un login es un campo y una contraseña; un alta
 * tiene validaciones, mensajes de error por campo y la regla de que el mail
 * duplicado se avisa — mantener dos copias de eso es cómo se desincronizan.
 */
const PLATAFORMA = process.env.NEXT_PUBLIC_PLATFORM_URL ?? "/app";

export function AccesoAlCampus() {
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  return (
    <div className="grid gap-7">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget);
          setEntrando(true);
          setError(null);

          try {
            await iniciarSesion(
              String(datos.get("email") ?? ""),
              String(datos.get("password") ?? ""),
            );
            // No se baja `entrando` acá: si salió bien, el navegador ya está
            // yendo a `/app` y el botón tiene que quedar deshabilitado hasta que
            // esta página desaparezca. Bajarlo abriría una ventana para mandar
            // el formulario dos veces mientras redirige.
          } catch (fallo) {
            setError(fallo instanceof Error ? fallo.message : "No pudimos entrar.");
            // Y acá SÍ, siempre. Es el error que costó tres días en la
            // plataforma (`mejoras.md` §8.1): un botón que se queda en
            // "Entrando…" para siempre porque el reset vivía en un solo camino.
            setEntrando(false);
          }
        }}
        className="grid gap-6"
      >
        <Field
          label="Mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="vos@ejemplo.com"
        />
        <Field
          label="Contraseña"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />

        {error && (
          <p
            role="alert"
            className="t-body border border-red/40 bg-red-tint p-4 text-sm text-[color:var(--page-fg)]"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="btn btn--solid justify-center disabled:opacity-60"
          data-cursor="ENTRAR"
        >
          {entrando ? "Entrando…" : "Entrar"}
          <span aria-hidden className="text-[1.25em] leading-none">
            ↗
          </span>
        </button>
      </form>

      <a href={`${PLATAFORMA}/registro`} className="btn justify-center">
        Crear mi cuenta
      </a>

      {/* Que crearse la cuenta no sea lo mismo que ser alumno no es un detalle:
          es la forma del sistema. Se necesita cuenta para ver tus reservas, y
          quien alquila una cabina una vez no se inscribe en nada. */}
      <p className="t-body text-sm text-[color:var(--page-muted)]">
        La cuenta la podés crear vos, seas alumno o no: hace falta para ver tus
        reservas y tus pagos. Si ya estudiás acá y no tenés acceso,{" "}
        <Link href="/contacto" className="link-u text-accent">
          escribinos
        </Link>{" "}
        y te lo habilitamos.
      </p>
    </div>
  );
}
