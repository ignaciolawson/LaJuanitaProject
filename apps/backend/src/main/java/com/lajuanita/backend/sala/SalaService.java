package com.lajuanita.backend.sala;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.sala.dto.SalaResumen;
import com.lajuanita.backend.sala.dto.SalaResumen.UsoPermitido;
import com.lajuanita.backend.sala.dto.TipoUsoResumen;

/**
 * El catálogo del calendario: las tres salas, los tipos de uso, y qué se puede
 * hacer en cada sala.
 *
 * <p>Es solo de lectura, y va a serlo hasta que exista una pantalla para editar
 * la matriz. Los datos los carga `V2` y están pensados para editarse desde el
 * sistema el día que compren una silla para la cabina de grabación — pero esa
 * pantalla todavía no se pidió.
 */
@Service
public class SalaService {

    private final SalaRepository salas;
    private final TipoUsoRepository tiposDeUso;

    public SalaService(SalaRepository salas, TipoUsoRepository tiposDeUso) {
        this.salas = salas;
        this.tiposDeUso = tiposDeUso;
    }

    @Transactional(readOnly = true)
    public List<SalaResumen> listarSalas(boolean incluirInactivas) {
        Map<Long, List<UsoPermitido>> matriz = matriz();
        return salas.listar(incluirInactivas).stream()
                .map(s -> SalaResumen.de(s, matriz.getOrDefault(s.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TipoUsoResumen> listarTiposDeUso(boolean incluirInactivos) {
        return tiposDeUso.listar(incluirInactivos).stream().map(TipoUsoResumen::de).toList();
    }

    /** La matriz completa en una consulta: son nueve filas, no vale la pena filtrarla. */
    private Map<Long, List<UsoPermitido>> matriz() {
        Map<Long, List<UsoPermitido>> porSala = new HashMap<>();
        for (Object[] fila : salas.matrizDeUsos()) {
            porSala.computeIfAbsent(((Number) fila[0]).longValue(), id -> new ArrayList<>())
                    .add(new UsoPermitido(((Number) fila[1]).longValue(), (String) fila[2]));
        }
        return porSala;
    }
}
