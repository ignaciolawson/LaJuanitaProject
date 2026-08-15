/**
 * Guarda y recupera la credencial firmada.
 *
 * Vive en `localStorage` y viaja en el header `Authorization`. La contracara
 * conocida de esa decisión: si algún día hay un XSS en esta app, el token es
 * legible desde JavaScript. Se mitiga con el vencimiento corto que pone el
 * backend (8 horas). Si eso deja de alcanzar, la alternativa es una cookie
 * `httpOnly`, y el cambio es de este archivo y del CORS del backend.
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
  const guardado = localStorage.getItem(CLAVE)
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

export function guardarCredencial(credencial: Credencial): void {
  localStorage.setItem(CLAVE, JSON.stringify(credencial))
}

export function borrarCredencial(): void {
  localStorage.removeItem(CLAVE)
}
