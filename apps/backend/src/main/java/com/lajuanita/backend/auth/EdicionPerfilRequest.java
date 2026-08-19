package com.lajuanita.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Los datos que cada uno puede cambiarse a sí mismo.
 *
 * <p><b>El email no está, y es una decisión.</b> Es la credencial con la que se
 * entra, y no hay forma de verificar que la dirección nueva sea de quien la
 * escribe: no hay infraestructura de correo ni la va a haber pronto
 * (`sistema-gestion-plan.md` §7 descarta el relay de mails). Con un email mal
 * tipeado la persona queda afuera de su propia cuenta y nadie se entera hasta
 * que intenta entrar. Cambiarlo es un trámite con administración, que ya tiene
 * la pantalla para hacerlo.
 *
 * <p>El rol tampoco, obviamente: es el eje de permisos y solo un ADMIN lo
 * otorga. Si estuviera acá, cualquiera se haría ADMIN.
 */
public record EdicionPerfilRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 80)
        String nombre,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 80)
        String apellido,

        @Size(max = 40)
        String telefono) {
}
