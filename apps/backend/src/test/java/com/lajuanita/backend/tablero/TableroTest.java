package com.lajuanita.backend.tablero;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 8 — el tablero de dirección.
 *
 * <p>Lo que se prueba acá no son reglas de la base sino <b>cuentas</b>, y las
 * cuentas se equivocan distinto: no tiran error, dan otro número. Un tablero roto
 * se ve perfecto. Por eso los casos apuntan a las cuatro formas concretas que
 * tiene este tablero de mentir sin que falle nada:
 *
 * <ol>
 *   <li><b>Que una categoría sin datos desaparezca</b> en vez de salir en cero.
 *       Ausente se lee como "el sistema perdió el dato"; cero dice lo que pasó.</li>
 *   <li><b>Que la seña de una clase caiga en la línea equivocada</b> y el tablero
 *       diga que el estudio factura por alquiler lo que cobró por enseñar.</li>
 *   <li><b>Que las clases de un curso cuenten como servicios contratados</b> y la
 *       retención dé casi 100%: todo alumno quedaría "retenido" a la semana de
 *       empezar.</li>
 *   <li><b>Que un indicador de foto se filtre por el período</b> y una deuda de
 *       marzo desaparezca al mirar agosto — justo la plata que hay que ir a
 *       buscar.</li>
 * </ol>
 *
 * <p>Los casos que miran totales toman una <b>línea de base primero</b> y comparan
 * contra ella, en vez de afirmar números absolutos. El tablero agrega todo lo que
 * hay en la base sin filtrar por período en varios indicadores, así que un número
 * absoluto sería una prueba que pasa hoy y falla la próxima vez que alguien cargue
 * un dato de demo. Donde sí se puede aislar —los ingresos y la ocupación, que son
 * del período— se usa un año propio, 2029, igual que las otras suites.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TableroTest {

    private static final LocalDate LUNES = LocalDate.of(2029, 4, 2);
    private static final LocalDate DESDE = LUNES.minusDays(7);
    private static final LocalDate HASTA = LUNES.plusDays(7);

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private AlumnoRepository alumnos;

    @Autowired
    private InscripcionRepository inscripciones;

    @Autowired
    private SalaRepository salas;

    @Autowired
    private TipoUsoRepository tiposDeUso;

    @Autowired
    private JdbcTemplate jdbc;

    private Long sala1;
    private Long claseDj;
    private Long alquiler;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        claseDj = idDeTipo("CLASE_DJ");
        alquiler = idDeTipo("ALQUILER_CABINA");
    }

    // == Cero y no vacío ======================================================

    /**
     * §11: <i>"sin datos en el período ⇒ muestra cero, no vacío"</i>. Es la regla
     * que atraviesa el módulo entero y la que primero se rompe cuando alguien
     * agrega un indicador nuevo devolviendo lo que trajo la consulta.
     */
    @Test
    void un_periodo_entero_vacio_devuelve_las_dos_monedas_y_las_seis_lineas() throws Exception {
        tablero()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ingresos.length()").value(12))
                .andExpect(jsonPath("$.ingresos[?(@.moneda == 'USD' && @.linea == 'VENTA_EQUIPOS')].monto")
                        .value(0.00))
                .andExpect(jsonPath("$.pendientes.length()").value(2));
    }

    /** Las tres disciplinas siempre, aunque ninguna tenga a nadie cursando. */
    @Test
    void las_tres_disciplinas_aparecen_aunque_no_tengan_alumnos() throws Exception {
        tablero()
                .andExpect(jsonPath("$.alumnos[?(@.disciplina == 'DJ')]").isNotEmpty())
                .andExpect(jsonPath("$.alumnos[?(@.disciplina == 'PRODUCCION')]").isNotEmpty())
                .andExpect(jsonPath("$.alumnos[?(@.disciplina == 'MENTORIA')]").isNotEmpty());
    }

    /** Todos los estados de M&M y del sello, aunque no exista ninguna fila. */
    @Test
    void los_estados_salen_completos_aunque_no_haya_nada_en_ellos() throws Exception {
        tablero()
                .andExpect(jsonPath("$.mixMastering.porEstado.length()").value(6))
                .andExpect(jsonPath("$.sello.porEstado.length()").value(5))
                .andExpect(jsonPath("$.mixMastering.porEstado[?(@.estado == 'CANCELADO')].cantidad")
                        .exists());
    }

    /**
     * <b>La grilla de ocupación cubre el horario del estudio aunque no haya
     * nada.</b> Sin este piso, un período tranquilo devolvería dos filas y la
     * pantalla mostraría un estudio que abre a las 15 — el tipo de conclusión
     * equivocada que un tablero tiene prohibido inducir.
     */
    @Test
    void la_grilla_cubre_el_horario_del_estudio_en_un_periodo_sin_reservas() throws Exception {
        tablero()
                .andExpect(jsonPath("$.ocupacion.horas.length()").value(8))
                .andExpect(jsonPath("$.ocupacion.horas[0]").value(10))
                .andExpect(jsonPath("$.ocupacion.horas[7]").value(17))
                // 7 días × 8 horas, todas dibujadas.
                .andExpect(jsonPath("$.ocupacion.franjas.length()").value(56));
    }

    /** Y se estira si algo cayó afuera: una clase a las 20 tiene que verse. */
    @Test
    void la_grilla_se_estira_cuando_hubo_una_reserva_fuera_de_horario() throws Exception {
        reservar(sala1, claseDj, LUNES, "20:00", "21:30");

        tablero()
                .andExpect(jsonPath("$.ocupacion.horas[-1:]").value(20))
                .andExpect(jsonPath("$.ocupacion.franjas[?(@.dia == 1 && @.hora == 20)].reservas")
                        .value(1));
    }

    // == Ingresos por línea de negocio ========================================

    /**
     * <b>El caso que decide el indicador entero.</b> Una reserva puede ser dos
     * negocios distintos, así que la línea de una seña sale del tipo de uso de su
     * reserva. Sin ese cruce, la seña de una clase caería en alquiler de cabina y
     * el tablero diría que el estudio factura por alquilar lo que cobró por
     * enseñar.
     */
    @Test
    void la_sena_de_una_clase_es_plata_de_cursos_y_la_de_un_alquiler_no() throws Exception {
        Usuario quien = crear(Rol.USUARIO);
        long clase = idDeReserva(reservar(sala1, claseDj, LUNES, "10:00", "11:30"));
        long cabina = idDeReserva(reservar(sala1, alquiler, LUNES, "14:00", "18:00"));

        pagarReserva(quien, clase, "5000");
        pagarReserva(quien, cabina, "9000");

        tablero()
                .andExpect(jsonPath("$.ingresos[?(@.moneda == 'ARS' && @.linea == 'CURSOS')].monto")
                        .value(5000.00))
                .andExpect(jsonPath("$.ingresos[?(@.moneda == 'ARS' && @.linea == 'ALQUILER_CABINA')].monto")
                        .value(9000.00));
    }

    /** Un pago contra una inscripción es plata de cursos sin mirar ninguna sala. */
    @Test
    void un_pago_de_inscripcion_cae_en_cursos() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno);

        pagarInscripcion(alumno.getUsuario(), curso.getId(), "80000");

        tablero()
                .andExpect(jsonPath("$.ingresos[?(@.moneda == 'ARS' && @.linea == 'CURSOS')].monto")
                        .value(80000.00));
    }

    /**
     * <b>Una deuda anotada no es un ingreso.</b> Es la lección de {@code V12}
     * escrita del lado del tablero: el conjunto es {@code ENTRARON}
     * ({@code SENADO + PAGADO}), no "todo lo que no está anulado" —
     * {@code DEBE} y {@code VENCIDO} son justamente plata que se esperaba y no
     * llegó.
     */
    @Test
    void una_deuda_anotada_no_suma_a_los_ingresos() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":70000,"moneda":"ARS",
                 "medioPago":"EFECTIVO","estadoPago":"DEBE","fechaPago":"%s"}
                """.formatted(alumno.getUsuario().getId(), curso.getId(), LUNES)))
                .andExpect(status().isCreated());

        tablero()
                .andExpect(jsonPath("$.ingresos[?(@.moneda == 'ARS' && @.linea == 'CURSOS')].monto")
                        .value(0.00));
    }

    /**
     * <b>La caja del tablero es la misma cuenta del Módulo 3, no una nueva.</b>
     * Este caso existe para que la copia no se pueda introducir después: si
     * alguien reescribe la suma adentro del tablero, los dos números se separan y
     * acá se ve.
     */
    @Test
    void la_caja_del_tablero_es_la_misma_que_la_del_modulo_3() throws Exception {
        Alumno alumno = alumnoNuevo();
        pagarInscripcion(alumno.getUsuario(), inscripcionDe(alumno).getId(), "123456");

        String enElTablero = mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", comoAdmin()))
                .andReturn().getResponse().getContentAsString();
        String enLaCaja = mvc.perform(get("/api/pagos/caja?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", comoAdmin()))
                .andReturn().getResponse().getContentAsString();

        assertThat(enElTablero).contains(enLaCaja.substring(1, enLaCaja.length() - 1));
    }

    // == Ocupación ============================================================

    /**
     * Una clase de 10:00 a 11:30 cuenta en la franja de las 10 y suma su hora y
     * media ahí. <b>No se reparte entre dos franjas</b>, y por eso la columna se
     * llama {@code horasReservadas} y la pantalla dice "reservas que empiezan".
     */
    @Test
    void una_reserva_cuenta_en_la_franja_en_que_empieza() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");

        tablero()
                .andExpect(jsonPath("$.ocupacion.franjas[?(@.dia == 1 && @.hora == 10)].reservas").value(1))
                .andExpect(jsonPath("$.ocupacion.franjas[?(@.dia == 1 && @.hora == 10)].horasReservadas")
                        .value(1.50))
                .andExpect(jsonPath("$.ocupacion.franjas[?(@.dia == 1 && @.hora == 11)].reservas").value(0));
    }

    /** El día ISO: lunes 1, domingo 7. La grilla se dibuja de lunes a domingo. */
    @Test
    void el_domingo_es_el_dia_siete() throws Exception {
        reservar(sala1, alquiler, LUNES.plusDays(6), "12:00", "14:00");

        tablero()
                .andExpect(jsonPath("$.ocupacion.franjas[?(@.dia == 7 && @.hora == 12)].reservas").value(1));
    }

    // == Cobros pendientes: foto, no período ==================================

    /**
     * <b>Una deuda de fuera del período sigue apareciendo.</b> Si se filtrara,
     * mirar el tablero de agosto haría desaparecer lo que se debe desde marzo —
     * que es precisamente la plata que hay que ir a buscar.
     */
    @Test
    void la_deuda_de_otro_periodo_igual_se_ve() throws Exception {
        BigDecimal antes = pendienteEnPesos();

        Alumno alumno = alumnoNuevo();
        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":45000,"moneda":"ARS",
                 "medioPago":"EFECTIVO","estadoPago":"DEBE","fechaPago":"%s"}
                """.formatted(alumno.getUsuario().getId(), inscripcionDe(alumno).getId(),
                HASTA.plusDays(200))))
                .andExpect(status().isCreated());

        assertThat(pendienteEnPesos()).isEqualByComparingTo(antes.add(new BigDecimal("45000")));
    }

    // == Retención ============================================================

    /**
     * <b>El caso que sostiene el indicador.</b> Una inscripción de DJ son ocho
     * clases; si cada clase contara como un servicio contratado, todo alumno
     * quedaría retenido a la semana de empezar y la tasa daría casi 100%. Las
     * participaciones que cuelgan de una inscripción ya están representadas por
     * esa inscripción.
     */
    @Test
    void las_clases_de_un_curso_no_cuentan_como_servicios_contratados() throws Exception {
        long[] antes = retencion();

        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionViejaDe(alumno);
        for (int semana = 0; semana < 8; semana++) {
            claseDelCurso(alumno, curso, LocalDate.now().minusMonths(19).plusWeeks(semana));
        }

        long[] despues = retencion();
        assertThat(despues[0]).isEqualTo(antes[0] + 1);   // entra al denominador
        assertThat(despues[1]).isEqualTo(antes[1]);       // y NO cuenta como retenido
    }

    /** Un segundo curso dentro de la ventana sí es retención. */
    @Test
    void un_segundo_servicio_dentro_de_los_diez_meses_es_retencion() throws Exception {
        long[] antes = retencion();

        Alumno alumno = alumnoNuevo();
        inscripcionViejaDe(alumno);
        segundaInscripcion(alumno, LocalDate.now().minusMonths(15));

        long[] despues = retencion();
        assertThat(despues[0]).isEqualTo(antes[0] + 1);
        assertThat(despues[1]).isEqualTo(antes[1] + 1);
    }

    /**
     * <b>Quien contrató hace poco no entra al denominador</b>, ni como perdido ni
     * como retenido: su ventana de 10 meses sigue abierta. Es la trampa anotada en
     * §15 — si entrara, la tasa bajaría sola cada vez que el estudio suma gente y
     * <b>crecer se leería como empeorar</b>.
     */
    @Test
    void quien_contrato_hace_tres_meses_no_entra_al_denominador() throws Exception {
        long[] antes = retencion();

        Alumno alumno = alumnoNuevo();
        inscripcionConFecha(alumno, Disciplina.DJ, LocalDate.now().minusMonths(3));

        assertThat(retencion()[0]).isEqualTo(antes[0]);
    }

    /**
     * La tasa es un porcentaje sobre el denominador, y con denominador cero es
     * {@code null} y no cero — un 0% se lee como "se fueron todos". Acá solo se
     * comprueba la aritmética; el caso del null vive en el propio contrato del
     * DTO, porque la base de desarrollo ya tiene gente con ventana cerrada.
     */
    @Test
    void la_tasa_es_el_porcentaje_de_retenidos_sobre_el_denominador() throws Exception {
        String cuerpo = tablero().andReturn().getResponse().getContentAsString();
        long[] numeros = retencion();

        if (numeros[0] > 0) {
            BigDecimal esperada = BigDecimal.valueOf(numeros[1] * 1000 / numeros[0])
                    .divide(BigDecimal.TEN);
            assertThat(cuerpo).contains("\"tasa\":" + esperada.stripTrailingZeros().toPlainString());
        }
    }

    // == El rango =============================================================

    @Test
    void un_rango_invertido_es_un_error_y_no_un_tablero_vacio() throws Exception {
        mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(HASTA, DESDE))
                .header("Authorization", comoAdmin()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void un_ano_entra_y_mas_de_un_ano_no() throws Exception {
        mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(LUNES, LUNES.plusDays(366)))
                .header("Authorization", comoAdmin()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(LUNES, LUNES.plusDays(367)))
                .header("Authorization", comoAdmin()))
                .andExpect(status().isBadRequest());
    }

    // == Permisos =============================================================

    /**
     * <b>La línea que justifica que este proyecto tenga cuatro roles y no tres.</b>
     * Es el único lugar del sistema donde la separación no es entre leer y
     * escribir, sino entre dos clases de administrador.
     */
    @Test
    void el_directivo_ve_el_tablero_completo() throws Exception {
        mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isOk());
    }

    @Test
    void el_staff_no_ve_el_tablero_completo() throws Exception {
        mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.STAFF))))
                .andExpect(status().isForbidden());
    }

    /** Pero sí ve el resumen financiero básico, que es la plata que maneja. */
    @Test
    void el_staff_si_ve_el_resumen_financiero() throws Exception {
        mvc.perform(get("/api/tablero/resumen?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.STAFF))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.caja").isArray())
                .andExpect(jsonPath("$.pendientes.length()").value(2));
    }

    /**
     * <b>El resumen es otro endpoint, no el tablero recortado.</b> Este caso pinta
     * esa decisión: lo que STAFF no puede ver no viaja en la respuesta ni siquiera
     * en {@code null}. Un campo escondido con un {@code if} en el front igual viaja
     * por HTTP y se lee con las herramientas del navegador — es el mismo
     * razonamiento con el que el Módulo 6 sacó el premaster del DTO del portal.
     */
    @Test
    void el_resumen_no_trae_retencion_ni_ocupacion_ni_sello() throws Exception {
        String cuerpo = mvc.perform(get("/api/tablero/resumen?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.STAFF))))
                .andReturn().getResponse().getContentAsString();

        assertThat(cuerpo)
                .doesNotContain("retencion")
                .doesNotContain("ocupacion")
                .doesNotContain("sello")
                .doesNotContain("mixMastering");
    }

    @Test
    void un_usuario_comun_no_ve_ninguno_de_los_dos() throws Exception {
        String suya = credencialPara(crear(Rol.USUARIO));

        mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", suya))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/tablero/resumen?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", suya))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    private ResultActions tablero() throws Exception {
        return mvc.perform(get("/api/tablero?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", comoAdmin()));
    }

    /** {@code [conVentanaCerrada, retenidos]}, leídos del tablero. */
    private long[] retencion() throws Exception {
        String cuerpo = tablero().andReturn().getResponse().getContentAsString();
        return new long[] {
                numeroEn(cuerpo, "\"conVentanaCerrada\":"),
                numeroEn(cuerpo, "\"retenidos\":") };
    }

    private BigDecimal pendienteEnPesos() throws Exception {
        String cuerpo = tablero().andReturn().getResponse().getContentAsString();
        int pendientes = cuerpo.indexOf("\"pendientes\":");
        int ars = cuerpo.indexOf("\"moneda\":\"ARS\"", pendientes);
        int monto = cuerpo.indexOf("\"monto\":", ars) + "\"monto\":".length();
        return new BigDecimal(cuerpo.substring(monto, cuerpo.indexOf(',', monto)).trim());
    }

    private long numeroEn(String cuerpo, String clave) {
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = desde;
        while (Character.isDigit(cuerpo.charAt(hasta))) {
            hasta++;
        }
        return Long.parseLong(cuerpo.substring(desde, hasta));
    }

    // -- Altas ----------------------------------------------------------------

    private ResultActions reservar(Long idSala, Long idTipoUso, LocalDate fecha,
            String desde, String hasta) throws Exception {
        return mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s"}
                        """.formatted(idSala, idTipoUso, fecha, desde, hasta)))
                .andExpect(status().isCreated());
    }

    private void pagarReserva(Usuario quien, long idReserva, String monto) throws Exception {
        mvc.perform(pagar("""
                {"idUsuario":%d,"idReserva":%d,"monto":%s,"moneda":"ARS",
                 "medioPago":"EFECTIVO","estadoPago":"PAGADO","fechaPago":"%s"}
                """.formatted(quien.getId(), idReserva, monto, LUNES)))
                .andExpect(status().isCreated());
    }

    private void pagarInscripcion(Usuario quien, Long idInscripcion, String monto) throws Exception {
        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":%s,"moneda":"ARS",
                 "medioPago":"TRANSFERENCIA","estadoPago":"PAGADO","fechaPago":"%s"}
                """.formatted(quien.getId(), idInscripcion, monto, LUNES)))
                .andExpect(status().isCreated());
    }

    private MockHttpServletRequestBuilder pagar(String cuerpo) {
        return post("/api/pagos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    /**
     * Una clase del curso: la reserva y su participación, colgada de la
     * inscripción. Va por SQL porque el alta pide fechas de hoy en adelante y acá
     * hacen falta clases de hace un año y medio.
     */
    private void claseDelCurso(Alumno alumno, Inscripcion curso, LocalDate fecha) {
        Long idReserva = jdbc.queryForObject("""
                INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin, estado)
                VALUES (?, ?, ?, '10:00', '11:30', 'FINALIZADA')
                RETURNING id_reserva
                """, Long.class, sala1, claseDj, fecha);

        jdbc.update("""
                INSERT INTO reserva_participante (id_reserva, id_usuario, id_inscripcion, estado_asistencia)
                VALUES (?, ?, ?, 'PRESENTE')
                """, idReserva, alumno.getUsuario().getId(), curso.getId());
    }

    private long idDeReserva(ResultActions resultado) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        return numeroEn(cuerpo, "\"idReserva\":");
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno) {
        return inscripcionConFecha(alumno, Disciplina.DJ, LUNES);
    }

    /** Un primer servicio de hace 19 meses: su ventana de 10 meses ya cerró. */
    private Inscripcion inscripcionViejaDe(Alumno alumno) {
        return inscripcionConFecha(alumno, Disciplina.DJ, LocalDate.now().minusMonths(19));
    }

    private Inscripcion segundaInscripcion(Alumno alumno, LocalDate fecha) {
        return inscripcionConFecha(alumno, Disciplina.PRODUCCION, fecha);
    }

    private Inscripcion inscripcionConFecha(Alumno alumno, Disciplina disciplina, LocalDate fecha) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(disciplina);
        inscripcion.setNivel(Nivel.INICIAL);
        inscripcion.setClasesContratadas((short) 8);
        inscripcion.setPrecioTotal(new BigDecimal("100000"));
        inscripcion.setMoneda(Moneda.ARS);
        inscripcion.setFechaInicio(fecha);
        return inscripciones.save(inscripcion);
    }

    private Long idDeSala(String nombre) {
        return salas.listar(true).stream()
                .filter(s -> s.getNombreSala().equals(nombre))
                .findFirst().orElseThrow().getId();
    }

    private Long idDeTipo(String codigo) {
        return tiposDeUso.listar(true).stream()
                .filter(t -> t.getCodigo().equals(codigo))
                .findFirst().orElseThrow().getId();
    }

    private String comoAdmin() {
        return credencialPara(crear(Rol.ADMIN));
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Tablero" + rol.name());
        usuario.setEmail("tablero-" + UUID.randomUUID() + "@lajuanita.local");
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
