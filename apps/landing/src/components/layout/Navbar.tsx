"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { gsap, useGSAP, ScrollTrigger, ScrollSmoother, prefersReduced } from "@/lib/gsap";
import { Fan } from "@/components/brand/Fan";
import { CONTACT } from "@/data/contact";

const NAV = [
  { href: "/programas", label: "Programas", index: "01" },
  { href: "/servicios", label: "Servicios", index: "02" },
  { href: "/equipos", label: "Equipos", index: "03" },
  { href: "/sello", label: "Sello", index: "04" },
  { href: "/blog", label: "Blog", index: "05" },
  { href: "/profesores", label: "Profesores", index: "06" },
  { href: "/nosotros", label: "Nosotros", index: "07" },
  { href: "/faq", label: "FAQ", index: "08" },
  { href: "/contacto", label: "Contacto", index: "09" },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra superior.
 *
 * Tres decisiones que la sacan del molde:
 *  - Hereda `--page-fg`, así se invierte sola cuando el fondo del sitio pasa
 *    de tinta a papel. Sin esto quedaría texto claro sobre papel claro.
 *  - Se esconde al bajar y vuelve al subir, con un fondo que sólo aparece
 *    cuando ya te fuiste del hero (arriba de todo flota, sin caja).
 *  - El menú móvil es una cortina a pantalla completa con los ítems
 *    numerados entrando en cascada — no un panel deslizante con lista.
 */
export function Navbar() {
  const root = useRef<HTMLElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReduced()) return;

      const bar = el.querySelector("[data-nav-bar]");
      // El fondo es una capa aparte cuya opacidad se anima. GSAP no puede
      // interpolar ni `color-mix(...)` ni `backdrop-filter: blur()` — los
      // trata como strings opacos y te hace un salto seco. Animar la
      // opacidad de un div que ya tiene el blur aplicado sí interpola.
      const barBg = el.querySelector("[data-nav-bg]");

      // Fondo + compactado, sólo después del primer viewport.
      const bgTrigger = ScrollTrigger.create({
        start: "top -80",
        end: 99999,
        onToggle: (self) => {
          gsap.to(barBg, {
            opacity: self.isActive ? 1 : 0,
            duration: 0.45,
            ease: "power2.out",
          });
          gsap.to(bar, {
            paddingTop: self.isActive ? 12 : 22,
            paddingBottom: self.isActive ? 12 : 22,
            duration: 0.45,
            ease: "power2.out",
          });
        },
      });

      // Ocultar al bajar / mostrar al subir.
      const dirTrigger = ScrollTrigger.create({
        start: "top -300",
        end: 99999,
        onUpdate: (self) => {
          if (menu.current?.dataset.open === "true") return;
          gsap.to(el, {
            yPercent: self.direction === 1 ? -100 : 0,
            duration: 0.5,
            ease: "power3.out",
            overwrite: true,
          });
        },
      });

      return () => {
        bgTrigger.kill();
        dirTrigger.kill();
      };
    },
    { scope: root },
  );

  // Cortina del menú móvil.
  useGSAP(
    () => {
      const el = menu.current;
      if (!el) return;
      el.dataset.open = String(open);

      const items = el.querySelectorAll("[data-menu-item]");

      // Ojo: con ScrollSmoother el scroll no lo maneja el body, así que
      // `body.style.overflow = "hidden"` no bloquea nada. Hay que pausar el
      // smoother; el overflow queda como fallback para cuando no existe
      // (reduced-motion).
      const smoother = ScrollSmoother.get();

      if (open) {
        smoother?.paused(true);
        document.body.style.overflow = "hidden";
        gsap
          .timeline()
          .set(el, { pointerEvents: "auto" })
          .to(el, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "swipe" })
          .fromTo(
            items,
            { yPercent: 115, opacity: 0 },
            { yPercent: 0, opacity: 1, duration: 0.7, stagger: 0.055, ease: "juanita" },
            "-=0.42",
          );
      } else {
        smoother?.paused(false);
        document.body.style.overflow = "";
        gsap.to(el, {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 0.55,
          ease: "swipe",
          onComplete: () => gsap.set(el, { pointerEvents: "none" }),
        });
      }
    },
    { dependencies: [open], scope: menu },
  );

  return (
    <>
      <header
        ref={root}
        className="fixed inset-x-0 top-0 z-[80] text-[color:var(--page-fg)]"
      >
        <div
          data-nav-bar
          className="relative flex items-center justify-between px-[var(--pad)] py-[22px]"
        >
          <div
            data-nav-bg
            aria-hidden
            className="absolute inset-0 -z-10 border-b border-[color:var(--page-line)] bg-[color:var(--page-bg)]/85 opacity-0 backdrop-blur-xl"
          />
          <Link
            href="/"
            aria-label="La Juanita Studio — inicio"
            className="group flex items-center gap-3"
            data-cursor="INICIO"
          >
            <Fan
              ribs={9}
              spread={140}
              arc={false}
              className="h-7 w-11 transition-transform duration-500 group-hover:rotate-[8deg]"
            />
            {/* Wordmark en texto y no el PNG: el logo original es un banner
                blanco con letras caladas, que desaparece cuando el fondo del
                sitio pasa a papel. En tipografía hereda --page-fg y siempre
                se lee (y además queda nítido a 12px). */}
            <span className="t-display-tight hidden text-[15px] leading-none tracking-[0.02em] sm:block">
              La Juanita
              <span className="t-mono ml-2 align-middle text-[9px] text-red">Studio</span>
            </span>
            <span className="sr-only">La Juanita Studio</span>
          </Link>

          <nav className="hidden items-center gap-5 xl:flex 2xl:gap-7">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "t-mono link-u transition-opacity",
                  // `startsWith` y no igualdad estricta: las secciones con
                  // páginas de detalle (/blog/[slug], /programas/[slug])
                  // dejaban de marcar su ítem apenas entrabas a una nota o a
                  // un programa.
                  isActive(pathname, item.href)
                    ? "text-red"
                    : "opacity-70 hover:opacity-100",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <Link
              href="/ingresar"
              data-cursor="ENTRAR"
              className="btn hidden text-[color:var(--page-fg)] sm:inline-flex"
            >
              Iniciar sesión
            </Link>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
              className="relative z-[86] flex h-9 w-9 flex-col items-center justify-center gap-[7px] xl:hidden"
            >
              <span
                className={clsx(
                  "block h-px w-6 bg-current transition-transform duration-500",
                  open && "translate-y-[4px] rotate-45",
                )}
              />
              <span
                className={clsx(
                  "block h-px w-6 bg-current transition-transform duration-500",
                  open && "-translate-y-[4px] -rotate-45",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Cortina a pantalla completa */}
      {/* El centrado va con `m-auto` en el contenido y NO con `justify-center`
          en el contenedor. Con nueve ítems el menú ya mide más que la pantalla
          en un teléfono, y en un contenedor de scroll `justify-content: center`
          desborda para los dos lados: la mitad de arriba queda fuera de la
          caja y no hay forma de scrollear hasta ella. Con `m-auto` el margen
          se colapsa cuando no sobra espacio y el contenido arranca arriba. */}
      <div
        ref={menu}
        className="pointer-events-none fixed inset-0 z-[82] flex flex-col overflow-y-auto bg-ink px-[var(--pad)] py-24 text-bone xl:hidden"
        style={{ clipPath: "inset(0% 0% 100% 0%)" }}
      >
        <div className="m-auto w-full">
          <nav className="flex flex-col">
            {NAV.map((item) => (
              <div key={item.href} className="overflow-hidden">
                <Link
                  data-menu-item
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline gap-4 border-b border-bone/12 py-2.5"
                >
                  <span className="t-mono text-red">{item.index}</span>
                  <span className="t-display-tight text-[9.5vw] leading-none transition-transform duration-500 group-hover:translate-x-2 sm:text-5xl">
                    {item.label}
                  </span>
                </Link>
              </div>
            ))}
          </nav>

          <div data-menu-item className="mt-10">
            <Link
              href="/ingresar"
              onClick={() => setOpen(false)}
              className="btn btn--solid"
            >
              Iniciar sesión
              <span aria-hidden className="text-[1.25em] leading-none">
                ↗
              </span>
            </Link>
          </div>

          {/* Los datos salen de `data/contact.ts`, no escritos a mano: acá
              había un email hardcodeado que sobrevivió a que la constante
              pasara a `null`, y se seguía dibujando en las catorce páginas. */}
          <div data-menu-item className="t-mono mt-8 flex flex-wrap gap-x-6 gap-y-2 text-bone/45">
            <span>{CONTACT.addressShort}</span>
            <span>{CONTACT.whatsappDisplay}</span>
          </div>
        </div>
      </div>
    </>
  );
}
