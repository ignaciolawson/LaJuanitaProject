package com.lajuanita.backend.alumno.dto;

import com.lajuanita.backend.alumno.NivelIngreso;
import com.lajuanita.backend.usuario.dto.AltaUsuarioRequest;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

/**
 * Alta de un alumno, que cubre los dos caminos reales del estudio en una sola
 * operación y una sola transacción:
 *
 * <ol>
 *   <li><b>La persona ya tiene cuenta</b> (se registró sola, quizá para alquilar
 *       una cabina, y ahora se inscribe): viene {@link #idUsuario}.
 *   <li><b>Micaela la carga de cero</b> (se anotó por WhatsApp, o es uno de los
 *       alumnos que hoy viven en el Notion): viene {@link #usuarioNuevo}, y se
 *       crea la cuenta con contraseña temporal.
 * </ol>
 *
 * <p>Que sea una sola llamada no es comodidad: hacerlo en dos (crear usuario,
 * después crear alumno) deja una cuenta huérfana si la segunda falla. Acá o
 * pasan las dos cosas o no pasa ninguna.
 */
public record AltaAlumnoRequest(

        /** Camino 1. Excluyente con {@link #usuarioNuevo}. */
        Long idUsuario,

        /** Camino 2. Excluyente con {@link #idUsuario}. */
        @Valid AltaUsuarioRequest usuarioNuevo,

        NivelIngreso nivelIngreso,

        @Size(max = 100)
        String instagram) {

    /** Exactamente uno de los dos caminos, ni ninguno ni los dos. */
    public boolean tieneExactamenteUnCamino() {
        return (idUsuario == null) != (usuarioNuevo == null);
    }
}
