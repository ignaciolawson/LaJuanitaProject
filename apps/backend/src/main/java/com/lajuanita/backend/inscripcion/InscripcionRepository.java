package com.lajuanita.backend.inscripcion;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;

public interface InscripcionRepository extends JpaRepository<Inscripcion, Long> {

    /**
     * El pre-chequeo de "una sola abierta por alumno y disciplina" (P3, P89).
     *
     * <p>Quien decide de verdad es el trigger de `V35` §4 (d) —hasta `V34` era el
     * índice único parcial {@code inscripcion_una_activa_por_disciplina}—: esto
     * existe para que salga un mensaje que nombre a la persona en vez del texto
     * del trigger, igual que en el alta de alumno. Entra por los integrantes:
     * desde `V35` el alumno no está en la inscripción sino en su tabla hija.
     */
    @Query("""
            SELECT count(i) > 0 FROM Inscripcion i
            JOIN i.integrantes x
            WHERE x.alumno.id = :idAlumno
              AND i.disciplina = :disciplina
              AND i.estado IN :estados
            """)
    boolean tieneAbiertaEnLaDisciplina(@Param("idAlumno") Long idAlumno,
            @Param("disciplina") Disciplina disciplina,
            @Param("estados") Collection<EstadoInscripcion> estados);

    /**
     * El siguiente número de grupo (`V35` §2): lo asigna el servicio al nacer un
     * grupo de 2 o 3, y la base exige al COMMIT que esté si y sólo si son 2 o
     * más. Nativa porque una secuencia no tiene entidad.
     */
    @Query(value = "SELECT nextval('inscripcion_numero_grupo_seq')", nativeQuery = true)
    long siguienteNumeroDeGrupo();

    /**
     * Listado con buscador y cuatro filtros, todos opcionales: en null, no
     * filtran. Devuelve <b>ids</b>, en el orden de la pantalla; el detalle lo
     * trae {@link #porIdsConDetalle}.
     *
     * <p>Es la forma de {@code PagoRepository.idsListados} + {@code porIdsConDetalle}
     * y por el mismo motivo: desde `V35` la persona está en una <b>colección</b>
     * ({@code integrantes}), y una colección no se puede {@code JOIN FETCH} en
     * una consulta paginada sin que Hibernate pagine en memoria. Así que esta
     * consulta filtra, ordena y pagina, y la otra trae todo lo que la fila
     * necesita en una sola vuelta.
     *
     * <p>El buscador y el filtro por alumno miran a <b>cualquier</b> integrante
     * (dos {@code EXISTS} separados: buscar "Facu" en las inscripciones de Mati
     * tiene que encontrar el grupo de los dos). El orden es por el apellido del
     * <b>referente</b>: es a quien nombra Deudores y quien encabeza la fila.
     * El {@code JOIN} al referente no multiplica filas porque hay exactamente
     * uno por inscripción (`V35` §4 b).
     */
    @Query(value = """
            SELECT i.id FROM Inscripcion i
            JOIN i.integrantes ref
            JOIN ref.alumno ra
            JOIN ra.usuario ru
            LEFT JOIN i.profesor p
            WHERE ref.referente = true
              AND (:idAlumno IS NULL OR EXISTS (
                      SELECT 1 FROM InscripcionIntegrante x
                      WHERE x.inscripcion = i AND x.alumno.id = :idAlumno))
              AND (:idProfesor IS NULL OR p.id = :idProfesor)
              AND (:disciplina IS NULL OR i.disciplina = :disciplina)
              AND (:estado     IS NULL OR i.estado = :estado)
              AND EXISTS (
                      SELECT 1 FROM InscripcionIntegrante y
                      JOIN y.alumno ya JOIN ya.usuario yu
                      WHERE y.inscripcion = i
                        AND (LOWER(yu.nombre)   LIKE :patron ESCAPE '\\'
                             OR LOWER(yu.apellido) LIKE :patron ESCAPE '\\'
                             OR LOWER(yu.email)    LIKE :patron ESCAPE '\\'))
            ORDER BY LOWER(ru.apellido), LOWER(ru.nombre), i.id DESC
            """,
            countQuery = """
            SELECT count(i) FROM Inscripcion i
            LEFT JOIN i.profesor p
            WHERE (:idAlumno IS NULL OR EXISTS (
                      SELECT 1 FROM InscripcionIntegrante x
                      WHERE x.inscripcion = i AND x.alumno.id = :idAlumno))
              AND (:idProfesor IS NULL OR p.id = :idProfesor)
              AND (:disciplina IS NULL OR i.disciplina = :disciplina)
              AND (:estado     IS NULL OR i.estado = :estado)
              AND EXISTS (
                      SELECT 1 FROM InscripcionIntegrante y
                      JOIN y.alumno ya JOIN ya.usuario yu
                      WHERE y.inscripcion = i
                        AND (LOWER(yu.nombre)   LIKE :patron ESCAPE '\\'
                             OR LOWER(yu.apellido) LIKE :patron ESCAPE '\\'
                             OR LOWER(yu.email)    LIKE :patron ESCAPE '\\'))
            """)
    Page<Long> buscar(@Param("patron") String patron,
            @Param("idAlumno") Long idAlumno,
            @Param("idProfesor") Long idProfesor,
            @Param("disciplina") Disciplina disciplina,
            @Param("estado") EstadoInscripcion estado,
            Pageable paginado);

