package com.lajuanita.backend.programa;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.lajuanita.backend.inscripcion.Disciplina;

public interface ProgramaRepository extends JpaRepository<Programa, Long> {

    /** Las tres, en el orden en que se sembraron: DJ, Producción, Mentoría. */
    List<Programa> findAllByOrderByIdAsc();

    /** La unión con {@code inscripcion}: una fila por disciplina (`V28` §1). */
    Optional<Programa> findByDisciplina(Disciplina disciplina);
}
