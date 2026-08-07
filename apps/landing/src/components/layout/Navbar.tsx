"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogIn } from "lucide-react";
import clsx from "clsx";
import { Container } from "@/components/ui/Container";

const LINKS = [
  { href: "/nosotros", label: "Nosotros" },
  { href: "/programas", label: "Programas" },
  { href: "/sello", label: "Sello" },
  { href: "/profesores", label: "Profesores" },
  { href: "/faq", label: "FAQ" },
  { href: "/contacto", label: "Contacto" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes, without an effect
  // (React's "adjust state during render" pattern for prop-driven resets).
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        open && "bg-bg border-b border-border-subtle",
        !open && scrolled && "bg-bg/90 backdrop-blur-md border-b border-border-subtle",
        !open && !scrolled && "bg-transparent",
      )}
    >
      <Container className="flex h-20 items-center justify-between py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2" data-cursor="INICIO">
          <Image
            src="/images/logo/icon.png"
            alt="La Juanita"
            width={36}
            height={36}
            className="invert"
            priority
          />
          <span className="whitespace-nowrap font-display text-lg font-extrabold uppercase tracking-tight text-white">
            La Juanita
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "relative whitespace-nowrap font-display text-sm font-medium uppercase tracking-wide transition-colors",
                  active ? "text-white" : "text-text-secondary hover:text-white",
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute -bottom-1.5 left-0 h-[2px] w-full bg-red" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-4 lg:flex">
          <Link
            href="#"
            title="Portal de alumnos — próximamente"
            className="flex items-center gap-2 whitespace-nowrap font-display text-sm font-bold uppercase tracking-wide text-text-secondary transition-colors hover:text-white"
          >
            <LogIn size={16} aria-hidden />
            <span className="hidden xl:inline">Iniciar sesión</span>
          </Link>
          <Link
            href="/contacto"
            data-magnetic
            className="whitespace-nowrap rounded-full bg-red px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-red-hover"
          >
            Inscribite
          </Link>
        </div>

        <button
          type="button"
          className="cursor-pointer text-white lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </Container>

      {open && (
        <Container className="flex flex-col gap-1 pb-6 lg:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "border-b border-border-subtle py-3 font-display text-base font-medium uppercase tracking-wide transition-colors",
                pathname === link.href ? "text-white" : "text-text-secondary hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="#"
            className="flex items-center gap-2 border-b border-border-subtle py-3 font-display text-base font-bold uppercase tracking-wide text-text-secondary"
          >
            <LogIn size={18} aria-hidden />
            Iniciar sesión
          </Link>
          <Link
            href="/contacto"
            className="mt-4 rounded-full bg-red px-5 py-3 text-center font-display text-sm font-bold uppercase tracking-wide text-white"
          >
            Inscribite
          </Link>
        </Container>
      )}
    </header>
  );
}
