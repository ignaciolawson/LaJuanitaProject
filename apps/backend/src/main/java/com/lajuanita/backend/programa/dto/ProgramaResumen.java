package com.lajuanita.backend.programa.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.programa.Cobro;
import com.lajuanita.backend.programa.Programa;

/**
 * Una fila del catálogo (`V28`). Lo lee la pantalla {@code /admin/programas} y
 * el alta de inscripción, que de acá saca el precio para prellenar y la
 * cantidad de clases estándar.
 */
public record ProgramaResumen(
        Long idPrograma,
        Disciplina disciplina,
        String nombre,
        String descripcion,
        /** {@code null} = todavía no hay precio. Cero es un precio. */
        BigDecimal precio,
        /** El precio del grupo de 2 y de 3 (`V35`, P88); null = sin cargar. La mentoría nunca. */
        BigDecimal precio2,
        BigDecimal precio3,
        Moneda moneda,
        Cobro cobro,
        /** {@code null} = sin estándar: quien inscribe dice cuántas son. */
        Short clasesEstandar,
        short duracionMinutos,
        boolean activo) {

    public static ProgramaResumen de(Programa p) {
        return new ProgramaResumen(
                p.getId(),
                p.getDisciplina(),
                p.getNombre(),
                p.getDescripcion(),
                p.getPrecio(),
                p.getPrecio2(),
                p.getPrecio3(),
                p.getMoneda(),
                p.getCobro(),
                p.getClasesEstandar(),
                p.getDuracionMinutos(),
                p.isActivo());
    }
}
