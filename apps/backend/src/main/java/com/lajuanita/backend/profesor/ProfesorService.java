package com.lajuanita.backend.profesor;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.profesor.dto.AltaProfesorRequest;
import com.lajuanita.backend.profesor.dto.EdicionProfesorRequest;
import com.lajuanita.backend.profesor.dto.ProfesorResumen;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * La relación de profesor.
 *
 * <p>⚠️ <b>Esta clase no existía, y ése es el hallazgo</b> (§14 · B2). {@code
 * ProfesorController} tenía un único {@code @GetMapping} y ninguna capa del
 * sistema sabía crear una fila de {@code profesor}: <b>no había forma de
 * convertir a nadie en profesor por la API</b>, ni a alguien con cuenta ni a
 * nadie. Los seis pantallas del Módulo 5, el selector de la inscripción y la
 * agenda del profesor leían todos una tabla que sólo se podía poblar a mano con
 * SQL. Nada fallaba, porque una capacidad que no existe no tiene nada que
 * romper — es la misma forma que ya encontraron `V16`, la mitad de §8 del Módulo
 * 5 y la regla dura del Módulo 7.
 *
 * <p>Lo que dice el modelo de este proyecto desde el principio: <b>permisos y
 * relaciones de negocio son dos ejes independientes</b>, y una fila de {@code
 * profesor} se crea <i>dándole la relación a un {@code usuario}</i>. Eso es
 * literalmente lo que hace {@link #alta}.
 */
@Service
public class ProfesorService {

    private final ProfesorRepository profesores;
    private final UsuarioRepository usuarios;

    public ProfesorService(ProfesorRepository profesores, UsuarioRepository usuarios) {
        this.profesores = profesores;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<ProfesorResumen> listar(boolean incluirInactivos) {
        return profesores.listar(incluirInactivos).stream().map(ProfesorResumen::de).toList();
    }

    /**
     * Convierte en profesor a alguien que ya tiene cuenta.
     *
     * <p>El chequeo de duplicado es <b>para el mensaje</b>: quien manda es el
     * {@code UNIQUE} sobre {@code profesor.id_usuario} de `V1`, y entre esta
     * consulta y el INSERT se puede meter otro pedido. Es el mismo reparto que el
     * email de usuario y que el código de release, donde el pre-chequeo explica y
     * el índice garantiza.
     *
     * <p>⚠️ <b>Tiene efecto en el pedido siguiente de esa persona, sin que se
     * toque nada más.</b> {@code /api/me} contesta {@code esProfesor} preguntando
     * por la existencia de esta fila, así que el menú del portal —Mi agenda, Mis
     * alumnos, Subir material— le aparece sola. No hay un segundo lugar donde
     * "habilitarlo".
     */
    @Transactional
    public ProfesorResumen alta(AltaProfesorRequest solicitud) {
        Usuario usuario = usuarios.findById(solicitud.idUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + solicitud.idUsuario() + "."));

        if (profesores.existsByUsuarioId(usuario.getId())) {
            throw new DatoDuplicadoException("idUsuario", "Esa persona ya es profesor.");
        }

        Profesor profesor = new Profesor();
        profesor.setUsuario(usuario);
        profesor.setEspecialidad(normalizar(solicitud.especialidad()));
        profesor.setActivo(true);

        return ProfesorResumen.de(profesores.save(profesor));
    }

    /**
     * Corrige la especialidad y da de baja o de alta al profesor.
     *
     * <p>Un campo ausente no se toca: {@code especialidad} en blanco la borra
     * —es un dato libre y opcional— y {@code activo} en {@code null} la deja como
     * está, que es lo que manda un formulario que sólo vino a editar lo otro.
     */
    @Transactional
    public ProfesorResumen editar(Long idProfesor, EdicionProfesorRequest cambios) {
        Profesor profesor = profesores.findById(idProfesor)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el profesor " + idProfesor + "."));

        profesor.setEspecialidad(normalizar(cambios.especialidad()));
        if (cambios.activo() != null) {
            profesor.setActivo(cambios.activo());
        }

        return ProfesorResumen.de(profesor);
    }

    private String normalizar(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return texto.trim();
    }
}
