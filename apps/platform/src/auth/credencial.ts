/**
 * Guarda y recupera la credencial firmada.
 *
 * Viaja en el header `Authorization` y vive en uno de dos lugares según el
 * "Recordarme" del login: tildado, en `localStorage` (sobrevive a cerrar el
 * navegador, y el backend la firma por 30 días); sin tildar, en `sessionStorage`
 * (muere con el navegador, 8 horas). Se lee de los dos: quien entra no dice cuál
 * eligió la última vez.
 *
 * La contracara conocida: si algún día hay un XSS en esta app, el token es
 * legible desde JavaScript. Lo acota que cambiar la contraseña cierra todas las
 * sesiones de la cuenta (`V38`). Si eso deja de alcanzar, la alternativa es una
 * cookie `httpOnly`, y el cambio es de este archivo y del CORS del backend.
 */

/**
 * ⚠️ **ESTA CLAVE Y ESTE FORMATO LOS ESCRIBE TAMBIÉN LA LANDING.**
 *
 * Desde el 2026-08-31 el login se hace en la landing (`apps/landing/src/lib/
 * sesion.ts`) y le entrega la sesión a esta app. Puede hacerlo porque comparten
 * origen —landing en `/`, esta app en `/app`, detrás de un proxy— y
 * `localStorage` es por origen, no por path.
 *
 * Son dos builds separados: **no hay compilador, ni test, ni tipo compartido que
 * los mantenga sincronizados.** Si cambiás la clave o la forma de `Credencial`,
 * el login de la landing sigue devolviendo 200, sigue guardando algo, sigue
 * redirigiendo — y la persona aterriza en `/app/login` **sin un solo error en
 * ningún lado**, con un síntoma idéntico a "puse mal la contraseña".
 *
 * Si tocás esto, tocá el otro archivo. La advertencia gemela está allá. Y lo
 * mismo vale para el storage: la landing escribe en `localStorage` o en
 * `sessionStorage` con el mismo criterio que {@link guardarCredencial}.
 */
const CLAVE = 'lajuanita.credencial'

export type Credencial = {
  token: string
  /** ISO-8601, tal cual lo mandó el backend. */
  expiraEn: string
}

/**
 * Devuelve la credencial guardada, o `null` si no hay o si ya venció.
 *
 * Chequear el vencimiento acá evita el caso feo de arrancar la app, mandar un
 * pedido con un token muerto y recién ahí enterarse: si venció, arrancamos
 * directamente en la pantalla de login.
 */
export function leerCredencial(): Credencial | null {
  const guardado = localStorage.getItem(CLAVE) ?? sessionStorage.getItem(CLAVE)
  if (!guardado) return null

  try {
    const credencial = JSON.parse(guardado) as Credencial
    if (!credencial.token || !credencial.expiraEn) return null

    // `Date.parse` de algo que no es una fecha devuelve NaN, y toda comparación
    // con NaN es false: sin el `isNaN`, un `expiraEn` ilegible pasaba el
    // chequeo y la credencial corrupta se daba por vigente para siempre.
    const vence = Date.parse(credencial.expiraEn)
    if (Number.isNaN(vence) || vence <= Date.now()) {
      borrarCredencial()
      return null
    }

    return credencial
  } catch {
    // Basura en localStorage (una versión vieja del formato, una edición a
    // mano). Se descarta en silencio y se pide login de nuevo.
    borrarCredencial()
    return null
  }
}

/**
 * `recordar` elige el storage, y borra el otro: sin eso, entrar sin tildar en
 * una compu donde alguien había tildado dejaría la sesión vieja viva debajo.
 */
export function guardarCredencial(credencial: Credencial, recordar = true): void {
  borrarCredencial()
  ;(recordar ? localStorage : sessionStorage).setItem(CLAVE, JSON.stringify(credencial))
}

/**
 * La reemplaza donde ya estaba. La usa el cambio de contraseña, que cierra las
 * sesiones abiertas y devuelve una credencial nueva que dura lo mismo.
 */
export function reemplazarCredencial(credencial: Credencial): void {
  guardarCredencial(credencial, localStorage.getItem(CLAVE) !== null)
}

export function borrarCredencial(): void {
  localStorage.removeItem(CLAVE)
  sessionStorage.removeItem(CLAVE)
}
