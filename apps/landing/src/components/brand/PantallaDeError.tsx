import type { ReactNode } from "react";

import { Fan } from "@/components/brand/Fan";
import { Container } from "@/components/ui/Container";

/**
 * Las pantallas de error de la landing: el display de un CDJ que se quedó sin
 * pista.
 *
 * El código va gigante, como el número de pista en el display, con la tira mono
 * de abajo (CUE · pista · BPM · tiempo) en el estado de "no hay nada cargado".
 * El abanico de la marca aparece con varillas caídas: es el único dibujo que la
 * persona reconoce como La Juanita, roto lo justo para que se lea como error y
 * no como decoración.
 *
 * El chiste va en el titular y el remate en serif; la explicación de verdad va
 * debajo, en el cuerpo, y nunca se reemplaza por el chiste — quien llega acá
 * tiene que saber qué pasó y qué hacer, aunque no le haga gracia.
 *
 * Sin `"use client"`: no anima nada, así que sirve igual desde `not-found`
 * (server) y desde `error` (cliente). Lleva `data-theme="ink"` porque toda
 * página nueva necesita uno, o el tema queda colgado del de la anterior.
 */
export function PantallaDeError({
  codigo,
  pista,
  titular,
  remate,
  children,
  acciones,
}: {
  /** "404", "500". Va en el display y en la tira. */
  codigo: string;
  /** Lo que dice la tira del display en lugar del nombre del tema. */
  pista: string;
  titular: string;
  remate: string;
  /** La explicación de verdad. */
  children: ReactNode;
  acciones: ReactNode;
}) {
  return (
    <section
      data-theme="ink"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-fg)]"
    >
      <Fan
        broken={[2, 7, 10]}
        className="pointer-events-none absolute -bottom-[6vw] -right-[12vw] w-[78vw] max-w-[980px] text-[color:var(--page-line)]"
      />

      <Container className="relative pb-16 pt-28 lg:pb-20 lg:pt-28">
        <p
          aria-hidden
          className="t-display select-none text-[clamp(112px,21vw,280px)] leading-[0.8] text-[color:var(--page-fg)]"
        >
          {codigo}
        </p>

        {/* El display del CDJ, sin pista cargada. */}
        <div
          aria-hidden
          className="t-mono mt-6 flex max-w-full flex-wrap gap-x-5 gap-y-1 border-y border-[color:var(--page-line)] py-2.5 text-[color:var(--page-faint)]"
        >
          <span className="text-accent">● CUE {codigo}</span>
          <span>{pista}</span>
          <span>BPM —.—</span>
          <span>−00:00</span>
        </div>

        <h1 className="t-display-tight mt-8 max-w-[20ch] text-[clamp(34px,5vw,64px)] leading-[0.95]">
          {titular}
        </h1>
        <p className="t-serif mt-3 text-[clamp(20px,2.4vw,30px)] text-[color:var(--page-muted)]">
          {remate}
        </p>

        <div className="t-body mt-8 max-w-[52ch] text-[color:var(--page-muted)]">{children}</div>

        <div className="mt-10 flex flex-wrap items-center gap-4">{acciones}</div>
      </Container>
    </section>
  );
}
