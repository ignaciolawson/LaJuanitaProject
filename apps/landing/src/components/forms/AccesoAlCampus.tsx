import Link from "next/link";

/**
 * La puerta al campus. **No es un formulario, y esa es la decisión.**
 *
 * Acá había un formulario de login que no autenticaba nada, con el `onSubmit`
 * marcado como *"el único punto a tocar cuando exista el backend"*. El backend
 * existe desde hace semanas, y al ir a conectarlo apareció el problema de fondo:
 * **una sesión iniciada acá no se le puede entregar a la plataforma.**
 *
 * Son dos aplicaciones en orígenes distintos —este sitio y el sistema— y
 * `localStorage` no se comparte entre orígenes: el token quedaría guardado de
 * este lado, donde no hay ninguna pantalla que lo use, y la plataforma seguiría
 * pidiendo entrar. Las dos salidas conocidas son peores que el problema:
 *
 * - **Pasar el token por la URL** al redirigir. Queda en el historial del
 *   navegador, en el `Referer` y en cualquier extensión instalada. Es el patrón
 *   que la industria abandonó, y este proyecto se toma el trabajo de que las tres
 *   formas de fallar un login tarden lo mismo — no es coherente regalar la
 *   credencial en una barra de direcciones.
 * - **Apostar a que las dos apps queden en el mismo dominio.** Podría pasar, pero
 *   es exactamente la decisión de hosting que todavía no está tomada, y ataría
 *   este sitio a una forma de deploy que nadie eligió.
 *
 * **Un link funciona con cualquiera de las dos.** Y si algún día se decide mismo
 * origen, convertir esto en un formulario de verdad es un cambio chico — al
 * revés, desarmar un login mal entregado no lo es.
 *
 * Lo que sí se ganó: *"olvidé mi contraseña"* ya no está. No existe y no puede
 * existir —no hay infraestructura de correo—, así que ofrecerlo mandaba a la
 * persona a una puerta que no abre. La salida real es escribir, y es la que está.
 */
const PLATAFORMA = process.env.NEXT_PUBLIC_PLATFORM_URL ?? "http://localhost:5173";

export function AccesoAlCampus() {
  return (
    <div className="grid gap-7">
      <a href={`${PLATAFORMA}/login`} className="btn btn--solid justify-center" data-cursor="ENTRAR">
        Iniciar sesión
        <span aria-hidden className="text-[1.25em] leading-none">
          ↗
        </span>
      </a>

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