    /**
     * El detalle de una lista de inscripciones en una consulta: integrantes con
     * su persona, y el profesor con la suya. <b>Sin orden a propósito</b> — el
     * orden lo decidió {@link #buscar} y el servicio lo restaura desde la lista
     * de ids; pedirlo dos veces sería una segunda definición del orden.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis
     */
    @Query("""
            SELECT DISTINCT i FROM Inscripcion i
            JOIN FETCH i.integrantes x
            JOIN FETCH x.alumno a
            JOIN FETCH a.usuario
            LEFT JOIN FETCH i.profesor p
            LEFT JOIN FETCH p.usuario
            WHERE i.id IN :ids
            """)
    List<Inscripcion> porIdsConDetalle(@Param("ids") Collection<Long> ids);

    /**
     * Cuántas clases consumió cada inscripción de la lista.
     *
     * <p><b>Esta consulta es la definición de "clase consumida" del lado de la
     * aplicación, y tiene que decir exactamente lo mismo que
     * {@code verificar_clases_contratadas} en {@code V9} §5.</b> Si las dos se
     * separan, la pantalla muestra un número que la base no reconoce: le dice a
     * Micaela que quedan tres clases y al cargar la siguiente la rechaza. Al
     * cambiar una, cambiar la otra.
     *
     * <p>La regla, de {@code platform.md} §13: <i>una clase solo se consume
     * cuando se toma</i>. No cuentan las reservas CANCELADA ni REPROGRAMADA, ni
     * las participaciones dadas de baja. <b>El ausente sí consume</b> — faltar
     * sin avisar no devuelve la clase, y eso es lo que le da sentido a
     * {@code AUSENTE_JUSTIFICADO} como estado aparte.
     *
     * <p><b>Cuenta RESERVAS distintas, no participaciones</b> (`V35` §5, P90):
     * una clase de un grupo de 3 son tres participaciones de la misma
     * inscripción en la misma reserva, y es UNA clase. Con {@code count(p)} un
     * grupo de 3 con 2 clases contratadas no podía tomar ni la primera — lo
     * encontraron los casos 300–302 de la suite de reglas al poner el bug de
     * vuelta.
     *
     * <p><b>Era SQL nativo</b> hasta el 2026-08-16, porque {@code reserva} y
     * {@code reserva_participante} no tenían entidad. Ahora que la tienen se
     * escribe en JPQL, y eso no es cosmética: las dos exclusiones dejaron de ser
     * literales sueltas y pasan por {@link EstadoAsistencia#CANCELADA} y
     * {@link EstadoReserva#OCUPAN_LA_SALA}, que son las mismas constantes que usa
     * el resto del sistema. Un estado nuevo ya no puede quedarse afuera de esta
     * cuenta en silencio.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis.
     *        {@code InscripcionService} corta antes.
     * @return filas {@code [id_inscripcion, cantidad]}; las inscripciones sin
     *         ninguna clase dada no aparecen
     */
    @Query("""
            SELECT p.inscripcion.id, count(DISTINCT r.id)
            FROM ReservaParticipante p
            JOIN p.reserva r
            WHERE p.inscripcion.id IN :ids
              AND p.estadoAsistencia <> :cancelada
              AND r.estado IN :ocupan
            GROUP BY p.inscripcion.id
            """)
    List<Object[]> contarClasesConsumidas(@Param("ids") Collection<Long> ids,
            @Param("cancelada") EstadoAsistencia cancelada,
            @Param("ocupan") Collection<EstadoReserva> ocupan);

