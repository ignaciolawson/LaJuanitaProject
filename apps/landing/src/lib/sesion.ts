import { API_URL } from "./api";

/**
 * Iniciar sesión desde la landing y entregársela a la plataforma.
 *
 * **Esto sólo puede existir porque las dos apps comparten origen** (decisión del
 * 2026-08-31: landing en `/`, plataforma en `/app`, backend en `/api`, todo
 * detrás de un proxy). `localStorage` es por ORIGEN y no por path, así que la
 * credencial que escribe este archivo es exactamente la que lee la plataforma en
 * `apps/platform/src/auth/credencial.ts`.
 *
 * Antes de esa decisión no se podía, y las dos salidas conocidas eran peores que
 * el problema: pasar el token por la URL —queda en el historial y en el
 * `Referer`— o atar el sitio a una forma de deploy que nadie había elegido. La
 * historia completa está en `AccesoAlCampus`.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ **ESTE ARCHIVO ESTÁ ACOPLADO A LA PLATAFORMA Y NADIE LO VA A NOTAR.**
 *
 * `CLAVE_CREDENCIAL` y la forma de `{ token, expiraEn }` están copiadas de
 * `apps/platform/src/auth/credencial.ts`. Son dos builds separados: no hay
 * compilador, ni test, ni tipo compartido que los vincule.
 *
 * **El modo de falla es el peor posible: silencioso.** Si la plataforma cambia
 * cómo guarda el token —otra clave, otro formato, una cookie— este login sigue
 * contestando 200, sigue guardando algo, sigue redirigiendo, y la persona
 * aterriza en la pantalla de login de la plataforma **sin un solo error en
 * ningún lado**. Se ve idéntico a "puse mal la contraseña".
 *
 * Si tocás el formato allá, tocalo acá. La advertencia gemela está escrita en
 * ese archivo.
 * ═══════════════════════════════════════════════════════════════════════
 */
const CLAVE_CREDENCIAL = "lajuanita.credencial";

/** A dónde se entra una vez adentro. */
const PLATAFORMA = "/app";

/**
 * Lo que devuelve `POST /api/auth/login`. Espeja `LoginResponse` del backend.
 *
 * `usuario` viaja en la respuesta y acá **no se usa a propósito**: la plataforma
 * lo vuelve a pedir con `GET /api/me` al arrancar, y guardar una copia de este
 * lado sería un segundo lugar donde el nombre o el rol pueden quedar viejos.
 * Lo único que cruza es la credencial.
 */
type RespuestaDeLogin = {
  token: string;
  /** ISO-8601. */
  expiraEn: string;
};

/**
 * El único mensaje de error del login, y es uno solo a propósito.
 *
 * **Las tres formas de fallar —mail que no existe, contraseña equivocada, cuenta
 * desactivada— devuelven lo mismo y tardan lo mismo.** El backend llega al punto
 * de comparar contra un hash señuelo cuando el mail no existe, justamente para
 * que el tiempo de respuesta no delate qué direcciones tienen cuenta. Diferenciar
 * los mensajes acá tiraría ese trabajo por la ventana desde el lado del cliente.
 */
const NO_ENTRASTE = "Revisá el mail y la contraseña.";

/**
 * Entra. Tira con un mensaje mostrable si no.
 *
 * No devuelve nada porque **el éxito es irse de esta página**: guarda la
 * credencial y navega a la plataforma.
 */
export async function iniciarSesion(email: string, password: string): Promise<void> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    // Sin respuesta: backend caído, sin red, o el proxy no está reenviando
    // `/api`. Los tres se ven igual desde el navegador, así que el mensaje no
    // inventa cuál fue — y sobre todo no dice "contraseña incorrecta", que es
    // lo que haría que alguien la cambie sin necesidad.
    throw new Error(
      "No pudimos conectarnos. Probá de nuevo en un momento, o escribinos por WhatsApp.",
    );
  }

  if (!respuesta.ok) {
    // 401 es el caso normal y va con el mensaje único. Cualquier otro estado es
    // un problema del sistema, no de quien escribe: ahí sí conviene mostrar lo
    // que dice la API (ProblemDetail, RFC 7807), porque puede ser algo
    // accionable como "tenés que cambiar la contraseña".
    if (respuesta.status === 401) throw new Error(NO_ENTRASTE);

    let detalle: string | undefined;
    try {
      detalle = ((await respuesta.json()) as { detail?: string }).detail;
    } catch {
      detalle = undefined;
    }
    throw new Error(detalle ?? NO_ENTRASTE);
  }

  const credencial = (await respuesta.json()) as RespuestaDeLogin;

  if (!credencial.token || !credencial.expiraEn) {
    // Defensivo, y no paranoia: es exactamente la forma que tomaría el
    // desacople descrito arriba si el backend cambiara la respuesta. Sin este
    // chequeo guardaríamos `{}` y la persona rebotaría al login sin motivo
    // visible; con él, al menos alguien ve un error.
    throw new Error("La respuesta del sistema no vino completa. Avisanos, por favor.");
  }

  localStorage.setItem(
    CLAVE_CREDENCIAL,
    JSON.stringify({ token: credencial.token, expiraEn: credencial.expiraEn }),
  );

  // `location.assign` y no el router de Next, y el linter se queja de esto:
  // **/app NO es una página de Next.** Es otra aplicación —la plataforma, un SPA
  // de Vite— servida en la misma URL base por el proxy. Una navegación de cliente
  // de Next buscaría una ruta que este sitio no tiene y no cargaría nada. Hace
  // falta que el navegador pida `/app` de verdad.
  //
  // O sea que la regla es correcta en general y equivocada acá, que es
  // exactamente para lo que existe el disable de una línea.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(PLATAFORMA);
}
