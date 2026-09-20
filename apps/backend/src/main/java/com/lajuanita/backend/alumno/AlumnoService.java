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

    /** La relación de esta persona, si la tiene. Para el alta desde el buzón. */
    @Transactional(readOnly = true)
    public java.util.Optional<Alumno> buscarPorUsuario(Long idUsuario) {
        return alumnos.findByUsuarioId(idUsuario);
    }

    /**
     * La relación pelada —sin nivel de ingreso ni Instagram— para quien llega
     * del buzón con cuenta y sin fila de alumno. Es {@link #alta} por el camino
     * 1 sin el DTO: lo que falta se completa después desde la ficha del alumno
     * (P66: el buzón crea, no administra).
     */
    @Transactional
    public Alumno altaDeLaRelacion(Usuario usuario) {
        return altaDeLaRelacion(usuario, null);
    }

    /**
     * La misma, con el nivel de ingreso: <b>el de la inscripción</b> (P91, `V35`).
     * Ignacio: <i>"pueden ser 3 avanzados pero si se inscribieron en inicial,
     * cursan inicial; se les da de alta al nivel de la inscripción"</i>. Los dos
     * enums tienen los mismos tres valores y se cruzan por nombre.
     */
    @Transactional
    public Alumno altaDeLaRelacion(Usuario usuario, Nivel nivelDeLaInscripcion) {
        Alumno alumno = new Alumno();
        alumno.setUsuario(usuario);
        if (nivelDeLaInscripcion != null) {
            alumno.setNivelIngreso(NivelIngreso.valueOf(nivelDeLaInscripcion.name()));
        }
        return alumnos.save(alumno);
    }

    @Transactional(readOnly = true)
    public Page<AlumnoResumen> listar(String buscar,
            EstadoAlumno estado,
            Disciplina disciplina,
            Nivel nivel,
            Pageable paginado) {

        Page<Alumno> pagina = alumnos.buscar(
                Busqueda.patron(buscar), Busqueda.numeroDeGrupo(buscar), estado, disciplina, nivel,
                EstadoInscripcion.VIGENTES, paginado);

        CursosDeLaPagina cursos = cursosDe(pagina.getContent());
        return pagina.map(a -> AlumnoResumen.de(a,
                cursos.disciplinas().getOrDefault(a.getId(), List.of()),
                cursos.grupos().getOrDefault(a.getId(), List.of())));
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
     * Cambia el estado del alumno. Desactivar conserva <b>todo</b> su historial: es
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
        CursosDeLaPagina cursos = cursosDe(List.of(alumno));
        return AlumnoResumen.de(alumno,
                cursos.disciplinas().getOrDefault(alumno.getId(), List.of()),
                cursos.grupos().getOrDefault(alumno.getId(), List.of()));
    }

    /** Lo que una sola consulta contesta de los cursos vigentes de una página. */
    private record CursosDeLaPagina(Map<Long, List<Disciplina>> disciplinas,
            Map<Long, List<Integer>> grupos) {
    }

    /**
     * Qué está cursando cada alumno, en una sola consulta para toda la página.
     *
     * <p>Una por alumno sería el mismo N+1 que el {@code JOIN FETCH} del usuario
     * ya evita en la consulta de al lado.
     */
    private CursosDeLaPagina cursosDe(Collection<Alumno> filas) {
        List<Long> ids = filas.stream().map(Alumno::getId).toList();
        if (ids.isEmpty()) {
            // `IN ()` no es SQL válido: sin esto, una página vacía revienta.
            return new CursosDeLaPagina(Map.of(), Map.of());
        }

        Map<Long, List<Disciplina>> porAlumno = new HashMap<>();
        Map<Long, List<Integer>> grupos = new HashMap<>();
        for (Object[] fila : alumnos.disciplinasVigentes(ids, EstadoInscripcion.VIGENTES)) {
            Long idAlumno = ((Number) fila[0]).longValue();
            porAlumno.computeIfAbsent(idAlumno, id -> new ArrayList<>())
                    .add((Disciplina) fila[1]);
            // El número de grupo sale de la MISMA consulta que las disciplinas
            // (P96): son la misma pregunta —qué cursa hoy— y pedirla dos veces
            // es la N+1 que esta consulta ya existía para evitar.
            if (fila[2] != null) {
                grupos.computeIfAbsent(idAlumno, id -> new ArrayList<>())
                        .add(((Number) fila[2]).intValue());
            }
        }
        return new CursosDeLaPagina(porAlumno, grupos);
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