    /**
     * Las inscripciones de una persona, por {@code usuario} y no por {@code alumno}.
     *
     * <p>La distinción importa acá más que en ningún otro lado: {@code pago} se
     * lleva contra {@code id_usuario} —como todas las tablas transaccionales—
     * mientras que la inscripción cuelga de sus alumnos. El estado de cuenta
     * cruza las dos cosas, así que necesita entrar por la identidad raíz.
     *
     * <p>"De una persona" es <b>de la que es integrante</b> (`V35`, P91): la
     * inscripción del grupo es de los tres, y aparece en el portal y en el
     * estado de cuenta de cada uno. El primer {@code JOIN} filtra por quien
     * pregunta; el {@code JOIN FETCH} trae a todos los integrantes, que es lo que
     * la fila necesita para nombrar al grupo.
     *
     * <p>Trae todas, de cualquier estado: una inscripción cancelada con un saldo
     * a favor sigue siendo parte de la cuenta de esa persona.
     */
    @Query("""
            SELECT DISTINCT i FROM Inscripcion i
            JOIN i.integrantes yo
            JOIN yo.alumno ya
            JOIN ya.usuario yu
            JOIN FETCH i.integrantes x
            JOIN FETCH x.alumno a
            JOIN FETCH a.usuario
            LEFT JOIN FETCH i.profesor p
            LEFT JOIN FETCH p.usuario
            WHERE yu.id = :idUsuario
            ORDER BY i.id
            """)
    List<Inscripcion> deLaPersona(@Param("idUsuario") Long idUsuario);

    /**
     * Las preinscripciones abandonadas (P73): siguen sin señar pasado el límite
     * desde el alta. Se cuentan desde {@code fechaCreacion} y no desde el
     * vencimiento de la seña porque el límite es "tres semanas del alta", y las
     * dos fechas están a 24 hs: la diferencia no vale una segunda definición.
     */
    @Query("""
            SELECT DISTINCT i FROM Inscripcion i
            JOIN FETCH i.integrantes x JOIN FETCH x.alumno a JOIN FETCH a.usuario
            WHERE i.estado = :preinscripta AND i.fechaCreacion < :limite
            """)
    List<Inscripcion> preinscripcionesAbandonadas(
            @Param("preinscripta") EstadoInscripcion preinscripta,
            @Param("limite") OffsetDateTime limite);

    // Hasta la novena barrida acá vivían `conPlataPosiblementePendiente` y su
    // variante por persona, la segunda fuente de Deudores. Desde P84 esa cuenta
    // es `SaldoPendiente` (paquete `pago`), en SQL y para las cuatro cosas que
    // un pago salda, y la lee también el listado de Pagos.

