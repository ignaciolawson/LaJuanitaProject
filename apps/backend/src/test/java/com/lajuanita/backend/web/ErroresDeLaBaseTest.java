package com.lajuanita.backend.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Que las reglas que impone la base lleguen a la pantalla como algo que se
 * puede leer.
 *
 * <p>Antes no llegaban. Los 55 CHECK, los 2 EXCLUDE y las 46 FK salían todos por
 * el mismo handler, con el texto fijo <i>"Ese email o ese teléfono ya están
 * registrados"</i>; y los 10 triggers —donde vive lo más importante: sala
 * bloqueada, premaster liberado sin pago, historial que no se borra— salían
 * como <b>500</b>, porque el SQLSTATE {@code P0001} de plpgsql no pertenece a
 * ninguna de las clases que Spring sabe traducir.
 *
 * <p>Hoy no se nota: los únicos endpoints que escriben tocan {@code usuario} y
 * {@code alumno}, donde la única violación alcanzable es la de email o teléfono
 * repetido, así que el mensaje fijo acertaba de casualidad. El primer endpoint
 * que escriba en {@code reserva} —el Módulo 2, que es el corazón operativo— lo
 * vuelve visible de golpe y en operaciones diarias, no de borde. Por eso este
 * test provoca los errores contra la base de verdad, sin esperar a que exista
 * la pantalla.
 *
 * <p>Se le pasa la excepción al manejador directamente en vez de llamar un
 * endpoint, justamente porque el endpoint todavía no existe.
 */
@SpringBootTest
@Transactional
class ErroresDeLaBaseTest {

    /**
     * Cada caso provoca UN error y no vuelve a tocar la base: en Postgres, un
     * statement que falla aborta la transacción entera y todo lo que venga
     * después falla por arrastre. Lo que quedó escrito se descarta con el
     * rollback del test.
     */
    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private UsuarioRepository usuarios;

    private final ManejadorDeErrores manejador = new ManejadorDeErrores();

    // -- Triggers: lo que salía 500 -------------------------------------------

    @Test
    void una_sala_bloqueada_contesta_el_mensaje_del_trigger_y_no_un_500() {
        jdbc.update("""
                INSERT INTO bloqueo_sala (id_sala, fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo)
                VALUES (2, DATE '2027-03-01', DATE '2027-03-10', TIME '09:00', TIME '13:00', 'Mantenimiento')
                """);

        DataAccessException error = catchThrowableOfType(DataAccessException.class, () -> jdbc.update("""
                INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin)
                VALUES (2, 1, DATE '2027-03-05', TIME '10:00', TIME '11:00')
                """));

        ProblemDetail problema = manejador.errorDeLaBase(error);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problema.getDetail())
                .startsWith("La sala esta bloqueada en ese horario")
                // El "Where: PL/pgSQL function ..." que agrega el driver no es
                // asunto de quien está del otro lado de la pantalla.
                .doesNotContain("PL/pgSQL")
                .doesNotContain("ERROR:");
    }

    // -- EXCLUDE y CHECK: lo que salía como "email duplicado" -----------------

    @Test
    void dos_reservas_solapadas_hablan_de_la_sala_y_no_del_email() {
        jdbc.update("""
                INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin)
                VALUES (1, 1, DATE '2027-04-06', TIME '18:00', TIME '19:30')
                """);

        DataIntegrityViolationException error = catchThrowableOfType(
                DataIntegrityViolationException.class, () -> jdbc.update("""
                        INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin)
                        VALUES (1, 1, DATE '2027-04-06', TIME '19:00', TIME '20:00')
                        """));

        ProblemDetail problema = manejador.violacionDeIntegridad(error);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problema.getDetail()).isEqualTo("Esa sala ya está ocupada en ese horario.");
    }

    /**
     * Un CHECK no es un choque: es un dato mal mandado. Por eso sale 400 y no
     * 409, que es la distinción que el handler único no podía hacer.
     */
    @Test
    void un_check_violado_sale_como_pedido_invalido_y_no_como_conflicto() {
        DataIntegrityViolationException error = catchThrowableOfType(
                DataIntegrityViolationException.class, () -> jdbc.update("""
                        INSERT INTO bloqueo_sala (id_sala, fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo)
                        VALUES (1, DATE '2027-05-03', DATE '2027-05-04', TIME '13:00', TIME '09:00', 'Mal cargado')
                        """));

        ProblemDetail problema = manejador.violacionDeIntegridad(error);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(problema.getDetail())
                .isEqualTo("La hora de fin tiene que ser posterior a la de inicio.");
    }

    /**
     * No toda negativa de la base viene de una constraint con nombre: un
     * {@code tsrange} imposible es un error de dato y llega sin nada que buscar
     * en el mapa. Lo que importa es que en ese caso el mensaje sea honesto en
     * vez de equivocado — antes decía "Ese email o ese teléfono ya están
     * registrados" para cualquier cosa.
     */
    @Test
    void un_rechazo_sin_traduccion_no_miente_hablando_de_emails() {
        DataIntegrityViolationException error = catchThrowableOfType(
                DataIntegrityViolationException.class, () -> jdbc.update("""
                        INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin)
                        VALUES (1, 1, DATE '2027-04-07', TIME '20:00', TIME '19:00')
                        """));

        ProblemDetail problema = manejador.violacionDeIntegridad(error);

        assertThat(problema.getDetail())
                .isEqualTo("Esa operación no cumple una regla del sistema.")
                .doesNotContain("email");
    }

    // -- El caso que hoy sí es alcanzable -------------------------------------

    /**
     * La carrera que documenta el propio handler: el chequeo previo de
     * {@code UsuarioService} no es atómico y el índice único es quien decide.
     * Acá la excepción llega por el camino de Hibernate, no por el de
     * {@code JdbcTemplate}, así que además prueba que el nombre de la constraint
     * se saca bien de los dos lados.
     */
    @Test
    void un_email_repetido_dice_email_y_no_un_texto_generico() {
        String email = "choque-" + UUID.randomUUID() + "@lajuanita.local";
        usuarios.saveAndFlush(nuevo(email));

        DataIntegrityViolationException error = catchThrowableOfType(
                DataIntegrityViolationException.class, () -> usuarios.saveAndFlush(nuevo(email)));

        ProblemDetail problema = manejador.violacionDeIntegridad(error);

        assertThat(problema.getStatus()).isEqualTo(HttpStatus.CONFLICT.value());
        assertThat(problema.getDetail()).isEqualTo("Ya existe una cuenta con ese email.");
    }

    private Usuario nuevo(String email) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Choque");
        usuario.setApellido("Unicidad");
        usuario.setEmail(email);
        usuario.setPasswordHash("$2a$10$noSeUsaEnEsteTest000000000000000000000000000000000000");
        usuario.setRol(Rol.USUARIO);
        return usuario;
    }
}
