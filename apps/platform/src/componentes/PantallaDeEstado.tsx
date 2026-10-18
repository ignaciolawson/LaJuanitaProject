import type { ReactNode } from 'react'

import { Abanico } from './Abanico'

/**
 * Las pantallas de "acá no hay nada para vos": el display de un CDJ que se
 * quedó sin pista. La usan el 404, el 403 y las dos pantallas rotas de
 * `LimiteDeError`.
 *
 * El código va gigante, como el número de pista en el display, con la tira mono
 * de abajo (CUE · pista · BPM · tiempo) en el estado de "no hay nada cargado".
 * El abanico de la marca aparece con varillas caídas: roto lo justo para que se
 * lea como error y no como decoración. Es el mismo gesto que el 404 de la
 * landing (`apps/landing/src/components/brand/PantallaDeError.tsx`), cada uno
 * con las piezas de su sistema de diseño.
 *
 * ⚠️ **El chiste va en el titular; la explicación de verdad, en `children`, y
 * nunca se reemplaza por el chiste.** Quien llega acá tiene que saber qué pasó y
 * qué hacer aunque no le haga gracia — y en una pantalla rota, además, copiar el
 * detalle para avisar.
 */
export function PantallaDeEstado({
  codigo,
  pista,
  titular,
  remate,
  children,
  acciones,
  role,
}: {
  /** "404", "403", "ERR". Va en el display y en la tira. */
  codigo: string
  /** Lo que dice la tira del display en lugar del nombre del tema. */
  pista: string
  titular: string
  remate: string
  /** La explicación de verdad (y, si hace falta, el detalle para copiar). */
  children: ReactNode
  acciones: ReactNode
  role?: 'alert'
}) {
  return (
    <section role={role} className="relative overflow-hidden py-8 lg:py-14">
      <Abanico
        rotas={[2, 7, 10]}
        className="pointer-events-none absolute -bottom-12 -right-24 w-[min(80vw,620px)] text-linea"
      />

      <div className="relative max-w-2xl">
        <p
          aria-hidden
          className="t-titulo select-none text-[clamp(88px,17vw,200px)] leading-[0.8] text-texto"
        >
          {codigo}
        </p>

        {/* El display del CDJ, sin pista cargada. */}
        <div
          aria-hidden
          className="t-mono mt-5 flex flex-wrap gap-x-5 gap-y-1 border-y border-linea py-2 text-tenue"
        >
          <span className="text-acento">● CUE {codigo}</span>
          <span>{pista}</span>
          <span>BPM —.—</span>
          <span>−00:00</span>
        </div>

        <h1 className="t-titulo mt-8 text-[clamp(1.6rem,3.4vw,2.4rem)]">{titular}</h1>
        <p className="t-serif mt-2 text-xl text-tenue">{remate}</p>

        <div className="mt-6 max-w-prose text-sm leading-relaxed text-tenue">{children}</div>

        <div className="mt-8 flex flex-wrap gap-3">{acciones}</div>
      </div>
    </section>
  )
}
