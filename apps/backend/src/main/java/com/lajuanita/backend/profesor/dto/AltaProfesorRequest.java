package com.lajuanita.backend.profesor.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Dar la relación de profesor a una persona que ya tiene cuenta.
 *
 * <p>⚠️ <b>No tiene el camino "crear la cuenta" que sí tiene {@code
 * AltaAlumnoRequest}, y no es una asimetría olvidada.</b> Allá los dos caminos
 * viven en un mismo pedido porque el alta de alumno se hace desde la pantalla de
 * alumnos, donde no hay cuenta ninguna a mano, y hacerlo en dos llamadas dejaría
 * un usuario huérfano si la segunda falla. Acá la relación se otorga desde
 * {@code /admin/usuarios}, parado sobre la fila de una persona que existe: la
 * cuenta ya está, y crearla es un acto propio de esa misma pantalla.
 *
 * <p>Es la forma que este proyecto ya tenía escrita: <b>los permisos y las
 * relaciones de negocio son dos ejes independientes de una misma persona</b>, y
 * la pantalla de usuarios es donde se administra la persona. Ser profesor no es
 * un rol —ninguna anotación de seguridad lo puede decidir— sino una fila.
 */
public record AltaProfesorRequest(

        @NotNull(message = "Decí de quién es la cuenta.")
        Long idUsuario,

        /** Lo que da: "DJ", "Producción", "Ableton". Libre y opcional. */
        @Size(max = 150)
        String especialidad) {
}
