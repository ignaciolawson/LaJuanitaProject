/**
 * Lo único que esta landing le manda al sistema.
 *
 * ⚠️ **Es un solo endpoint y conviene que siga siéndolo.** La landing es un sitio
 * 100% estático y público; el sistema vive en otra app, con login. Lo único que
 * cruza esa frontera es *"alguien completó un formulario"* — que del otro lado es
 * una ficha en el buzón (`/admin/buzon`), no una cuenta, ni una reserva, ni un
 * pago. Esa es la propiedad que hace que un endpoint público sea aceptable: el
 * precio de que lo abusen es tabla ocupada, no estado del negocio cambiado.
 *
 * **Tres cosas que hay que saber antes de agregar otra llamada:**
 *
 * 1. **La CSP del sitio lista el origen de la API en `connect-src`**
 *    (`next.config.ts`). Sin eso el navegador bloquea el `fetch` **sin decir
 *    nada visible en la página** — se ve como un formulario que no responde.
 *    Se arma desde la misma variable de entorno que usa este archivo, para que
 *    no se puedan desincronizar.
 * 2. **El backend tiene que tener este origen en `CORS_ORIGENES`.** En
 *    desarrollo su default ya incluye `http://localhost:3000`; en el deploy es
 *    una variable más de las que `docs/operacion.md` §3 enumera.
 * 3. **Acá no se guarda ninguna credencial y no debería.** La sesión es de la
 *    plataforma; ver `AccesoAlCampus`.
 */

/**
 * De dónde cuelga la API.
 *
 * **El default es vacío, o sea el MISMO ORIGEN**, y eso es la decisión de
 * hosting tomada el 2026-08-31: landing en `/`, plataforma en `/app` y backend
 * en `/api`, todo detrás de un solo proxy. En desarrollo lo hace Next
 * (`rewrites` en `next.config.ts`); en producción, el reverse proxy del servidor.
 *
 * Lo que se gana no es prolijidad: **es lo único que permite que el login se
 * haga acá**. `localStorage` es por origen, así que la credencial que escribe
 * este sitio es la misma que lee la plataforma. Y de yapa desaparecen dos cosas
 * que eran pura superficie de falla — CORS deja de ejercerse y `connect-src`
 * queda en `'self'`.
 *
 * `NEXT_PUBLIC_` porque se resuelve en el navegador, y por lo mismo **no es un
 * secreto**. Se mantiene como escape: si algún día la API vuelve a vivir en otro
 * dominio, se define la variable y el `fetch` pasa a ser absoluto — pero
 * entonces el login de acá deja de poder entregar la sesión, y hay que volver a
 * los dos links de antes.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Qué está pidiendo la persona.
 *
 * Espeja `InteresDelSolicitante` del backend, y el valor es **lo único que la
 * ficha necesita decir** para que quien la atienda sepa a qué pantalla ir: un
 * curso termina en Inscripciones, una cabina o una grabación en el Calendario,
 * una consulta de equipos en Venta de equipos.
 *
 * Mix & Mastering no está: ese servicio llega por WhatsApp a Ghezz y se carga a
 * mano, que es la decisión vigente del sistema y no un olvido de esta lista.
 */
export type Interes =
  | "CURSO"
  | "ALQUILER_CABINA"
  | "GRABACION_SET"
  | "EQUIPOS"
  | "OTRO";

/**
 * Lo que viaja. Espeja `AltaSolicitanteRequest`.
 *
 * **`nombre` y `apellido` son dos campos**, no uno partido después. El sistema
 * los tiene separados desde su cuarta migración, que existió justamente para
 * partir una columna que los guardaba juntos — y ahí hubo que adivinar dónde
 * terminaba el nombre. Se piden separados desde el formulario para no volver a
 * pagar eso.
 *
 * **`telefono` es obligatorio.** No hay infraestructura de correo ni la va a
 * haber: cuando administración le crea la cuenta a esta persona, la contraseña
 * temporal se la pasa por WhatsApp. Una ficha sin teléfono no se puede convertir,
 * y enterarse de eso al querer atenderla es tarde.
 *
 * **`detalle` lo arma cada formulario**, en texto legible: *"Programa DJ ·
 * presencial · sin experiencia previa"*. Del otro lado nadie lo procesa — es para
 * que quien llame sepa de qué le van a hablar.
 */
export type Solicitud = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  interes: Interes;
  detalle?: string;
  mensaje?: string;
};

/**
 * Manda la ficha. Tira si no llegó.
 *
 * **Que tire importa más que lo que devuelve**: hasta hoy estos formularios
 * contestaban *"listo, lo recibimos"* sin mandar nada, y por eso este sitio no se
 * podía publicar. Un error silencioso acá sería exactamente el mismo agujero con
 * más código.
 */
export async function mandarSolicitud(datos: Solicitud): Promise<void> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${API_URL}/api/solicitantes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
  } catch {
    // Se cae acá cuando no hubo respuesta: el backend está abajo, no hay red, o
    // el origen no está en la CSP / en CORS. Los cuatro se ven igual desde el
    // navegador, así que el mensaje no inventa cuál fue.
    throw new Error(
      "No pudimos conectarnos. Probá de nuevo en un momento, o escribinos por WhatsApp.",
    );
  }

  if (respuesta.ok) return;

  // La API contesta ProblemDetail (RFC 7807) en todos sus errores, así que el
  // mensaje para la persona está siempre en el mismo lugar. Si el cuerpo no se
  // puede leer, queda el genérico: nunca se muestra un código de estado pelado.
  let detalle: string | undefined;
  try {
    detalle = ((await respuesta.json()) as { detail?: string }).detail;
  } catch {
    detalle = undefined;
  }

  throw new Error(
    detalle ?? "No pudimos enviar tu solicitud. Probá de nuevo en un momento.",
  );
}
