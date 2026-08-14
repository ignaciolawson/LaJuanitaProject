package com.lajuanita.backend.usuario.dto;

import java.util.List;

import org.springframework.data.domain.Page;

/**
 * Página de resultados, con forma propia y estable.
 *
 * <p>No se devuelve el {@code Page} de Spring Data directamente: su
 * serialización JSON no es un contrato estable (Spring lo avisa por log) y
 * expone un montón de campos que el front no usa. Con este record, si mañana
 * cambia la versión de Spring, el JSON que ve el front sigue igual.
 */
public record Pagina<T>(
        List<T> contenido,
        int pagina,
        int tamanio,
        long totalElementos,
        int totalPaginas) {

    public static <T> Pagina<T> de(Page<T> page) {
        return new Pagina<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }
}
