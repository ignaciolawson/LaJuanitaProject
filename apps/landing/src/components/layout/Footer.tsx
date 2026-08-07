"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";
import { CONTACT } from "@/data/contact";

const COLUMNS = [
  {
    title: "Academia",
    links: [
      { href: "/programas", label: "Programas" },
      { href: "/profesores", label: "Profesores" },
      { href: "/faq", label: "Preguntas frecuentes" },
    ],
  },
  {
    title: "Estudio",
    links: [
      { href: "/sello", label: "La Juanita Records" },
      { href: "/nosotros", label: "Nosotros" },
      { href: "/contacto", label: "Contacto" },
    ],
  },
];

/**
 * Pie.
 *
 * El nombre gigante en contorno se rellena de rojo a medida que llegás al
 * final: es el único lugar de la página donde el rojo ocupa superficie
 * grande, y funciona justamente porque en todo el resto se usó con
 * cuentagotas.
 */
export function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      gsap.fromTo(
        "[data-footer-fill]",
        { clipPath: "inset(100% 0% 0% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          ease: "none",
          scrollTrigger: {
            trigger: "[data-footer-word]",
            start: "top 92%",
            end: "bottom bottom",
            scrub: 0.7,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <footer
      ref={root}
      data-theme="ink"
      className="relative overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-fg)]"
    >
      <VelocityMarquee
        className="t-display-tight border-y border-[color:var(--page-line)] text-[clamp(28px,4vw,64px)]"
        speed={30}
        items={[
          "DJ",
          "Producción",
          "Mix & Mastering",
          "Sello discográfico",
          "Pilar, Bs As",
          "Inscripciones abiertas",
        ]}
      />

      <Container wide className="py-[clamp(48px,8vh,96px)]">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.8fr))_minmax(0,1fr)]">
          <div>
            <span className="t-display-tight text-2xl">La Juanita Studio</span>
            <p className="t-body mt-4 max-w-[32ch] text-sm text-[color:var(--page-muted)]">
              Academia de DJ y producción de música electrónica, estudio de mix
              &amp; mastering y sello discográfico.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="t-mono text-[color:var(--page-faint)]">{col.title}</h2>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="t-body link-u text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <address className="not-italic">
            <h2 className="t-mono text-[color:var(--page-faint)]">Dónde</h2>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="t-body text-[color:var(--page-muted)]">{CONTACT.address}</li>
              <li>
                <a href={`mailto:${CONTACT.email}`} className="t-body link-u">
                  {CONTACT.email}
                </a>
              </li>
              <li>
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="t-body link-u"
                >
                  {CONTACT.whatsappDisplay}
                </a>
              </li>
              <li className="flex gap-4 pt-2">
                {[
                  { href: CONTACT.instagram, label: "Instagram" },
                  { href: CONTACT.spotify, label: "Spotify" },
                  { href: CONTACT.youtube, label: "YouTube" },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="t-mono link-u"
                  >
                    {s.label}
                  </a>
                ))}
              </li>
            </ul>
          </address>
        </div>
      </Container>

      {/* Nombre gigante: contorno que se rellena al final del scroll */}
      <div data-footer-word className="relative select-none px-[var(--pad)] pb-6" aria-hidden>
        <div className="relative">
          <span
            className="t-display block w-full text-[15.5vw] leading-[0.8] text-transparent"
            style={{ WebkitTextStroke: "1px var(--page-line)" }}
          >
            La Juanita
          </span>
          <span
            data-footer-fill
            className="t-display absolute inset-0 block w-full text-[15.5vw] leading-[0.8] text-red"
          >
            La Juanita
          </span>
        </div>
      </div>

      <Container wide className="pb-8">
        <div className="t-mono flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--page-line)] pt-6 text-[color:var(--page-faint)]">
          <span>© {new Date().getFullYear()} La Juanita Studio</span>
          <span>Pilar · Buenos Aires · Argentina</span>
        </div>
      </Container>
    </footer>
  );
}
