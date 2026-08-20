package com.lajuanita.backend.aviso;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.aviso.dto.ResumenDeAvisos;
import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * El disparador automático de avisos.
 *
 * <p><b>La pregunta de esta suite es la que los tres módulos dejaron escrita sin
 * contestar: ¿qué pasa si corre dos veces el mismo día?</b> El Módulo 4, el 6 y el
 * 7 anotaron por separado que hacía falta un scheduler <i>"y decidir qué pasa si
 * corre dos veces el mismo día"</i>, y esa es la única parte de esto que no es
 * obvia: mandar un aviso es fácil, no mandarlo dos veces es el trabajo.
 *
 * <p>Por eso los casos vienen de a pares, como {@code PortalTest} y
 * {@code DocenciaTest}: uno prueba que el aviso sale, el que va al lado prueba que
 * no sale de nuevo. Un aviso duplicado no rompe nada —la pantalla anda, el sistema
 * no falla— y lo único que hace es que la bandeja se vuelva ruido y deje de
 * leerse, que es la forma más silenciosa de perder el aviso que sí importaba.
 *
 * <p><b>Los casos NO esperan al reloj.</b> Llaman a {@code generar()} a mano. El
 * cron está apagado durante {@code mvn test} desde la configuración de surefire, y
 * una suite que esperara a que Spring dispare una tarea o tarda minutos o pasa sin
 * haber probado nada.
 *
 * <p><b>Y ninguno cuenta filas globales.</b> Estos casos corren contra la base de
 * desarrollo, que ya tiene deudas y trabajos propios: un {@code count(*)} sobre
 * {@code notificacion} mediría el estado de esa base y no lo que hizo el caso. Todo
 * se afirma contra la clave del hecho que el caso mismo creó.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AvisosTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private AvisoService avisos;
    @Autowired private NotificacionService notificaciones;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    // == La pregunta del módulo: correr dos veces =============================

    /**
     * <b>El caso central.</b> Dos corridas el mismo día sobre el mismo hecho: un
     * aviso, no dos. Y el resumen de la segunda lo dice en vez de callárselo —
     * "cero escritos, uno omitido" es cómo se distingue una corrida que no
     * encontró nada de una que encontró lo mismo de ayer.
     */
    @Test
    void correr_dos_veces_el_mismo_dia_no_duplica_el_aviso() {
        Usuario staff = crear(Rol.STAFF);
        Usuario deudor = crear(Rol.USUARIO);
        String clave = deudaVencidaDe(deudor, 15);

        avisos.generar();
        em.flush();
        assertThat(avisosCon(clave, staff)).isEqualTo(1);

        ResumenDeAvisos segunda = avisos.generar();
        em.flush();

        assertThat(avisosCon(clave, staff)).isEqualTo(1);
        assertThat(segunda.avisosOmitidos()).isGreaterThan(0);
    }

    /**
     * <b>Y esto es lo que de verdad lo garantiza.</b> El servicio filtra antes de
     * escribir, pero filtrar es una pregunta y entre la pregunta y el insert se
     * puede meter otra corrida — es el agujero exacto que tenía el chequeo de email
     * duplicado en {@code UsuarioService}, donde seis registros simultáneos de la
     * misma dirección produjeron cuatro 500. Acá el que no se puede colar es el
     * índice único parcial de `V17`, y este caso lo ataca por abajo del servicio,
     * con SQL directo, que es la única forma de simular esa carrera.
     */
    @Test
    void la_base_rechaza_el_aviso_repetido_aunque_el_servicio_no_mire() {
        Usuario staff = crear(Rol.STAFF);
        Usuario deudor = crear(Rol.USUARIO);
        String clave = deudaVencidaDe(deudor, 15);

        avisos.generar();
        em.flush();

        assertThatThrownBy(() -> {
            jdbc.update("""
                    INSERT INTO notificacion (id_usuario_destino, tipo, titulo, contenido, clave_evento)
                    VALUES (?, 'DEUDA_VENCIDA', 'repetido', 'repetido', ?)
                    """, staff.getId(), clave);
        }).isInstanceOf(DataIntegrityViolationException.class);
    }

    /**
     * <b>La contracara, y es la que justifica que el índice sea parcial.</b> Los
     * avisos que escribe una persona al resolver algo no llevan clave, y dos
     * parecidos son dos hechos distintos: si administración aprueba dos pedidos de
     * la misma persona, tiene que enterarse de los dos. Un índice único sin el
     * {@code WHERE clave_evento IS NOT NULL} —o una clave puesta "por las dudas" en
     * estos avisos— se comería el segundo.
     */
    @Test
    void los_avisos_que_escribe_una_persona_no_se_deduplican() {
        Usuario destino = crear(Rol.USUARIO);

        notificaciones.avisar(destino, TipoNotificacion.SOLICITUD_APROBADA,
                "Tu pedido fue aprobado", "El lunes a las 10", "/mis-reservas");
        notificaciones.avisar(destino, TipoNotificacion.SOLICITUD_APROBADA,
                "Tu pedido fue aprobado", "El martes a las 10", "/mis-reservas");
        em.flush();

        Integer cuantos = jdbc.queryForObject("""
                SELECT count(*) FROM notificacion
                 WHERE id_usuario_destino = ? AND clave_evento IS NULL
                """, Integer.class, destino.getId());

        assertThat(cuantos).isEqualTo(2);
    }

    /**
     * <b>Deduplicar no es "avisar una sola vez y nunca más".</b> Si la deuda se
     * salda y meses después vuelve, es otro hecho y tiene que volver a avisar. Es
     * la razón por la que la clave se arma con los datos del hecho —acá, la fecha
     * del renglón más viejo— y no con la fecha de la corrida: con una clave por
     * corrida esto avisaría todos los días, y con una clave sin fecha no avisaría
     * nunca más.
     */
    @Test
    void una_deuda_nueva_de_la_misma_persona_vuelve_a_avisar() {
        Usuario staff = crear(Rol.STAFF);
        Usuario deudor = crear(Rol.USUARIO);

        String primera = deudaVencidaDe(deudor, 40);
        avisos.generar();
        em.flush();
        assertThat(avisosCon(primera, staff)).isEqualTo(1);

        // La vieja se cobra y aparece otra, con otra antigüedad.
        jdbc.update("UPDATE pago SET estado_pago = 'PAGADO' WHERE id_usuario = ?", deudor.getId());
        String segunda = deudaVencidaDe(deudor, 12);
        avisos.generar();
        em.flush();

        assertThat(segunda).isNotEqualTo(primera);
        assertThat(avisosCon(segunda, staff)).isEqualTo(1);
    }

    // == El estado que nadie escribía nunca ===================================

    /**
     * <b>{@code VENCIDO} existía en el CHECK de `V1` desde el primer día y ninguna
     * línea del sistema lo escribía.</b> Tiene su índice, el enum lo documenta como
     * <i>"§6, alerta automática"</i>, {@code ADEUDADOS} lo cuenta — y la única forma
     * de que una fila llegara ahí era que alguien lo eligiera a mano en el
     * desplegable. Nadie lo notó porque la pantalla de deudores recalcula los días
     * al vuelo: se veía bien y el dato guardado no lo estaba.
     */
    @Test
    void una_deuda_de_mas_de_siete_dias_queda_marcada_vencida() {
        Usuario deudor = crear(Rol.USUARIO);
        long pago = pagoAdeudado(deudor, 15);

        avisos.generar();

        assertThat(estadoDe(pago)).isEqualTo("VENCIDO");
    }

    /** El par de al lado: la deuda de anteayer sigue siendo deuda y no está vencida. */
    @Test
    void una_deuda_reciente_no_se_marca_vencida() {
        Usuario deudor = crear(Rol.USUARIO);
        long pago = pagoAdeudado(deudor, 2);

        avisos.generar();

        assertThat(estadoDe(pago)).isEqualTo("DEBE");
    }

    /** Y no toca nada más: un pago anulado no vuelve a la deuda por ser viejo. */
    @Test
    void un_pago_anulado_no_lo_toca_por_mas_viejo_que_sea() {
        Usuario deudor = crear(Rol.USUARIO);
        long pago = pagoAdeudado(deudor, 90);
        jdbc.update("""
                UPDATE pago SET estado_pago = 'ANULADO', id_usuario_anula = ?,
                                fecha_anulacion = now(), motivo_anulacion = 'cargado mal'
                 WHERE id_pago = ?
                """, deudor.getId(), pago);

        avisos.generar();

        assertThat(estadoDe(pago)).isEqualTo("ANULADO");
    }

    // == A quién le llega =====================================================

    /**
     * <b>El aviso va a administración, no a quien debe.</b> La deuda la persigue el
     * estudio: la pantalla de deudores es administrativa, y este aviso es su versión
     * que va a buscar a la persona en vez de esperar a que abra la pantalla.
     */
    @Test
    void el_aviso_de_deuda_le_llega_a_administracion_y_no_al_deudor() {
        Usuario staff = crear(Rol.STAFF);
        Usuario deudor = crear(Rol.USUARIO);
        String clave = deudaVencidaDe(deudor, 15);

        avisos.generar();
        em.flush();

        assertThat(avisosCon(clave, staff)).isEqualTo(1);
        assertThat(avisosCon(clave, deudor)).isZero();
    }

    /**
     * <b>{@code DIRECTIVO} ve todas las pantallas y no escribe ninguna fila</b>
     * (§2.1), así que un aviso de "cobrale a este" le llegaría para no poder
     * hacerlo. Es la misma línea que traza {@code @PuedeOperar}, aplicada al único
     * lugar del backend donde hay que ELEGIR gente en vez de verificar a alguien.
     */
    @Test
    void el_directivo_no_recibe_avisos_de_cobranza() {
        Usuario directivo = crear(Rol.DIRECTIVO);
        String clave = deudaVencidaDe(crear(Rol.USUARIO), 15);

        avisos.generar();
        em.flush();

        assertThat(avisosCon(clave, directivo)).isZero();
    }

    /** Una cuenta dada de baja no junta avisos: `usuario.activo = FALSE` saca en el acto. */
    @Test
    void una_cuenta_desactivada_no_recibe_avisos() {
        Usuario staff = crear(Rol.STAFF);
        jdbc.update("UPDATE usuario SET activo = FALSE WHERE id_usuario = ?", staff.getId());
        String clave = deudaVencidaDe(crear(Rol.USUARIO), 15);

        avisos.generar();
        em.flush();

        assertThat(avisosCon(clave, staff)).isZero();
    }

    // == Mix & Mastering: entregado y sin cobrar ==============================

    /**
     * §9 — <i>"alerta si pasan más de 7 días desde la entrega sin pago"</i>. Es el
     * <i>"básicamente estoy fiando el servicio"</i> visto desde el otro lado:
     * mientras el premaster está retenido la regla se sostiene sola, y desde que se
     * libera lo único que queda es acordarse de cobrar.
     */
    @Test
    void una_entrega_impaga_de_mas_de_siete_dias_avisa() {
        Usuario staff = crear(Rol.STAFF);
        long trabajo = trabajoEntregado("ENTREGADO", 20);

        avisos.generar();
        em.flush();

        assertThat(avisosCon("ENTREGA_IMPAGA:t=" + trabajo + ":entrega="
                + LocalDate.now().minusDays(20), staff)).isEqualTo(1);
    }

    /**
     * <b>"Sin cobrar" es "el estado no es {@code PAGADO}", y no es un atajo.</b> Es
     * la definición que el módulo ya tiene: {@code MasteringService} mueve el
     * trabajo a {@code PAGADO} justo cuando lo cobrado en la moneda del trabajo
     * alcanza el precio. Rehacer acá la suma de pagos sería una segunda definición
     * de lo mismo, que es como {@code contarClasesConsumidas} terminó pudiendo
     * contradecir a `V9` §5.
     */
    @Test
    void un_trabajo_ya_pagado_no_avisa() {
        Usuario staff = crear(Rol.STAFF);
        long trabajo = trabajoEntregado("PAGADO", 20);

        avisos.generar();
        em.flush();

        assertThat(avisosCon("ENTREGA_IMPAGA:t=" + trabajo + ":entrega="
                + LocalDate.now().minusDays(20), staff)).isZero();
    }

    /** Ni el cancelado, que no se entregó nunca. */
    @Test
    void un_trabajo_cancelado_no_avisa() {
        Usuario staff = crear(Rol.STAFF);
        long trabajo = trabajoEntregado("CANCELADO", 20);

        avisos.generar();
        em.flush();

        assertThat(avisosCon("ENTREGA_IMPAGA:t=" + trabajo + ":entrega="
                + LocalDate.now().minusDays(20), staff)).isZero();
    }

    /** Ni el de anteayer: el aviso es a los 7 días, no al entregar. */
    @Test
    void una_entrega_de_anteayer_no_avisa() {
        Usuario staff = crear(Rol.STAFF);
        long trabajo = trabajoEntregado("ENTREGADO", 2);

        avisos.generar();
        em.flush();

        assertThat(avisosCon("ENTREGA_IMPAGA:t=" + trabajo + ":entrega="
                + LocalDate.now().minusDays(2), staff)).isZero();
    }

    // == La corrida a mano ====================================================

    /**
     * Existe porque un proceso que solo se dispara solo no se puede verificar: con
     * la bandeja vacía hay dos explicaciones —no hay nada que avisar, o el cron dejó
     * de correr— y sin esto no se distinguen sin entrar al servidor.
     */
    @Test
    void administracion_puede_correr_los_avisos_a_mano() throws Exception {
        mvc.perform(post("/api/avisos/ejecutar")
                .header("Authorization", credencialPara(crear(Rol.STAFF))))
                .andExpect(status().isOk());
    }

    @Test
    void un_usuario_comun_no_puede_correr_los_avisos() throws Exception {
        mvc.perform(post("/api/avisos/ejecutar")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /** Escribe filas, así que no alcanza con poder leer administración. */
    @Test
    void un_directivo_no_puede_correr_los_avisos() throws Exception {
        mvc.perform(post("/api/avisos/ejecutar")
                .header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    /** Deja una deuda vieja y devuelve la clave con la que se la va a avisar. */
    private String deudaVencidaDe(Usuario deudor, int dias) {
        pagoAdeudado(deudor, dias);
        return "DEUDA:u=%d:ARS:desde=%s".formatted(deudor.getId(), LocalDate.now().minusDays(dias));
    }

    /**
     * Un pago adeudado, colgado de un trabajo de M&M en {@code A_CONFIRMAR}.
     *
     * <p>El destino es obligatorio —{@code pago_tiene_destino} exige exactamente
     * uno— y se elige un trabajo sin entregar a propósito: así el fixture de la
     * deuda no dispara además el aviso de entrega impaga y cada caso mide una cosa.
     */
    private long pagoAdeudado(Usuario deudor, int dias) {
        long trabajo = trabajoDe("A_CONFIRMAR", null);

        return jdbc.queryForObject("""
                INSERT INTO pago (id_usuario, id_trabajo_mastering, monto, moneda, medio_pago,
                                  estado_pago, fecha_pago)
                VALUES (?, ?, 50000, 'ARS', 'TRANSFERENCIA', 'DEBE', ?)
                RETURNING id_pago
                """, Long.class, deudor.getId(), trabajo, LocalDate.now().minusDays(dias));
    }

    private long trabajoEntregado(String estado, int diasDesdeLaEntrega) {
        return trabajoDe(estado, LocalDate.now().minusDays(diasDesdeLaEntrega));
    }

    private long trabajoDe(String estado, LocalDate entrega) {
        return jdbc.queryForObject("""
                INSERT INTO trabajo_mastering (nombre_cliente_externo, tipo_trabajo, nombre_track,
                                               precio_acordado, moneda, estado, fecha_entrega_real)
                VALUES (?, 'MIX_MASTER', 'Tema de prueba', 150.00, 'USD', ?, ?)
                RETURNING id_trabajo
                """, Long.class, "Cliente " + UUID.randomUUID(), estado, entrega);
    }

    private int avisosCon(String clave, Usuario destino) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM notificacion
                 WHERE clave_evento = ? AND id_usuario_destino = ?
                """, Integer.class, clave, destino.getId());
    }

    private String estadoDe(long pago) {
        return jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_pago = ?", String.class, pago);
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Avisos" + rol.name());
        usuario.setEmail("avisos-" + UUID.randomUUID() + "@lajuanita.local");
        usuario.setPasswordHash("$2a$10$noSeUsaEnEsteTest000000000000000000000000000000000000");
        usuario.setRol(rol);
        return usuarios.save(usuario);
    }

    private String credencialPara(Usuario usuario) {
        Instant ahora = Instant.now();
        JwtClaimsSet reclamos = JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(3600))
                .subject(String.valueOf(usuario.getId()))
                .claim("rol", usuario.getRol().name())
                .build();

        return "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }
}
