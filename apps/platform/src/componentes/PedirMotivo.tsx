import { useState } from 'react'

import { Boton } from './Boton'
import { Campo } from './Campo'

/**
 * Pide el motivo de una baja antes de hacerla.
 *
 * **Salió de `PagosPagina` a un componente compartido el 2026-08-17**, cuando los
 * egresos y las ventas también se pudieron anular. No es solo evitar la copia: es
 * que las tres anulaciones **se expliquen igual**. La base exige las tres firmas
 * juntas —autor, fecha y motivo— y de las tres el cliente aporta una sola; el
 * autor sale del token y la fecha del reloj del servidor. Si esto se duplicara,
 * la tercera copia sería la que se olvida de decir que la baja no se deshace.
 *
 * Por eso el texto de `ayuda` lo pone cada pantalla: lo que cambia entre una y
 * otra es **qué deja de contar** cuando se confirma, y eso es justamente lo que
 * hay que leer antes de apretar.
 */
export function PedirMotivo({
  titulo,
  ayuda,
  onCerrar,
  onConfirmar,
}: {
  titulo: string
  ayuda: string
  onCerrar: () => void
  onConfirmar: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        if (!motivo.trim()) {
          setError('Escribí el motivo.')
          return
        }
        onConfirmar(motivo.trim())
      }}
      className="mb-6 rounded-lg border border-linea bg-superficie p-5"
    >
      <h3 className="t-seccion mb-1">{titulo}</h3>
      <p className="mb-4 text-sm text-tenue">{ayuda}</p>

      <Campo
        etiqueta="Motivo"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Se cargó dos veces, el monto era otro…"
        error={error ?? undefined}
      />

      <div className="mt-5 flex gap-3">
        <Boton type="submit">Confirmar</Boton>
        <Boton type="button" variante="secundario" onClick={onCerrar}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
