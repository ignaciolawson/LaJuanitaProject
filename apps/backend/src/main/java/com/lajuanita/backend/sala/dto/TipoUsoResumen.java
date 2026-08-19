package com.lajuanita.backend.sala.dto;

import com.lajuanita.backend.sala.TipoUso;

/** Para qué se usa una sala. Alimenta el selector y los colores del calendario. */
public record TipoUsoResumen(
        Long idTipoUso,
        String codigo,
        String nombre,
        /** Si es formación. No implica que haya profesor asignado (P37). */
        boolean esClase,
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
                tipo.getColor(),
                tipo.isActivo(),
                tipo.isSolicitablePorUsuario());
    }
}
