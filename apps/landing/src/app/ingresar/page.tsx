import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/forms/LoginForm";
import { Fan } from "@/components/brand/Fan";

export const metadata: Metadata = {
  title: "Iniciar sesión",
  description: "Accedé al campus de La Juanita Studio.",
  robots: { index: false },
};

/**
 * Pantalla de ingreso al campus.
 *
 * ⚠️ Sólo visual: no hay autenticación, no hay sesión, no hay usuarios. El
 * formulario no valida contra nada — cuando exista el backend, se conecta
 * en `LoginForm`.
 *
 * Layout partido: formulario a la izquierda, foto del espacio a la derecha.
 * Sin navbar flotando encima ni footer largo debajo — una pantalla de login
 * es una tarea, no una página para explorar.
 */
export default function IngresarPage() {
  return (
    <section
      data-theme="ink"
      className="relative min-h-[100svh] bg-[color:var(--page-bg)] text-[color:var(--page-fg)]"
    >
      <div className="grid min-h-[100svh] lg:grid-cols-2">
        {/* Formulario */}
        <div className="flex items-center py-32 lg:py-24">
          <Container className="w-full max-w-[560px]">
            <Link href="/" className="inline-flex items-center gap-3" data-cursor="VOLVER">
              <Fan ribs={9} spread={140} arc={false} className="h-7 w-11" />
              <span className="t-display-tight text-[15px] leading-none">
                La Juanita
                <span className="t-mono ml-2 align-middle text-[9px] text-red">Studio</span>
              </span>
            </Link>

            <h1 className="t-display-tight mt-14 text-[clamp(34px,5vw,56px)] leading-[0.95]">
              Entrá al campus
            </h1>
            <p className="t-body mt-4 max-w-[40ch] text-[color:var(--page-muted)]">
              Material de las clases, grabaciones de tus sets y reservas de
              cabina, todo en un solo lugar.
            </p>

            <div className="mt-12">
              <LoginForm />
            </div>

            <p className="t-mono mt-10 border-t border-[color:var(--page-line)] pt-6 text-[color:var(--page-faint)]">
              ¿Todavía no estudiás acá?{" "}
              <Link href="/programas" className="link-u text-red">
                Mirá los programas
              </Link>
            </p>
          </Container>
        </div>

        {/* Foto */}
        <div className="relative hidden lg:block">
          <Image
            src="/images/espacio/lounge.jpg"
            alt=""
            fill
            sizes="50vw"
            className="object-cover opacity-70 grayscale"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/30 to-transparent" />
          <div className="absolute bottom-10 right-10 max-w-[26ch] text-right">
            <p className="t-serif text-2xl text-bone/80">
              &ldquo;Lo que aprendés acá se practica acá.&rdquo;
            </p>
            <p className="t-mono mt-3 text-bone/45">Pilar · Buenos Aires</p>
          </div>
        </div>
      </div>
    </section>
  );
}
