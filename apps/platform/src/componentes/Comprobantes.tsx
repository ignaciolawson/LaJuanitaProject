import { useRef, useState } from 'react'

import type { ComprobanteResumen } from '../api/tiposAdmin'
import { Boton } from './Boton'

/**
 * Los comprobantes de un pago: los que hay, y cuáles ya no valen.
 *
 * **Un pago puede tener varios desde `V21`**, y de eso depende que la pantalla
 * sea honesta. Antes había una sola ruta escrita a mano: el comprobante
 * equivocado se marcaba inválido y el correcto tenía que pisarlo, o sea que la
 * firma de quien rechazó el primero desaparecía al adjuntar el segundo. Acá los
 * dos se ven, y el inválido dice quién lo marcó y por qué.
 *
 * **El inválido no se esconde.** Es la misma regla que el resto del sistema
 * sostiene en cinco lugares: una fila que desaparece se lee como que el sistema
 * perdió el dato. Que esté tachado y explicado es la información — alguien miró
 * ese archivo y dijo que no servía.
 *
 * Lo dibujan tres pantallas: el listado de pagos, el estado de cuenta de
 * administración y el del alumno. Las tres muestran lo mismo; lo único que cambia
 * es **por qué puerta se baja el archivo**, y eso entra por `onVer`, porque el
 * alumno lo baja por `/api/me/**` y administración por el suyo.
 */
export function Comprobantes({
  comprobantes,
  onVer,
  onInvalidar,
}: {
  comprobantes: ComprobanteResumen[]
  onVer: (comprobante: ComprobanteResumen) => void
  /** Sin esto la lista es de solo lectura: es como la ve el alumno. */
  onInvalidar?: (comprobante: ComprobanteResumen) => void
}) {
  if (comprobantes.length === 0) {
    return <span className="text-xs text-apagado">Sin comprobante</span>
  }

  return (
    <ul className="space-y-1">
      {comprobantes.map((c) => (
        <li key={c.idComprobante} className="text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onVer(c)}
              className={`underline underline-offset-2 hover:text-acento ${
                c.invalido ? 'text-apagado line-through' : 'text-tenue'
              }`}
            >
              {c.nombreOriginal}
            </button>
            {!c.invalido && onInvalidar && (
              <Boton variante="enlace"
                type="button"
                onClick={() => onInvalidar(c)}>
                Invalidar
              </Boton>
            )}
          </div>
          {c.invalido && (
            // El motivo y el autor viajan juntos porque son el dato: un
            // comprobante marcado sin decir quién ni por qué es lo que `V7` salió
            // a arreglar del lado de la base.
            <div className="text-apagado">
              Inválido: {c.motivoInvalidacion}
              {c.invalidadoPor && ` · ${c.invalidadoPor}`}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/**
 * El botón de adjuntar: un `input file` disfrazado.
 *
 * **Sube al toque, sin un "guardar" aparte.** Adjuntar es un pedido propio —el
 * archivo no viaja adentro del JSON del pago— así que un botón de confirmación
 * extra solo agregaría un paso donde no hay nada que decidir.
 *
 * El `input` se limpia después de cada intento: sin eso, elegir el mismo archivo
 * dos veces seguidas —lo normal después de un error— no dispara el `change` y la
 * pantalla parece colgada.
 */
export function AdjuntarComprobante({
  onElegir,
  etiqueta = 'Adjuntar comprobante',
}: {
  onElegir: (archivo: File) => Promise<void>
  etiqueta?: string
}) {
  const entrada = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)

  async function elegido(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0]
    evento.target.value = ''
    if (!archivo) return

    setSubiendo(true)
    try {
      await onElegir(archivo)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <>
      <Boton variante="enlace"
        type="button"
        disabled={subiendo}
        onClick={() => entrada.current?.click()}>
        {subiendo ? 'Subiendo…' : etiqueta}
      </Boton>
      <input
        ref={entrada}
        type="file"
        // El sistema mira el CONTENIDO, no la extensión: esto es una comodidad
        // del selector de archivos, no una validación. La de verdad está en el
        // backend y contesta 400 explicando qué pasó.
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={elegido}
        className="hidden"
        aria-label={etiqueta}
      />
    </>
  )
}
