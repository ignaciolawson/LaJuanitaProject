package com.lajuanita.backend.programa;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.programa.dto.EdicionProgramaRequest;
import com.lajuanita.backend.programa.dto.ProgramaResumen;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;

/**
 * El catálogo de programas (`V28`, P63 — cierra P13).
 *
 * <p>Tres filas, una por disciplina, y la pregunta que este servicio contesta
 * para el resto del sistema es {@link #paraInscribir}: <i>cuántas clases trae y
 * a cuánto</i>. Antes eso vivía en el enum {@code Disciplina} de Java y en una
 * constante del front, con un comentario en cada uno diciendo que la otra
 * copia era la que valía. Ahora es una fila que Mica edita.
 */
@Service
public class ProgramaService {

    private final ProgramaRepository programas;

    public ProgramaService(ProgramaRepository programas) {
        this.programas = programas;
    }

    @Transactional(readOnly = true)
    public List<ProgramaResumen> listar() {
        return programas.findAllByOrderByIdAsc().stream().map(ProgramaResumen::de).toList();
    }

    /**
     * El programa de una disciplina, para el alta de inscripción.
     *
     * <p>Un programa desactivado no se ofrece: es lo que {@code activo} significa,
     * y si no lo significara acá la columna sería decorativa — que es peor que
     * no tenerla (ver {@code Sala.activa}). Las inscripciones que ya existen no
     * se enteran.
     */
    @Transactional(readOnly = true)
    public Programa paraInscribir(Disciplina disciplina) {
        Programa programa = programas.findByDisciplina(disciplina)
                .orElseThrow(() -> new SolicitudInvalidaException(
                        "No hay un programa de " + disciplina + " en el catálogo."));
        if (!programa.isActivo()) {
            throw new SolicitudInvalidaException(
                    "El programa de " + disciplina + " está desactivado: no se ofrece hoy.");
        }
        return programa;
    }

    /**
     * Editar una fila. Todo es modificable menos la disciplina (ver el DTO).
     *
     * <p>Que un PAQUETE tenga cantidad de clases lo exige la base (`V28` §2);
     * acá se chequea antes sólo para contestar con un mensaje de campo en vez
     * de un 409 de constraint.
     */
    @Transactional
    public ProgramaResumen editar(Long id, EdicionProgramaRequest cambios) {
        Programa programa = programas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el programa " + id + "."));

        if (cambios.cobro() == Cobro.PAQUETE && cambios.clasesEstandar() == null) {
            throw new SolicitudInvalidaException(
                    "Un programa que se cobra por paquete tiene que decir de cuántas clases es.");
        }

        programa.setNombre(cambios.nombre().trim());
        programa.setDescripcion(
                cambios.descripcion() == null || cambios.descripcion().isBlank()
                        ? null
                        : cambios.descripcion().trim());
        programa.setPrecio(cambios.precio());
        programa.setMoneda(cambios.moneda());
        programa.setCobro(cambios.cobro());
        programa.setClasesEstandar(cambios.clasesEstandar());
        programa.setDuracionMinutos(cambios.duracionMinutos());
        programa.setActivo(cambios.activo());

        return ProgramaResumen.de(programa);
    }
}
