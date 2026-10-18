import type { Metadata } from "next";

import { PantallaDeError } from "@/components/brand/PantallaDeError";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "No encontramos ni el track",
  robots: { index: false, follow: false },
};

/** El 404 de la landing: un link roto, una dirección mal escrita, una página que ya no está. */
export default function NotFound() {
  return (
    <PantallaDeError
      codigo="404"
      pista="PISTA NO ENCONTRADA"
      titular="No encontramos ni el track."
      remate="Revolvimos toda la crate y nada."
      acciones={
        <>
          <Button href="/" variant="solid">
            Volver al inicio
          </Button>
          <Button href="/programas">Ver los programas</Button>
        </>
      }
    >
      Esta página no está en la playlist: puede que el link venga mal escrito o
      que la hayamos sacado del set. Desde el inicio llegás a todo lo demás.
    </PantallaDeError>
  );
}
