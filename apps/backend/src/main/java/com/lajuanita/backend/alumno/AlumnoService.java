package com.lajuanita.backend.alumno;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.dto.AltaAlumnoRequest;
import com.lajuanita.backend.alumno.dto.AlumnoResumen;
import com.lajuanita.backend.alumno.dto.EdicionAlumnoRequest;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.EstadoInscripcion;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.UsuarioService;
import com.lajuanita.backend.usuario.dto.UsuarioCreado;

/**
 * La relación formativa entre una persona y el estudio.
 *
 * <p>Un {@code alumno} no reemplaza al {@code usuario}: cuelga de él. Quien
 * alquila una cabina o manda un track a mastering tiene cuenta y nunca aparece
 * acá.
 */
@Service
public class AlumnoService {

    private final AlumnoRepository alumnos;
    private final UsuarioRepository usuarios;
    private final UsuarioService usuarioService;

    public AlumnoService(AlumnoRepository alumnos,
            UsuarioRepository usuarios,
            UsuarioService usuarioService) {
        this.alumnos = alumnos;
        this.usuarios = usuarios;
        this.usuarioService = usuarioService;
    }

    /**
     * Da de alta un alumno, creando la cuenta si hace falta.
     *
     * <p>Todo en una transacción: si el alta del alumno falla, la cuenta recién
     * creada se deshace con ella y no queda un usuario huérfano.
     *
     * @return el alumno y, si se creó una cuenta nueva, su contraseña temporal
     */
    @Transactional
    public AltaAlumnoResultado alta(AltaAlumnoRequest solicitud, boolean puedeAsignarRoles) {
        if (!solicitud.tieneExactamenteUnCamino()) {
            throw new SolicitudInvalidaException(
                    "Mandá `idUsuario` (persona que ya tiene cuenta) o `usuarioNuevo` (cuenta a crear), pero no los dos.");
        }

        String passwordTemporal = null;
        Usuario usuario;

        if (solicitud.idUsuario() != null) {
            usuario = usuarios.findById(solicitud.idUsuario())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe el usuario " + solicitud.idUsuario() + "."));
        } else {
            UsuarioCreado creado = usuarioService.altaPorAdministracion(
                    solicitud.usuarioNuevo(), puedeAsignarRoles);
            passwordTemporal = creado.passwordTemporal();
            usuario = usuarios.findById(creado.usuario().id()).orElseThrow();
        }

        // La base ya lo impide con un UNIQUE sobre alumno.id_usuario, pero un
        // mensaje claro es mejor que una violación de constraint en la pantalla.
        if (alumnos.existsByUsuarioId(usuario.getId())) {
            throw new DatoDuplicadoException("idUsuario", "Esa persona ya está registrada como alumno.");
        }

        Alumno alumno = new Alumno();
        alumno.setUsuario(usuario);
        alumno.setNivelIngreso(solicitud.nivelIngreso());
        alumno.setInstagram(normalizar(solicitud.instagram()));

        Alumno guardado = alumnos.save(alumno);
        // Acaba de nacer: no cursa nada todavía, y no hay nada que consultar.
        return new AltaAlumnoResultado(AlumnoResumen.recienCreado(guardado), passwordTemporal);
    }

    @Transactional(readOnly = true)
    public Page<AlumnoResumen> listar(String buscar,
            EstadoAlumno estado,
            Disciplina disciplina,
            Nivel nivel,
            Pageable paginado) {

        Page<Alumno> pagina = alumnos.buscar(
                Busqueda.patron(buscar), estado, disciplina, nivel,
                EstadoInscripcion.VIGENTES, paginado);

        Map<Long, List<Disciplina>> disciplinas = disciplinasDe(pagina.getContent());
        return pagina.map(a -> AlumnoResumen.de(a, disciplinas.getOrDefault(a.getId(), List.of())));
    }

    @Transactional(readOnly = true)
    public AlumnoResumen porId(Long id) {
        return conDisciplinas(buscar(id));
    }

    @Transactional
    public AlumnoResumen editar(Long id, EdicionAlumnoRequest solicitud) {
        Alumno alumno = buscar(id);
        alumno.setNivelIngreso(solicitud.nivelIngreso());
        alumno.setInstagram(normalizar(solicitud.instagram()));
        return conDisciplinas(alumno);
    }

    /**
     * Cambia el estado del alumno. Desactivar conserva TODO su historial: es
     * una regla dura del módulo, y por eso ninguna FK usa ON DELETE CASCADE.
     */
    @Transactional
    public AlumnoResumen cambiarEstado(Long id, EstadoAlumno estado) {
        Alumno alumno = buscar(id);
        alumno.setEstadoAlumno(estado);
        return conDisciplinas(alumno);
    }

    // -------------------------------------------------------------------------

    private AlumnoResumen conDisciplinas(Alumno alumno) {
        return AlumnoResumen.de(alumno,
                disciplinasDe(List.of(alumno)).getOrDefault(alumno.getId(), List.of()));
    }

    /**
     * Qué está cursando cada alumno, en una sola consulta para toda la página.
     *
     * <p>Una por alumno sería el mismo N+1 que el {@code JOIN FETCH} del usuario
     * ya evita en la consulta de al lado.
     */
    private Map<Long, List<Disciplina>> disciplinasDe(Collection<Alumno> filas) {
        List<Long> ids = filas.stream().map(Alumno::getId).toList();
        if (ids.isEmpty()) {
            // `IN ()` no es SQL válido: sin esto, una página vacía revienta.
            return Map.of();
        }

        Map<Long, List<Disciplina>> porAlumno = new HashMap<>();
        for (Object[] fila : alumnos.disciplinasVigentes(ids, EstadoInscripcion.VIGENTES)) {
            porAlumno.computeIfAbsent(((Number) fila[0]).longValue(), id -> new ArrayList<>())
                    .add((Disciplina) fila[1]);
        }
        return porAlumno;
    }

    private Alumno buscar(Long id) {
        return alumnos.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el alumno " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    /** El alumno creado y, solo si se creó una cuenta nueva, su contraseña temporal. */
    public record AltaAlumnoResultado(AlumnoResumen alumno, String passwordTemporal) {
    }
}
