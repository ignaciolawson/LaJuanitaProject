package com.lajuanita.backend.pago;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 3 — la caja, los deudores y los egresos.
 *
 * <p><b>Acá no hay constraints que probar: hay cuentas.</b> Y una cuenta
 * equivocada no tira error, devuelve otro número — el modo de falla más caro de
 * este módulo, porque el sistema sigue andando y la plata no cierra. Los casos
 * apuntan a las cuatro formas concretas de que mienta: que se sumen monedas
 * distintas, que lo adeudado se cuente como entrado, que los egresos no se
 * resten, y que una deuda se rejuvenezca sola.
 *
 * <p>Fechas de 2031 —y distintas de las de {@code PagoTest}— porque estas dos
 * consultas agregan <b>todo</b> lo que hay en el rango. {@code /deudores} además
 * no filtra por fecha, así que sus casos afirman sobre la persona del caso y
 * nunca sobre el largo de la lista.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CajaTest {

    private static final LocalDate DIA = LocalDate.of(2031, 3, 5);
    private static final LocalDate DESDE = DIA.minusDays(10);
    private static final LocalDate HASTA = DIA.plusDays(10);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private AlumnoRepository alumnos;
    @Autowired private InscripcionRepository inscripciones;

    // == La caja ==============================================================

    @Test
    void la_caja_resta_los_egresos_de_los_ingresos() throws Exception {
        cobrar("100000", Moneda.ARS, EstadoPago.PAGADO);
        gastar("30000", Moneda.ARS, "Sueldo de profesor");

        caja()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(100000.00))
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].egresos").value(30000.00))
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].neto").value(70000.00));
    }

    /** El neto puede ser negativo, y tiene que poder serlo. */
    @Test
    void un_mes_con_mas_gastos_que_ingresos_da_neto_negativo() throws Exception {
        cobrar("10000", Moneda.ARS, EstadoPago.PAGADO);
        gastar("50000", Moneda.ARS, "Equipamiento");

        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].neto").value(-40000.00));
    }

    /**
     * <b>Las dos monedas van separadas</b> (§2.3). Unificarlas exigiría elegir una
     * cotización, y el total no correspondería a ninguna caja real: la plata de
     * PayPal no está en el mismo cajón que los pesos.
     */
    @Test
    void los_pesos_y_los_dolares_no_se_mezclan() throws Exception {
        cobrar("100000", Moneda.ARS, EstadoPago.PAGADO);
        cobrar("300", Moneda.USD, EstadoPago.PAGADO);

        caja()
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(100000.00))
                .andExpect(jsonPath("$[?(@.moneda == 'USD')].ingresos").value(300.00));
    }

    /** Y las dos aparecen siempre: "en dólares no entró nada" es un dato. */
    @Test
    void un_periodo_sin_movimientos_devuelve_las_dos_monedas_en_cero() throws Exception {
        caja()
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[?(@.moneda == 'USD')]").isNotEmpty());
    }

    /**
     * <b>Lo adeudado no entró.</b> Contarlo en los ingresos es la forma más
     * directa de que la caja diga que hay plata que nadie pagó.
     */
    @Test
    void lo_adeudado_se_muestra_aparte_y_no_suma_al_neto() throws Exception {
        cobrar("100000", Moneda.ARS, EstadoPago.PAGADO);
        cobrar("40000", Moneda.ARS, EstadoPago.DEBE);

        caja()
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(100000.00))
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].adeudado").value(40000.00))
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].neto").value(100000.00));
    }

    /** Una seña es plata que entró: entró de verdad. */
    @Test
    void la_sena_cuenta_como_ingreso() throws Exception {
        cobrar("90000", Moneda.ARS, EstadoPago.SENADO);

        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(90000.00));
    }

    @Test
    void un_pago_anulado_deja_de_estar_en_la_caja() throws Exception {
        long idPago = idDe(cobrar("100000", Moneda.ARS, EstadoPago.PAGADO));
        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(100000.00));

        mvc.perform(patch("/api/pagos/" + idPago + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Se cargó dos veces"}
                        """))
                .andExpect(status().isOk());

        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(0.00));
    }

    /**
     * <b>El espejo del caso de arriba, y el que casi no existe.</b>
     *
     * <p>Cuando se abrió la anulación de egresos (2026-08-17),
     * {@code EgresoRepository.porMoneda} sumaba <b>todos</b> los del período sin
     * mirar {@code anulado} — y estaba bien mientras no se pudieran anular. Sin
     * agregarle la condición, anular un egreso no lo saca del balance: "salió" y
     * "quedó" quedan mal <b>sin ningún error a la vista</b>.
     *
     * <p>Lo que lo hacía fácil de pasar por alto es que la mitad de los ingresos ya
     * lo hacía bien ({@code EstadoPago.ENTRARON}), así que la caja <i>parecía</i>
     * contemplar anulaciones.
     */
    @Test
    void un_egreso_anulado_deja_de_estar_en_la_caja() throws Exception {
        long idEgreso = idDeEgreso(mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":40000,"moneda":"ARS","concepto":"Cargado por error",
                         "fechaEgreso":"%s"}
                        """.formatted(DIA)))
                .andExpect(status().isCreated()));

        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].egresos").value(40000.00));

        mvc.perform(patch("/api/egresos/" + idEgreso + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Se cargó dos veces"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.anulado").value(true))
                .andExpect(jsonPath("$.motivoAnulacion").value("Se cargó dos veces"));

        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].egresos").value(0.00));
    }

    // == Dividir los egresos por dentro (`mejoras.md` §12 · C3) ===============

    /**
     * El corte que pidió Ignacio: <i>"profesores vs. resto, ya"</i>.
     *
     * <p><b>No necesitó una columna nueva</b>: sale de {@code id_usuario_destino},
     * que existe desde `V1` con su comentario escrito y que hasta ahora no usaba
     * ninguna pantalla. Por eso este punto, que la barrida había triado como C,
     * terminó siendo B.
     *
     * <p>Filtra <b>en el servidor</b>: el listado pagina de a veinte, así que
     * recortar lo ya traído mostraría un subconjunto como si fuera el total.
     */
    @Test
    void los_egresos_se_dividen_en_sueldos_y_otros_gastos() throws Exception {
        Usuario profe = crear(Rol.USUARIO);

        mvc.perform(cargarEgreso("""
                {"monto":420000,"moneda":"ARS","concepto":"Honorarios de agosto",
                 "idUsuarioDestino":%d,"fechaEgreso":"%s"}
                """.formatted(profe.getId(), DIA))).andExpect(status().isCreated());

        mvc.perform(cargarEgreso("""
                {"monto":200000,"moneda":"ARS","concepto":"Alquiler del local",
                 "fechaEgreso":"%s"}
                """.formatted(DIA))).andExpect(status().isCreated());

        // Los sueldos: todas las filas apuntan a una persona.
        mvc.perform(get("/api/egresos").param("destino", "PROFESOR")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.esPagoAProfesor == false)]").isEmpty())
                .andExpect(jsonPath("$.contenido[?(@.concepto == 'Honorarios de agosto')]").isNotEmpty())
                .andExpect(jsonPath("$.contenido[?(@.concepto == 'Alquiler del local')]").isEmpty());

        // Y el otro lado, que es lo que prueba que el filtro corta de verdad: sin
        // este caso, un filtro que no filtra nada pasaría la mitad de arriba.
        mvc.perform(get("/api/egresos").param("destino", "OTRO")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.esPagoAProfesor == true)]").isEmpty())
                .andExpect(jsonPath("$.contenido[?(@.concepto == 'Alquiler del local')]").isNotEmpty());
    }

    /** Sin filtro se ven los dos: dividir no es esconder la mitad. */
    @Test
    void sin_filtro_el_listado_trae_las_dos_clases_de_egreso() throws Exception {
        Usuario profe = crear(Rol.USUARIO);

        mvc.perform(cargarEgreso("""
                {"monto":420000,"moneda":"ARS","concepto":"Honorarios sin filtro",
                 "idUsuarioDestino":%d,"fechaEgreso":"%s"}
                """.formatted(profe.getId(), DIA))).andExpect(status().isCreated());

        mvc.perform(cargarEgreso("""
                {"monto":200000,"moneda":"ARS","concepto":"Alquiler sin filtro",
                 "fechaEgreso":"%s"}
                """.formatted(DIA))).andExpect(status().isCreated());

        mvc.perform(get("/api/egresos").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.concepto == 'Honorarios sin filtro')]").isNotEmpty())
                .andExpect(jsonPath("$.contenido[?(@.concepto == 'Alquiler sin filtro')]").isNotEmpty());
    }

    /** La segunda anulación pisaría el autor y el motivo de la primera. */
    @Test
    void un_egreso_no_se_anula_dos_veces() throws Exception {
        long idEgreso = idDeEgreso(mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":40000,"moneda":"ARS","concepto":"Uno","fechaEgreso":"%s"}
                        """.formatted(DIA)))
                .andExpect(status().isCreated()));

        anularEgreso(idEgreso).andExpect(status().isOk());
        anularEgreso(idEgreso)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ese egreso ya está anulado."));
    }

    /** `V9` exige las tres firmas juntas; el motivo es la única que aporta el cliente. */
    @Test
    void anular_un_egreso_sin_motivo_se_rechaza() throws Exception {
        long idEgreso = idDeEgreso(mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":40000,"moneda":"ARS","concepto":"Uno","fechaEgreso":"%s"}
                        """.formatted(DIA)))
                .andExpect(status().isCreated()));

        mvc.perform(patch("/api/egresos/" + idEgreso + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"   "}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.motivo").isNotEmpty());
    }

    /** Un egreso anulado sale del total pero no del listado: es historial. */
    @Test
    void un_egreso_anulado_sigue_en_el_listado() throws Exception {
        long idEgreso = idDeEgreso(mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":40000,"moneda":"ARS","concepto":"Queda a la vista",
                         "fechaEgreso":"%s"}
                        """.formatted(DIA)))
                .andExpect(status().isCreated()));
        anularEgreso(idEgreso).andExpect(status().isOk());

        mvc.perform(get("/api/egresos?buscar=Queda a la vista")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].anulado").value(true));
    }

    private ResultActions anularEgreso(long id) throws Exception {
        return mvc.perform(patch("/api/egresos/" + id + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Se cargó dos veces"}
                        """));
    }

    private long idDeEgreso(ResultActions resultado) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf("\"idEgreso\":") + "\"idEgreso\":".length();
        return Long.parseLong(cuerpo.substring(desde, cuerpo.indexOf(',', desde)).trim());
    }

    /** El desglose por vía es la conciliación contra el banco y la caja chica. */
    @Test
    void la_caja_desglosa_por_medio_de_pago() throws Exception {
        cobrar("100000", Moneda.ARS, EstadoPago.PAGADO, "EFECTIVO");
        cobrar("250000", Moneda.ARS, EstadoPago.PAGADO, "TRANSFERENCIA");

        caja()
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].porMedio.length()").value(2))
                // Ordenado por monto: la transferencia va primero.
                .andExpect(jsonPath("$[?(@.moneda == 'ARS')].porMedio[0].medioPago")
                        .value("TRANSFERENCIA"));
    }

    @Test
    void lo_de_afuera_del_periodo_no_entra_en_la_caja() throws Exception {
        cobrarEn("100000", HASTA.plusDays(60));

        caja().andExpect(jsonPath("$[?(@.moneda == 'ARS')].ingresos").value(0.00));
    }

    @Test
    void un_periodo_invertido_da_error_y_no_una_caja_vacia() throws Exception {
        mvc.perform(get("/api/pagos/caja?desde=%s&hasta=%s".formatted(HASTA, DESDE))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void mas_de_un_ano_no_se_pide_de_una() throws Exception {
        mvc.perform(get("/api/pagos/caja?desde=%s&hasta=%s".formatted(DIA, DIA.plusDays(367)))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    // == Los deudores =========================================================

    @Test
    void un_deudor_aparece_con_cuanto_debe_y_desde_cuando() throws Exception {
        Usuario quienDebe = alumnoConDeuda("40000", DIA);

        deudores()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].adeudado".formatted(quienDebe.getId()))
                        .value(40000.00))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].desde".formatted(quienDebe.getId()))
                        .value(DIA.toString()));
    }

    /**
     * <b>La antigüedad se cuenta desde el renglón más viejo</b> (MIN, no MAX).
     * Con MAX, anotarle otra cuota a alguien que debe hace meses le rejuvenecería
     * la deuda a cero días — que es lo contrario de lo que la pantalla existe para
     * mostrar.
     */
    @Test
    void una_cuota_nueva_no_rejuvenece_una_deuda_vieja() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000");
        LocalDate vieja = LocalDate.now().minusDays(90);

        anotarDeuda(alumno, curso, "20000", vieja);
        anotarDeuda(alumno, curso, "20000", LocalDate.now());

        long id = alumno.getUsuario().getId();
        deudores()
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].desde".formatted(id))
                        .value(vieja.toString()))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].adeudado".formatted(id)).value(40000.00))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].diasDeAtraso".formatted(id)).value(90));
    }

    /** La regla dura de §6: pasados los 7 días, la deuda está vencida. */
    @Test
    void una_deuda_de_mas_de_siete_dias_esta_vencida() throws Exception {
        Usuario reciente = alumnoConDeuda("10000", LocalDate.now().minusDays(3));
        Usuario vieja = alumnoConDeuda("10000", LocalDate.now().minusDays(30));

        deudores()
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].vencido".formatted(reciente.getId()))
                        .value(false))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].vencido".formatted(vieja.getId()))
                        .value(true));
    }

    @Test
    void quien_pago_todo_no_aparece_entre_los_deudores() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000");
        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":180000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isCreated());

        deudores().andExpect(jsonPath("$[?(@.idUsuario == %d)]".formatted(alumno.getUsuario().getId()))
                .isEmpty());
    }

    // == Los egresos ==========================================================

    @Test
    void registrar_un_egreso_a_un_profesor_lo_deja_nombrado() throws Exception {
        Usuario profe = crear(Rol.USUARIO);

        mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":150000,"moneda":"ARS","concepto":"Clases de marzo",
                         "idUsuarioDestino":%d,"fechaEgreso":"%s"}
                        """.formatted(profe.getId(), DIA)))
                .andExpect(status().isCreated())
                // El nombre de la cuenta gana sobre el texto libre.
                .andExpect(jsonPath("$.destinatario")
                        .value(profe.getNombre() + " " + profe.getApellido()))
                .andExpect(jsonPath("$.idUsuarioDestino").value(profe.getId()));
    }

    /** La mayoría de los egresos son a proveedores que nunca van a tener cuenta. */
    @Test
    void un_egreso_a_alguien_sin_cuenta_usa_el_texto_libre() throws Exception {
        mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":80000,"moneda":"ARS","concepto":"Alquiler",
                         "destinatario":"Inmobiliaria Pilar","fechaEgreso":"%s"}
                        """.formatted(DIA)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.destinatario").value("Inmobiliaria Pilar"))
                .andExpect(jsonPath("$.idUsuarioDestino").doesNotExist());
    }

    /** "Todo egreso queda con usuario, fecha y motivo": el motivo es el concepto. */
    @Test
    void un_egreso_sin_concepto_no_entra() throws Exception {
        mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":80000,"moneda":"ARS","concepto":"  "}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.concepto").isNotEmpty());
    }

    @Test
    void un_egreso_en_dolares_sin_cotizacion_no_entra() throws Exception {
        mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":500,"moneda":"USD","concepto":"Plugin"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cotizacionPresenteSiEsUsd").isNotEmpty());
    }

    // == Permisos =============================================================

    /** La caja y los deudores los ve el DIRECTIVO: es su pantalla. */
    @Test
    void un_directivo_ve_la_caja_y_los_deudores() throws Exception {
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/pagos/caja?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", directivo)).andExpect(status().isOk());
        mvc.perform(get("/api/pagos/deudores").header("Authorization", directivo))
                .andExpect(status().isOk());
    }

    @Test
    void un_directivo_no_registra_egresos() throws Exception {
        mvc.perform(post("/api/egresos")
                .header("Authorization", credencialPara(crear(Rol.DIRECTIVO)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":80000,"moneda":"ARS","concepto":"Alquiler"}
                        """))
                .andExpect(status().isForbidden());
    }

    @Test
    void un_usuario_comun_no_ve_la_caja() throws Exception {
        mvc.perform(get("/api/pagos/caja?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    private ResultActions caja() throws Exception {
        return mvc.perform(get("/api/pagos/caja?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", comoStaff()));
    }

    private ResultActions deudores() throws Exception {
        return mvc.perform(get("/api/pagos/deudores").header("Authorization", comoStaff()));
    }

    private ResultActions cobrar(String monto, Moneda moneda, EstadoPago estado) throws Exception {
        return cobrar(monto, moneda, estado, "EFECTIVO");
    }

    private ResultActions cobrar(String monto, Moneda moneda, EstadoPago estado, String medio)
            throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "1000000");

        return mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":%s,"moneda":"%s",%s
                 "medioPago":"%s","estadoPago":"%s","fechaPago":"%s"}
                """.formatted(alumno.getUsuario().getId(), curso.getId(), monto, moneda,
                moneda == Moneda.USD ? "\"cotizacionDolar\":1200," : "",
                medio, estado, DIA)))
                .andExpect(status().isCreated());
    }

    private void cobrarEn(String monto, LocalDate fecha) throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "1000000");

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":%s,"moneda":"ARS",
                 "medioPago":"EFECTIVO","fechaPago":"%s"}
                """.formatted(alumno.getUsuario().getId(), curso.getId(), monto, fecha)))
                .andExpect(status().isCreated());
    }

    private void gastar(String monto, Moneda moneda, String concepto) throws Exception {
        mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":%s,"moneda":"%s","concepto":"%s","fechaEgreso":"%s"}
                        """.formatted(monto, moneda, concepto, DIA)))
                .andExpect(status().isCreated());
    }

    private Usuario alumnoConDeuda(String monto, LocalDate fecha) throws Exception {
        Alumno alumno = alumnoNuevo();
        anotarDeuda(alumno, inscripcionDe(alumno, "1000000"), monto, fecha);
        return alumno.getUsuario();
    }

    private void anotarDeuda(Alumno alumno, Inscripcion curso, String monto, LocalDate fecha)
            throws Exception {
        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":%s,"moneda":"ARS",
                 "medioPago":"EFECTIVO","estadoPago":"DEBE","fechaPago":"%s"}
                """.formatted(alumno.getUsuario().getId(), curso.getId(), monto, fecha)))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder pagar(String cuerpo) {
        return post("/api/pagos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private long idDe(ResultActions resultado) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf("\"idPago\":") + "\"idPago\":".length();
        return Long.parseLong(cuerpo.substring(desde, cuerpo.indexOf(',', desde)).trim());
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno, String precio) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(Disciplina.DJ);
        inscripcion.setNivel(Nivel.INICIAL);
        inscripcion.setClasesContratadas((short) 8);
        inscripcion.setPrecioTotal(new BigDecimal(precio));
        inscripcion.setMoneda(Moneda.ARS);
        return inscripciones.save(inscripcion);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder cargarEgreso(
            String cuerpo) {
        return post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Caja" + rol.name());
        usuario.setEmail("caja-" + UUID.randomUUID() + "@lajuanita.local");
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
