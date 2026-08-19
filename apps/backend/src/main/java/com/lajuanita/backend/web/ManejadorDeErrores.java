package com.lajuanita.backend.web;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.hibernate.exception.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import com.lajuanita.backend.auth.CredencialesInvalidasException;
import com.lajuanita.backend.auth.DemasiadosIntentosException;
import com.lajuanita.backend.auth.PasswordTemporalVencidaException;
import com.lajuanita.backend.auth.SesionInvalidaException;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.OperacionNoPermitidaException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;

/**
 * Traduce las excepciones a respuestas JSON con forma estable, para que el
 * front tenga siempre el mismo lugar donde buscar el mensaje.
 *
 * <p>Se usa {@link ProblemDetail} (RFC 7807), que es el formato que Spring ya
 * emite por su cuenta para los errores que maneja él: así no conviven dos
 * formas distintas de error en la misma API.
 */
// La precedencia NO es decorativa. Al activar `spring.mvc.problemdetails.enabled`,
// Spring registra su propio @ControllerAdvice con prioridad por encima de los
// advice sin orden explícito, y se queda con MethodArgumentNotValidException:
// el 400 seguía saliendo, pero SIN el mapa `errores` que el formulario usa para
// marcar el campo equivocado. Los tests lo detectaron.
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice
public class ManejadorDeErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorDeErrores.class);

    /**
     * Nombre de constraint → mensaje para una persona.
     *
     * <p>Las reglas de este esquema están escritas en la base (55 CHECK, 2
     * EXCLUDE, 46 FK, 10 triggers) y sus constraints están nombradas con
     * cuidado justamente para esto. Sin este mapa, las 103 salían por el mismo
     * handler con el texto fijo "Ese email o ese teléfono ya están registrados":
     * el día que exista la pantalla de reservas, "esa sala ya está ocupada" le
     * llegaría a Micaela como un mensaje sobre emails.
     *
     * <p>Crece con cada módulo. Lo que no esté acá cae en un texto genérico
     * honesto, no en uno equivocado.
     */
    private static final Map<String, String> MENSAJE_POR_CONSTRAINT = Map.ofEntries(
            Map.entry("usuario_email_unico", "Ya existe una cuenta con ese email."),
            Map.entry("usuario_telefono_unico", "Ya existe una cuenta con ese teléfono."),
            Map.entry("alumno_id_usuario_key", "Esa persona ya está registrada como alumno."),
            Map.entry("reserva_sin_solapamiento", "Esa sala ya está ocupada en ese horario."),
            Map.entry("reserva_profesor_sin_solapamiento",
                    "Ese profesor ya tiene otra reserva en ese horario."),
            Map.entry("reserva_recupera_una_sola_vez",
                    "Esa clase ya tiene una recuperación cargada."),
            Map.entry("reserva_no_se_recupera_a_si_misma",
                    "Una reserva no puede ser la recuperación de sí misma."),
            Map.entry("reserva_uso_permitido_en_sala", "Esa sala no se usa para ese tipo de actividad."),
            Map.entry("reserva_horas_validas", "La hora de fin tiene que ser posterior a la de inicio."),
            Map.entry("bloqueo_sin_solapamiento", "Ya hay un bloqueo cargado para esa sala en ese período."),
            Map.entry("bloqueo_rango_fechas_valido", "La fecha de fin no puede ser anterior a la de inicio."),
            Map.entry("bloqueo_rango_horas_valido", "La hora de fin tiene que ser posterior a la de inicio."),
            Map.entry("participante_unico_por_reserva", "Esa persona ya está anotada en esa clase."),
            Map.entry("pago_tiene_destino", "El pago tiene que estar asociado a algo: una reserva, una inscripción, un trabajo o una venta."),
            Map.entry("pago_descuento_justificado", "Un descuento necesita un motivo."),
            Map.entry("pago_monto_positivo", "El monto tiene que ser mayor a cero."),
            Map.entry("pago_usd_con_cotizacion", "Un importe en dólares necesita la cotización del día."),
            Map.entry("pago_moneda_valida", "Esa moneda no existe: solo se manejan pesos y dólares."),
            Map.entry("pago_medio_valido", "Ese medio de pago no existe."),
            Map.entry("pago_estado_valido", "Ese estado de pago no existe."),
            Map.entry("pago_descuento_rango", "El descuento es un porcentaje: tiene que estar entre 0 y 100."),
            Map.entry("pago_cotizacion_positiva", "La cotización tiene que ser mayor a cero."),
            // Las dos excepciones de un pago, cada una con sus tres firmas (V7 §1).
            Map.entry("pago_anulacion_justificada", "Para anular un pago hacen falta el autor, la fecha y el motivo."),
            Map.entry("pago_comprobante_invalido_justificado", "Para invalidar un comprobante hacen falta el autor, la fecha y el motivo."),
            Map.entry("egreso_moneda_valida", "Esa moneda no existe: solo se manejan pesos y dólares."),
            Map.entry("egreso_monto_positivo", "El monto tiene que ser mayor a cero."),
            Map.entry("egreso_usd_con_cotizacion", "Un importe en dólares necesita la cotización del día."),
            Map.entry("inscripcion_usd_con_cotizacion", "Un importe en dólares necesita la cotización del día."),
            Map.entry("inscripcion_clases_positivas", "La cantidad de clases tiene que ser mayor a cero."),
            Map.entry("inscripcion_una_activa_por_disciplina",
                    "Ese alumno ya tiene una inscripción activa en esa disciplina."),
            Map.entry("solicitud_reserva_uso_permitido_en_sala",
                    "Esa sala no se usa para ese tipo de actividad."),
            Map.entry("solicitud_reserva_horas_validas",
                    "La hora de fin tiene que ser posterior a la de inicio."),
            Map.entry("solicitud_reserva_resolucion_completa",
                    "Una solicitud resuelta tiene que decir quién la resolvió y cuándo."),
            Map.entry("solicitud_reserva_aprobada_tiene_reserva",
                    "Una solicitud aprobada tiene que tener su reserva, y solo una aprobada puede tenerla."),
            Map.entry("solicitud_reserva_rechazo_explicado",
                    "Para rechazar una solicitud hay que decir por qué."),
            Map.entry("solicitud_reserva_estado_valido", "Ese estado de solicitud no existe."));

    /**
     * Postgres pone el nombre de la constraint entre comillas en el texto del
     * error, en las cuatro formas que importan: {@code violates unique
     * constraint "x"}, {@code check constraint "x"}, {@code foreign key
     * constraint "x"} y {@code exclusion constraint "x"}.
     *
     * <p>Es el plan B. El primero es preguntárselo a Hibernate, que lo trae
     * tipado; esto cubre el camino de JdbcTemplate, donde la excepción que
     * llega es la cruda del driver.
     */
    private static final Pattern NOMBRE_DE_CONSTRAINT = Pattern.compile("constraint \"([^\"]+)\"");

    /** Un {@code RAISE EXCEPTION} de plpgsql. Es el SQLSTATE de los 10 triggers. */
    private static final String ERROR_LEVANTADO_POR_UN_TRIGGER = "P0001";

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ProblemDetail credencialesInvalidas(CredencialesInvalidasException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
        problema.setTitle("No se pudo iniciar sesión");
        return problema;
    }

    /**
     * Límite de intentos superado. Misma forma que el 429 que devuelve
     * {@code FiltroDeFrecuencia} por IP, para que el cliente no tenga que
     * distinguir cuál de los dos límites se activó.
     */
    @ExceptionHandler(DemasiadosIntentosException.class)
    public ProblemDetail demasiadosIntentos(DemasiadosIntentosException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        problema.setTitle("Demasiados intentos");
        return problema;
    }

    /**
     * Contraseña temporal vencida. Es 401 como el resto de los rechazos de
     * login, pero con un mensaje propio: quien lo ve acertó la contraseña, así
     * que no hay nada que ocultarle.
     */
    @ExceptionHandler(PasswordTemporalVencidaException.class)
    public ProblemDetail passwordTemporalVencida(PasswordTemporalVencidaException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
        problema.setTitle("Contraseña vencida");
        return problema;
    }

    @ExceptionHandler(SesionInvalidaException.class)
    public ProblemDetail sesionInvalida(SesionInvalidaException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
        problema.setTitle("Sesión inválida");
        return problema;
    }

    /**
     * Email o teléfono ya usados. Va con el mapa {@code errores} igual que los
     * de validación, para que el formulario marque el campo exacto en vez de
     * mostrar un cartel general -- desde el front, un 409 y un 400 se dibujan
     * igual.
     */
    @ExceptionHandler(DatoDuplicadoException.class)
    public ProblemDetail datoDuplicado(DatoDuplicadoException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
        problema.setTitle("Dato ya registrado");
        problema.setProperty("errores", Map.of(e.getCampo(), e.getMessage()));
        return problema;
    }

    /** Reglas que cruzan varios campos, que Bean Validation no puede expresar. */
    @ExceptionHandler(SolicitudInvalidaException.class)
    public ProblemDetail solicitudInvalida(SolicitudInvalidaException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
        problema.setTitle("Datos inválidos");
        return problema;
    }

    /**
     * Última red contra las reglas que impone la base.
     *
     * <p>Dos motivos para que esto exista. El primero: {@code UsuarioService}
     * chequea el email y el teléfono antes de insertar, pero ese chequeo <b>no
     * es atómico</b> -- entre el SELECT y el INSERT puede entrar otra
     * transacción con el mismo email. Medido: seis registros simultáneos con la
     * misma dirección daban 1 éxito, 1 conflicto limpio y <b>cuatro 500</b>, y
     * no hace falta un atacante: alcanza un doble clic. Quien decide de verdad
     * es el índice único, y acá se traduce su rechazo al mismo 409 que habría
     * devuelto el chequeo previo.
     *
     * <p>El segundo: la mayor parte de las reglas de negocio de este sistema
     * vive en la base y solo puede llegar al usuario por acá. Se responde con el
     * mensaje de la constraint que falló, y el estado sale del SQLSTATE, porque
     * no son lo mismo: chocar con algo que ya existe es un conflicto (409),
     * mandar un dato que la base rechaza es un pedido mal formado (400).
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail violacionDeIntegridad(DataIntegrityViolationException e) {
        String constraint = nombreDeConstraint(e);
        // Puede no haber nombre: no todo rechazo de la base viene de una
        // constraint nombrada (un tsrange imposible, por ejemplo, es un error de
        // dato). Y `Map.of` no acepta que le pregunten por null.
        String mensaje = constraint == null ? null : MENSAJE_POR_CONSTRAINT.get(constraint);
        String estado = sqlState(e);

        boolean esChoque = "23505".equals(estado) || "23P01".equals(estado);

        if (mensaje == null) {
            // Sin traducción no se inventa una: se dice lo único que se sabe.
            // El detalle crudo va al log, no a la pantalla.
            log.warn("Violación de integridad sin mensaje propio (constraint={}, sqlstate={})",
                    constraint, estado, e);
            mensaje = esChoque
                    ? "Ese dato ya está registrado."
                    : "Esa operación no cumple una regla del sistema.";
        }

        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                esChoque ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST, mensaje);
        problema.setTitle(esChoque ? "Dato ya registrado" : "Operación rechazada");
        return problema;
    }

    /**
     * Lo que rechaza un trigger, que es donde vive lo más importante del
     * esquema: sala bloqueada, premaster liberado sin pago, estados que no
     * retroceden, historial que no se borra.
     *
     * <p>Un {@code RAISE EXCEPTION} de plpgsql llega con SQLSTATE {@code P0001},
     * que no pertenece a ninguna de las clases que Spring sabe traducir, así que
     * termina como un error sin categoría y salía <b>500</b>. Los 10 triggers
     * están escritos con mensajes redactados para que los lea una persona
     * ("La sala esta bloqueada en ese horario (reserva ...)"), y todo ese trabajo
     * se perdía entero en la traducción.
     *
     * <p>Este handler es más general que el de arriba a propósito: Spring elige
     * siempre el más específico, así que una violación de integridad sigue
     * cayendo en el otro. Acá llega el resto -- y lo que no sea un trigger sale
     * como 500, pero con cuerpo y con una línea en el log.
     */
    @ExceptionHandler(DataAccessException.class)
    public ProblemDetail errorDeLaBase(DataAccessException e) {
        if (ERROR_LEVANTADO_POR_UN_TRIGGER.equals(sqlState(e))) {
            ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                    HttpStatus.CONFLICT, mensajeDelTrigger(e));
            problema.setTitle("Operación rechazada");
            return problema;
        }

        log.error("Error de base sin traducir", e);
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "No pudimos completar la operación. Probá de nuevo.");
        problema.setTitle("Error del sistema");
        return problema;
    }

    /**
     * Reglas que dependen de sobre quién se opera, no solo de quién sos: un
     * STAFF tocando una cuenta administrativa, alguien desactivándose solo.
     */
    @ExceptionHandler(OperacionNoPermitidaException.class)
    public ProblemDetail operacionNoPermitida(OperacionNoPermitidaException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, e.getMessage());
        problema.setTitle("Operación no permitida");
        return problema;
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ProblemDetail noEncontrado(RecursoNoEncontradoException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        problema.setTitle("No encontrado");
        return problema;
    }

    /**
     * Permiso insuficiente: lo tiró un {@code @PreAuthorize}.
     *
     * <p>Sin este handler, Spring devuelve un 403 con cuerpo vacío y el front
     * no tiene nada que mostrar. El mensaje es genérico a propósito: no informa
     * qué rol haría falta.
     */
    @ExceptionHandler(AuthorizationDeniedException.class)
    public ProblemDetail permisoInsuficiente(AuthorizationDeniedException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN, "No tenés permiso para hacer esto.");
        problema.setTitle("Permiso insuficiente");
        return problema;
    }

    /**
     * Errores de Bean Validation. Devuelve además un mapa campo → mensaje para
     * que el formulario pueda marcar el input equivocado en vez de mostrar un
     * cartel general.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> porCampo = new LinkedHashMap<>();
        for (FieldError error : e.getBindingResult().getFieldErrors()) {
            porCampo.putIfAbsent(error.getField(), error.getDefaultMessage());
        }

        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Revisá los datos del formulario.");
        problema.setTitle("Datos inválidos");
        problema.setProperty("errores", porCampo);
        return problema;
    }

    // -- Los que genera Spring por su cuenta ----------------------------------

    /**
     * Cuerpo ilegible: JSON cortado, comillas sin cerrar, {@code Content-Type}
     * equivocado. Spring contesta {@code "Failed to read request"}, en inglés.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ProblemDetail cuerpoIlegible(HttpMessageNotReadableException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "No pudimos leer los datos del formulario.");
        problema.setTitle("Datos inválidos");
        return problema;
    }

    /** {@code "Method 'GET' is not supported."} */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ProblemDetail metodoNoSoportado(HttpRequestMethodNotSupportedException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.METHOD_NOT_ALLOWED, "Esa dirección no acepta este tipo de pedido.");
        problema.setTitle("Pedido no permitido");
        return problema;
    }

    /**
     * Un parámetro con el tipo equivocado: {@code /api/alumnos/abc},
     * {@code ?estado=NOEXISTE}. Spring contesta
     * {@code "Failed to convert 'estado' with value: 'NOEXISTE'"} -- en inglés y
     * nombrando parámetros internos. Se vuelve frecuente en cuanto haya filtros
     * en la URL, que es todo el calendario del Módulo 2.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ProblemDetail parametroConTipoEquivocado(MethodArgumentTypeMismatchException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Ese dato no tiene un valor válido.");
        problema.setTitle("Datos inválidos");
        return problema;
    }

    // -------------------------------------------------------------------------

    /**
     * Se le pregunta primero a Hibernate, que lo trae tipado; si no lo tiene
     * —por ejemplo cuando la excepción viene de {@code JdbcTemplate} y no de un
     * repositorio— se lee del texto del error de Postgres.
     */
    private static String nombreDeConstraint(Throwable e) {
        for (Throwable causa = e; causa != null; causa = causa.getCause()) {
            if (causa instanceof ConstraintViolationException hibernate
                    && hibernate.getConstraintName() != null) {
                return hibernate.getConstraintName();
            }
        }

        SQLException sql = errorDelDriver(e);
        if (sql == null || sql.getMessage() == null) {
            return null;
        }

        Matcher encontrado = NOMBRE_DE_CONSTRAINT.matcher(sql.getMessage());
        return encontrado.find() ? encontrado.group(1) : null;
    }

    private static String sqlState(Throwable e) {
        SQLException sql = errorDelDriver(e);
        return sql == null ? null : sql.getSQLState();
    }

    /**
     * El texto que escribió el trigger, sin el ruido que le agrega el driver.
     *
     * <p>pgjdbc arma el mensaje como {@code "ERROR: <texto>"} seguido de las
     * líneas de contexto ({@code Where: PL/pgSQL function ...}), que nombran
     * funciones internas y no le sirven a nadie del otro lado de la pantalla.
     */
    private static String mensajeDelTrigger(Throwable e) {
        SQLException sql = errorDelDriver(e);
        if (sql == null || sql.getMessage() == null) {
            return "Esa operación no cumple una regla del sistema.";
        }

        String primeraLinea = sql.getMessage().lines().findFirst().orElse("").trim();
        return primeraLinea.replaceFirst("^ERROR:\\s*", "");
    }

    private static SQLException errorDelDriver(Throwable e) {
        for (Throwable causa = e; causa != null; causa = causa.getCause()) {
            if (causa instanceof SQLException sql) {
                return sql;
            }
        }
        return null;
    }
}
