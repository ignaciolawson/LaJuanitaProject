package com.lajuanita.backend.sala.dto;

import java.util.List;

import com.lajuanita.backend.sala.Sala;

/**
 * Una columna del calendario, con qué se puede hacer adentro.
 *
 * <p>{@code usosPermitidos} es la matriz de §2.6 aplicada a esta sala. El
 * formulario la usa para no ofrecer combinaciones imposibles — grabar un set en
 * la Sala 1, dar una mentoría en la cabina de grabación. <b>No autoriza nada</b>:
 * quien decide es la FK compuesta de {@code reserva}, y sin ella esto sería una
 * sugerencia que se saltea llamando la API.
 */
public record SalaResumen(
        Long idSala,
        String nombre,
        String descripcion,
        boolean activa,
        short orden,
        List<UsoPermitido> usosPermitidos) {

    /**
     * Un uso habilitado para esta sala.
     *
     * <p>{@code advertencia} es el caso intermedio "se puede, pero ojo": una
     * clase de DJ en la cabina de grabación es válida solo si es una práctica
     * final. Bloquearlo sería rígido de más; no avisar nada dejaría mandar una
     * clase teórica a una sala sin escritorio.
     */
    public record UsoPermitido(Long idTipoUso, String advertencia) {
    }

    public static SalaResumen de(Sala sala, List<UsoPermitido> usos) {
        return new SalaResumen(
                sala.getId(),
                sala.getNombreSala(),
                sala.getDescripcion(),
                sala.isActiva(),
                sala.getOrden(),
                usos);
    }
}
