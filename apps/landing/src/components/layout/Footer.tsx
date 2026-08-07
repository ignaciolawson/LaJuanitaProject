import Image from "next/image";
import Link from "next/link";
import { InstagramIcon, SpotifyIcon, YoutubeIcon } from "@/components/ui/SocialIcons";
import { Container } from "@/components/ui/Container";
import { CONTACT } from "@/data/contact";

const NAV = [
  { href: "/nosotros", label: "Nosotros" },
  { href: "/programas", label: "Programas" },
  { href: "/sello", label: "Sello discográfico" },
  { href: "/profesores", label: "Profesores" },
  { href: "/faq", label: "Preguntas frecuentes" },
  { href: "/contacto", label: "Contacto" },
];

const SOCIAL = [
  { href: CONTACT.instagram, label: "Instagram", icon: InstagramIcon },
  { href: CONTACT.spotify, label: "Spotify", icon: SpotifyIcon },
  { href: CONTACT.youtube, label: "YouTube", icon: YoutubeIcon },
];

export function Footer() {
  return (
    <footer className="border-t border-border-subtle bg-surface">
      <Container className="grid gap-12 py-16 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <Image
              src="/images/logo/icon.png"
              alt="La Juanita"
              width={32}
              height={32}
              className="invert"
            />
            <span className="font-display text-lg font-extrabold uppercase tracking-tight text-white">
              La Juanita
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-text-secondary">
            Academia de DJ y producción de música electrónica, y sello
            discográfico. Sede Pilar — próximamente en Córdoba.
          </p>
          <div className="mt-6 flex gap-4">
            {SOCIAL.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors hover:border-red hover:text-red"
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-text-subdued">
            Navegación
          </h3>
          <ul className="mt-4 space-y-3">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-text-secondary transition-colors hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-text-subdued">
            Contacto
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            <li>{CONTACT.address}</li>
            <li>
              <a
                href={`mailto:${CONTACT.email}`}
                className="transition-colors hover:text-white"
              >
                {CONTACT.email}
              </a>
            </li>
            <li>
              <a
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </Container>

      <div className="relative overflow-hidden border-t border-border-subtle py-6 pb-16">
        <Container className="relative z-10 flex flex-col items-center justify-between gap-2 text-xs text-text-subdued sm:flex-row">
          <p>© {new Date().getFullYear()} La Juanita Studio. Todos los derechos reservados.</p>
          <p>Pilar, Buenos Aires, Argentina.</p>
        </Container>
        <Image
          src="/images/logo/wordmark.png"
          alt=""
          aria-hidden
          width={1200}
          height={444}
          className="pointer-events-none absolute -bottom-10 left-1/2 w-[140%] max-w-none -translate-x-1/2 opacity-[0.06] invert sm:-bottom-16 sm:w-[70%]"
        />
      </div>
    </footer>
  );
}
