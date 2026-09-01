package com.lajuanita.backend.sala.dto;

import com.lajuanita.backend.sala.TipoUso;

/** Para qué se usa una sala. Alimenta el selector y los colores del calendario. */
public record TipoUsoResumen(
        Long idTipoUso,
        String codigo,
        String nombre,
        /** Si es formación. No implica que haya profesor asignado (P37). */
        boolean esClase,
        /**
         * De qué curso descuenta. Null = no descuenta (`V22`).
         *
         * <p>Viaja para que el alta pueda <b>decir</b> contra qué curso va a
         * descontar. No para que decida: quien elige la inscripción es el
         * servidor, y el {@code <select>} "Descuenta de" dejó de existir.
         */
        String disciplina,
        String color,
        boolean activo,
        /** Si se puede pedir desde el portal sin que administración lo arme (P17). */
        boolean solicitablePorUsuario) {

    public static TipoUsoResumen de(TipoUso tipo) {
        return new TipoUsoResumen(
                tipo.getId(),
                tipo.getCodigo(),
                tipo.getNombre(),
                tipo.isEsClase(),
                tipo.getDisciplina() == null ? null : tipo.getDisciplina().name(),
                tipo.getColor(),
                tipo.isActivo(),
                tipo.isSolicitablePorUsuario());
    }
}
