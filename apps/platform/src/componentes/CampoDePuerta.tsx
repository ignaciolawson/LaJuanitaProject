import { useId, useState, type InputHTMLAttributes } from 'react'

/**
 * El campo de las puertas: una caja con aire, no la línea de las pantallas de
 * carga. Adentro del sistema la línea es lo correcto —veinte cajas compiten con
 * los datos—; en el login hay dos campos y nada más que mirar, y la línea dejaba
 * el texto pegado al borde (sobre todo cuando el navegador autocompleta y pinta
 * su propio fondo).
 *
 * Con `type="password"` suma el ojo para mostrar lo que se escribió.
 *
 * La etiqueta va con `htmlFor` y no envolviendo al input a propósito: el botón
 * del ojo vive adentro de la caja, y dentro de un `<label>` su nombre se sumaría
 * al del campo ("ContraseñaMostrar contraseña").
 */
export function CampoDePuerta({
  etiqueta,
  type = 'text',
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string }) {
  const id = useId()
  const esPassword = type === 'password'
  const [visible, setVisible] = useState(false)

  return (
    <div className={className}>
      <label htmlFor={id} className="t-mono text-tenue">
        {etiqueta}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          type={esPassword && visible ? 'text' : type}
          className={`campo-puerta block w-full rounded-lg border border-linea-control/50 bg-superficie px-4 py-3 text-sm transition-[border-color,box-shadow] hover:border-linea-control focus:border-red ${esPassword ? 'pr-13' : ''}`}
          {...input}
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            title={visible ? 'Ocultar' : 'Mostrar'}
            className="ojo absolute top-1/2 right-1.5 grid size-10 -translate-y-1/2 place-items-center rounded-md text-tenue transition-colors hover:bg-superficie-2 hover:text-texto"
            data-visible={visible}
          >
            <Ojo />
          </button>
        )}
      </div>
    </div>
  )
}

/** El ojo: con la contraseña a la vista se tacha y la pupila se achica (`index.css`). */
function Ojo() {
  return (
    <span aria-hidden>
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
        <circle className="ojo-pupila" cx="12" cy="12" r="3" />
        <path className="ojo-tachado" d="M4 4l16 16" pathLength={1} />
      </svg>
    </span>
  )
}
