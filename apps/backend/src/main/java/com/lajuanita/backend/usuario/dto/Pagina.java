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

    /** Techo del tamaño de página: nadie pide 10.000 filas de una. */
    public static final int TAMANIO_MAXIMO = 100;

    /** Tamaño por defecto, el mismo que declaran los {@code @RequestParam}. */
    private static final int TAMANIO_POR_DEFECTO = 20;

    public static <T> Pagina<T> de(Page<T> page) {
        return new Pagina<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages());
    }

    /**
     * Deja el tamaño pedido dentro de lo razonable: un valor sin sentido cae al
     * default y nadie puede pedir más de {@link #TAMANIO_MAXIMO} filas.
     *
     * <p>Vive acá, y no en cada controller, porque es parte de qué significa una
     * página en esta API — y porque estaba copiado igual en los dos (ARQ-06).
     * Cada listado nuevo lo hereda en vez de volver a escribirlo.
     */
    public static int acotarTamanio(int tamanio) {
        if (tamanio < 1) {
            return TAMANIO_POR_DEFECTO;
        }
        return Math.min(tamanio, TAMANIO_MAXIMO);
    }
}
