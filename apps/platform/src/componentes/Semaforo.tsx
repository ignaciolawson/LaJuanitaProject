import { NOMBRE_DE_SEGUIMIENTO, type EstadoSeguimiento } from '../api/tiposDocencia'

/**
 * El semáforo de seguimiento de un alumno, tal como se lee.
 *
 * Vive acá y no en una de las dos pantallas porque lo dibujan las dos —el
 * listado de Mis alumnos y la ficha— y es exactamente el caso de
 * `presentacion.ts`: copiado, la segunda copia iba a pintar el `null` de otro
 * color.
 *
 * ⚠️ **`null` es "todavía no lo marqué", y NO es `VA_BIEN`.** Es la distinción
 * que sostiene toda la pantalla: un semáforo en verde que nadie puso miente
 * sobre un alumno que nadie miró, y el listado existe justamente para encontrar
 * a los que nadie miró. Por eso el sin marcar se dibuja hueco y apagado, nunca
 * con el punto lleno de un estado.
 */
export function Semaforo({ estado }: { estado: EstadoSeguimiento | null }) {
  if (estado === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-apagado">
        <span aria-hidden className="h-2 w-2 rounded-full border border-linea" />
        Sin marcar
      </span>
    )
  }

  const punto =
    estado === 'REQUIERE_ATENCION'
      ? 'bg-red'
      : estado === 'EN_PAUSA'
        ? 'bg-apagado'
        : 'bg-ink'

  const texto = estado === 'REQUIERE_ATENCION' ? 'text-acento' : 'text-tenue'

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${texto}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${punto}`} />
      {NOMBRE_DE_SEGUIMIENTO[estado]}
    </span>
  )
}
