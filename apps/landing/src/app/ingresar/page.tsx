import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/forms/LoginForm";

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
 * Una pantalla de login es una tarea, no una página para explorar.
 *
 * El Navbar del layout se renderiza acá igual que en el resto del sitio (no
 * hay excepción por ruta), así que la marca ya está en pantalla: esta página
 * no lleva logo propio.
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
            {/* Sin logo propio acá: el Navbar del layout ya muestra la marca
                en esta pantalla, y repetirla dos veces en la misma columna
                queda como un error de maquetación. */}
            <h1 className="t-display-tight text-[clamp(34px,5vw,56px)] leading-[0.95]">
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