    /**
     * Las inscripciones vigentes de un conjunto de alumnos, en una consulta.
     *
     * <p>Para "Mis alumnos" del portal del profesor, que muestra cuántas clases le
     * quedan a cada uno: pedirlo de a un alumno son treinta consultas para pintar
     * treinta números.
     *
     * <p><b>Solo las vigentes</b> —{@code ACTIVA} + {@code PAUSADA}—, la misma
     * definición que usa el listado de alumnos: lo que interesa es lo que la
     * persona está cursando, no lo que terminó el año pasado. La pausada cuenta
     * porque sigue teniendo clases debidas, que es justo al alumno que hay que ir
     * a buscar.
     *
     * <p>Desde `V35` una inscripción puede ser de varios de esos alumnos a la
     * vez: sale una sola vez ({@code DISTINCT}) con sus integrantes cargados, y
     * quien la reparte por alumno lo hace mirando la lista.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis
     */
    @Query("""
            SELECT DISTINCT i FROM Inscripcion i
            JOIN i.integrantes yo
            JOIN FETCH i.integrantes x JOIN FETCH x.alumno a JOIN FETCH a.usuario
            WHERE yo.alumno.id IN :ids AND i.estado IN :vigentes
            """)
    List<Inscripcion> vigentesDeLosAlumnos(@Param("ids") Collection<Long> ids,
            @Param("vigentes") Collection<EstadoInscripcion> vigentes);

    /**
     * La inscripción contra la que se descuenta una clase de esta disciplina
     * (`V22`, `mejoras.md` §12 · C1).
     *
     * <p>Entra por {@code id_usuario} y no por {@code id_alumno} porque un
     * participante de una reserva es un {@code usuario}: es el mismo cruce que
     * hace {@link #deLaPersona}.
     *
     * <p>Desde `V35` "la inscripción de esta persona" es <b>la de la que es
     * integrante</b>: para quien cursa en grupo, es la del grupo. Es lo que hace
     * que anotar de a uno en el calendario dé el mismo resultado que anotar al
     * grupo (P90): la inscripción resuelta ya es la compartida.
     *
     * <p>⚠️ <b>Sólo {@code ACTIVA}, y no las VIGENTES.</b> Es la diferencia que
     * hace que esto pueda devolver una sola: la regla de "una abierta por
     * disciplina" (`V35` §4 d, antes el índice de `V1`) mira ACTIVA y
     * PREINSCRIPTA, así que <b>una persona puede tener varias
     * PAUSADAS de la misma disciplina</b> —cursó, pausó, se reinscribió— y
     * "la vigente" no sería una sino tres. Elegir entre ellas en silencio es
     * exactamente el bug que C1 vino a matar, con otro disfraz.
     *
     * <p>Que un curso pausado no reciba clases es la lectura estricta de §17 ·
     * P39 (<i>"que el admin lo inscriba, para eso está"</i>) aplicada al otro
     * estado: dar una clase contra un curso pausado lo reactiva de hecho, sin que
     * nadie lo haya decidido ni firmado. El servicio lo rechaza con un mensaje
     * propio que dice justamente eso.
     */
    @Query("""
            SELECT i FROM Inscripcion i
            JOIN i.integrantes x
            JOIN x.alumno a
            JOIN a.usuario u
            WHERE u.id = :idUsuario
              AND i.disciplina = :disciplina
              AND i.estado = com.lajuanita.backend.inscripcion.EstadoInscripcion.ACTIVA
            """)
    Optional<Inscripcion> activaDeLaPersona(@Param("idUsuario") Long idUsuario,
            @Param("disciplina") Disciplina disciplina);

    /**
     * ¿Tiene el curso pausado? Sólo para el mensaje de error: sin esto, a quien
     * pausó un curso el sistema le diría "no tiene inscripción" y lo mandaría a
     * cargar una segunda.
     */
    @Query("""
            SELECT count(i) > 0 FROM Inscripcion i
            JOIN i.integrantes x
            JOIN x.alumno a
            JOIN a.usuario u
            WHERE u.id = :idUsuario
              AND i.disciplina = :disciplina
              AND i.estado = com.lajuanita.backend.inscripcion.EstadoInscripcion.PAUSADA
            """)
    boolean tienePausadaDeLaPersona(@Param("idUsuario") Long idUsuario,
            @Param("disciplina") Disciplina disciplina);
}
