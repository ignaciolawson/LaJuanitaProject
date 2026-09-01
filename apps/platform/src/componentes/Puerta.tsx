import type { ReactNode } from 'react'

import cabina from '../assets/cabina.jpg'
import wordmark from '../assets/wordmark.png'
import { Abanico } from './Abanico'

/**
 * El armazón de las tres puertas: login, registro y cambio obligatorio de
 * contraseña.
 *
 * **Existe porque las puertas eran la peor pantalla del sistema y por la peor
 * razón**: se salteaban el diseño entero. Un `<form>` centrado sobre blanco,
 * sin marca, con "La Juanita" escrito en once píxeles. Es lo primero que ve
 * todo el mundo —alumno, profesor, Micaela— y decía que esto es un formulario
 * interno de algo.
 *
 * La forma es partida en dos y cada mitad hace un trabajo distinto:
 *
 * - **La tinta dice de quién es esto.** Foto de la cabina, el abanico, el
 *   wordmark arqueado y una línea en serif. Es el único lugar de la
 *   plataforma donde la marca ocupa media pantalla, y se lo puede permitir
 *   porque acá nadie está trabajando todavía.
 * - **El papel es donde se escribe**, y no cambia: los mismos campos de línea
 *   del resto del sistema. Que la puerta sea vistosa no la vuelve un lugar
 *   distinto para tipear.
 *
 * ⚠️ **La mitad de tinta NO sigue al tema.** Es marca, no superficie de
 * trabajo: el sidebar tampoco lo sigue, por la misma razón. Lo que cambia con
 * el tema es la mitad donde se escribe.
 *
 * ⚠️ **Abajo de `lg` la foto no se muestra**, y no es que "se acomoda": se
 * saca. En un teléfono apoyada arriba del formulario empuja los campos abajo
 * del pliegue, y una puerta donde no se ve dónde escribir es peor puerta que
 * una sin foto. La marca sigue estando, en la cabecera compacta.
 */
export function Puerta({
  titulo,
  bajada,
  children,
  pie,
}: {
  titulo: string
  /** Una línea que dice qué se hace acá. Va en serif: es la voz, no un dato. */
  bajada: string
  children: ReactNode
  /** Links de abajo del formulario: crear cuenta, volver, la aclaración. */
  pie?: ReactNode
}) {
  return (
    <main className="flex min-h-full">
      {/* ── La mitad de marca ── */}
      <aside className="relative hidden w-[42%] max-w-2xl shrink-0 overflow-hidden bg-ink lg:block">
        <img
          src={cabina}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />

        {/* El velo. La foto es contraste puro —manos iluminadas sobre un
            controlador negro— y encima va texto: sin esto el wordmark cae
            justo sobre el brillo del jog y desaparece. El degradado carga
            hacia abajo, que es donde está el texto, y deja respirar la parte
            de arriba, que es donde está la foto. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/25"
        />
        <div aria-hidden className="grano-shell absolute inset-0" />

        <div className="relative flex h-full flex-col justify-between p-10">
          <Abanico className="h-12 w-auto text-red" />

          <div>
            <img
              src={wordmark}
              alt="La Juanita"
              className="mb-7 w-56 max-w-full"
            />
            <p className="t-serif max-w-sm text-2xl leading-snug text-bone">
              {bajada}
            </p>
            <p className="t-mono mt-8 text-bone/56">
              Pilar · Academia, estudio y sello
            </p>
          </div>
        </div>
      </aside>

      {/* ── La mitad donde se escribe ── */}
      <div className="flex min-w-0 flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* La marca compacta, sólo cuando la foto no está. Sin esto, en un
              teléfono la puerta vuelve a ser un formulario sin dueño. */}
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <Abanico className="h-9 w-auto shrink-0 text-red" />
            <div>
              <p className="t-mono">La Juanita</p>
              <p className="t-mono text-tenue">Gestión</p>
            </div>
          </div>

          <header className="mb-9">
            <h1 className="t-titulo">{titulo}</h1>
            <p className="t-serif mt-2 text-lg text-tenue lg:hidden">{bajada}</p>
          </header>

          {children}

          {pie && <div className="mt-8">{pie}</div>}
        </div>
      </div>
    </main>
  )
}
