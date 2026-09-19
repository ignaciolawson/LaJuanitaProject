package com.lajuanita.backend.inscripcion.dto;

import com.lajuanita.backend.inscripcion.InscripcionIntegrante;

/**
 * Una persona dentro de una inscripción (`V35`, P87): quién es y si es el
 * referente. Aplanado como el resto de los resúmenes: la pantalla nombra a los
 * tres en una línea y enlaza a cada ficha.
 */
public record IntegranteResumen(
        Long idAlumno,
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        boolean referente) {

    public static IntegranteResumen de(InscripcionIntegrante x) {
        var persona = x.getAlumno().getUsuario();
        return new IntegranteResumen(
                x.getAlumno().getId(),
                persona.getId(),
                persona.getNombre(),
                persona.getApellido(),
                persona.getEmail(),
                x.isReferente());
    }
}
