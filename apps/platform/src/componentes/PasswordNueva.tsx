import { Bloque, Hueco } from './Bloque'
import { Boton } from './Boton'
import { EnlaceDeWhatsapp } from './EnlaceDeWhatsapp'
import {
  linkDeWhatsapp,
  mensajeConLaClave,
  mensajeConLaClaveDeProfesor,
  mensajeDeClaveReseteada,
} from './whatsapp'

/**
 * Por qué existe esta contraseña, que es lo que decide el mensaje de WhatsApp:
 * una cuenta recién creada dice *te creamos tu cuenta* y qué se puede hacer
 * desde ahí; una reseteada dice *te generamos una nueva* y **que vence a los 7
 * días**, que es lo que Ignacio pidió que el mensaje diga (2026-09-12).
 */
export type MotivoDeLaClave = 'cuenta-nueva' | 'profesor-nuevo' | 'reseteo'

const MENSAJE: Record<MotivoDeLaClave, (n: string, e: string, p: string) => string> = {
  'cuenta-nueva': mensajeConLaClave,
  'profesor-nuevo': mensajeConLaClaveDeProfesor,
  reseteo: mensajeDeClaveReseteada,
}

/**
 * La contraseña temporal, mostrada una sola vez, con el botón para mandarla.
 *
 * Sirve para el alta y para el reseteo: es el mismo hecho —el sistema generó una
 * credencial que hay que pasar por WhatsApp— y no se puede volver a consultar.
 * Vivía adentro de `UsuariosPagina` sin el botón; el botón ya existía en el
 * buzón (`CuentaLista`), y lo que se hizo el 2026-09-12 fue que las tres
 * pantallas que muestran una clave la muestren igual y la manden igual.
 *
 * ⚠️ **El botón es lo que hace que "no se puede volver a ver" deje de importar
 * tanto**: un dígito mal copiado es alguien que no entra y vuelve a escribir.
 * Escrito por el sistema, ese error no existe. Y sin número legible no se
 * ofrece: un `wa.me` roto es peor que ninguno (ver `whatsapp.ts`), así que la
 * pantalla lo dice y deja la clave grande para copiar.
 */
export function PasswordNueva({
  de,
  valor,
  motivo,
  aclaracion,
  onCerrar,
}: {
  de: { nombre: string; apellido: string; email: string; telefono: string | null }
  valor: string
  motivo: MotivoDeLaClave
  /** Qué más decir debajo de la advertencia, si la pantalla tiene algo propio. */
  aclaracion?: React.ReactNode
  onCerrar: () => void
}) {
  const link = linkDeWhatsapp(de.telefono, MENSAJE[motivo](de.nombre, de.email, valor))
  const titulo =
    motivo === 'reseteo'
      ? `Contraseña nueva de ${de.nombre} ${de.apellido}`
      : motivo === 'profesor-nuevo'
        ? 'Profesor creado'
        : `Contraseña de ${de.nombre} ${de.apellido}`

  return (
    <Bloque titulo={titulo} className="mb-6">
      <p className="mt-2 text-sm leading-relaxed text-tenue">
        Pasásela por WhatsApp. El sistema le va a pedir que la cambie cuando entre, y{' '}
        <strong className="text-texto">vence a los 7 días</strong> si no la usa.{' '}
        <strong className="text-texto">No se puede volver a ver:</strong> si se pierde, hay que
        generar otra.
        {aclaracion && <> {aclaracion}</>}
      </p>
      <Hueco className="mt-3 font-mono text-lg tracking-wider">{valor}</Hueco>

      {link ? (
        <div className="mt-3">
          <EnlaceDeWhatsapp href={link}>Mandarle la clave por WhatsApp</EnlaceDeWhatsapp>
        </div>
      ) : (
        <p className="mt-3 text-xs text-apagado">
          {de.telefono
            ? `El teléfono (${de.telefono}) no se puede abrir en WhatsApp: copiá la clave y buscá el número a mano.`
            : 'No tiene teléfono cargado: copiá la clave y mandásela a mano.'}
        </p>
      )}

      <Boton className="mt-4" onClick={onCerrar}>
        Listo
      </Boton>
    </Bloque>
  )
}
