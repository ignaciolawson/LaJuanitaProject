package com.lajuanita.backend.profesor.dto;

import com.lajuanita.backend.usuario.dto.AltaUsuarioRequest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

/**
 * Dar de alta un profesor: a alguien que ya tiene cuenta, o creándole la
 * cuenta en el mismo movimiento.
 *
 * <p>Es el molde de {@code AltaAlumnoRequest}, y lo es desde P77 (2026-09-12).
 * Hasta entonces sólo aceptaba {@code idUsuario}, y el javadoc de acá defendía
 * la asimetría con un argumento que P77 dio vuelta: <i>"la relación se otorga
 * desde {@code /admin/usuarios}, parado sobre la fila de una persona que
 * existe"</i>. Ahora se otorga desde Profesores, donde —como en Alumnos— no hay
 * cuenta ninguna a mano, y hacerlo en dos llamadas dejaría un usuario huérfano
 * si la segunda falla. Los dos caminos viven en un pedido por eso.
 *
 * <p>Lo que no cambia es el modelo: <b>los permisos y las relaciones de negocio
 * son dos ejes independientes de una misma persona</b>. Ser profesor no es un
 * rol —ninguna anotación de seguridad lo puede decidir— sino una fila, y esta
 * request crea la fila.
 */
public record AltaProfesorRequest(

        /** Persona que ya tiene cuenta. Excluyente con {@link #usuarioNuevo}. */
        Long idUsuario,

        /** Cuenta a crear, con contraseña temporal. Excluyente con {@link #idUsuario}. */
        @Valid AltaUsuarioRequest usuarioNuevo,

        /** Lo que da: "DJ", "Producción", "Ableton". Libre y opcional. */
        @Size(max = 150)
        String especialidad) {

    /** Uno de los dos caminos, y sólo uno. El servicio lo exige con su mensaje. */
    public boolean tieneExactamenteUnCamino() {
        return (idUsuario == null) != (usuarioNuevo == null);
    }
}
