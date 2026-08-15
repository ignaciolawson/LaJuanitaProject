import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, organizationLd } from "@/lib/seo";
import { CONTACT } from "@/data/contact";

export const metadata: Metadata = pageMetadata({
  // Sin la marca en el título: el `template` del layout ya le agrega
  // "| La Juanita Studio", y quedaba nombrándola dos veces en el mismo
  // renglón del resultado de búsqueda.
  title: "Contacto — sede Pilar, Buenos Aires",
  description:
    "Escribinos por WhatsApp o mail para consultar por los programas de DJ y producción, reservar cabina o coordinar un mastering. Sede en Pilar, Buenos Aires.",
  path: "/contacto",
});

export default function ContactoPage() {
  return (
    <>
      {/* La ficha de la organización se repite en esta página con el mismo
          `@id` que en el layout. No es duplicado: es la página que Google
          asocia con los datos de contacto del negocio, y reafirmar la entidad
          acá es lo que ata "estos datos" con "esta empresa". */}
      <JsonLd
        data={graph(
          breadcrumbLd([{ name: "Contacto", path: "/contacto" }]),
          organizationLd(),
        )}
      />

      <PageHero
        eyebrow="Contacto"
        title={
          <>
            Vení a <span className="font-normal text-[color:var(--page-muted)]">conocernos</span>
          </>
        }
        description="Escribinos y te contamos todo sobre los programas, horarios y el sello. Respondemos rápido por WhatsApp."
        image="/images/estudio/fachada.jpeg"
      />

      <section data-theme="ink" className="bg-[color:var(--page-bg)] py-20 sm:py-28">
        <Container className="grid gap-16 lg:grid-cols-2">
          <Reveal>
            <div className="space-y-5">
              <a
                href={`https://wa.me/${CONTACT.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="ABRIR"
                className="flex items-center gap-3 text-[color:var(--page-fg)] transition-colors hover:text-red"
              >
                <MessageCircle size={20} className="text-red" aria-hidden />
                {CONTACT.whatsappDisplay}
              </a>
              {/* Sólo si hay casilla real. El mail que estaba acá no existe
                  (§13): un `mailto:` a una dirección inventada no es un dato
                  provisorio, es un mensaje que nadie recibe nunca. */}
              {CONTACT.email && (
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="flex items-center gap-3 text-[color:var(--page-fg)] transition-colors hover:text-red"
                >
                  <Mail size={20} className="text-red" aria-hidden />
                  {CONTACT.email}
                </a>
              )}
              <p className="flex items-center gap-3 text-[color:var(--page-fg)]">
                <MapPin size={20} className="text-red" aria-hidden />
                {CONTACT.address}
              </p>
            </div>

            <Button href={`https://wa.me/${CONTACT.whatsapp}`} external className="mt-10">
              Escribinos por WhatsApp
            </Button>
          </Reveal>

          <Reveal className="map-embed relative min-h-[320px] overflow-hidden  border border-[color:var(--page-line)] lg:min-h-full">
            <iframe
              src={CONTACT.mapsEmbedUrl}
              title="Ubicación de La Juanita Studio"
              className="absolute inset-0 h-full w-full grayscale invert-[92%]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            {/* Sólo aparece en táctil, donde el mapa quedó sin interacción
                para no robarle el scroll a la página (ver `.map-embed`). */}
            <a
              href={CONTACT.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="map-embed-cta btn btn--strong absolute bottom-4 left-1/2 -translate-x-1/2 bg-[color:var(--page-bg)]"
            >
              Abrir en Google Maps
              <span aria-hidden className="text-[1.25em] leading-none">
                ↗
              </span>
            </a>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
