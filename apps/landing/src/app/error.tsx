"use client";

import { PantallaDeError } from "@/components/brand/PantallaDeError";
import { Button } from "@/components/ui/Button";
import { CONTACT } from "@/data/contact";

/**
 * Cuando una página tira un error al dibujarse. Next la muestra en lugar de la
 * página rota y deja el resto del layout (navbar, footer) en pie.
 *
 * `reset` vuelve a intentar dibujar el mismo segmento: es la salida que más
 * veces resuelve, así que va primero y como botón sólido.
 */
export default function ErrorDePagina({ reset }: { error: Error; reset: () => void }) {
  return (
    <PantallaDeError
      codigo="500"
      pista="SE CORTÓ EL AUDIO"
      titular="Se nos fue el beat."
      remate="Alguien tropezó con el cable del master."
      acciones={
        <>
          <button type="button" onClick={reset} className="btn btn--solid">
            Intentar de nuevo
          </button>
          <Button href="/">Volver al inicio</Button>
        </>
      }
    >
      Algo falló de nuestro lado, no del tuyo. Probá de nuevo en un momento; si
      sigue pasando,{" "}
      <a
        href={`https://wa.me/${CONTACT.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="link-u text-accent"
      >
        escribinos por WhatsApp
      </a>
      .
    </PantallaDeError>
  );
}
