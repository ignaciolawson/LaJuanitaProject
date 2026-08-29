package com.lajuanita.backend.pago;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 3 — los pagos.
 *
 * <p>Igual que en los dos módulos anteriores, <b>buena parte de lo que se prueba
 * acá lo impone la base</b> y el valor del caso es verificar que la regla llegue
 * a la pantalla con el estado HTTP correcto y una frase que alguien pueda leer.
 * Pero este módulo agrega una segunda clase de caso, que no existía antes: las
 * <b>cuentas</b>. Un CHECK que falla avisa; una suma equivocada no — devuelve
 * otro número y nadie se entera hasta que la caja no cierra.
 *
 * <p>Fechas de 2030: {@code /caja} y {@code /deudores} agregan todo lo que hay en
 * el rango, incluido lo que tenga cargado a mano la base de desarrollo.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PagoTest {

    private static final LocalDate HOY = LocalDate.of(2030, 6, 10);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private AlumnoRepository alumnos;
    @Autowired private InscripcionRepository inscripciones;
    @Autowired private JdbcTemplate jdbc;

    // == El alta ==============================================================

    @Test
    void registrar_un_pago_contra_una_inscripcion() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                 "medioPago":"TRANSFERENCIA","estadoPago":"SENADO","concepto":"Seña del curso"}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.monto").value(90000.00))
                .andExpect(jsonPath("$.destino").value("INSCRIPCION"))
                .andExpect(jsonPath("$.estadoPago").value("SENADO"))
                // La seña es plata que entró: suma a la caja.
                .andExpect(jsonPath("$.entro").value(true));
    }

    /** La fila dice qué salda, ya legible: es el problema que el módulo resuelve. */
    @Test
    void el_pago_nombra_lo_que_salda() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagarInscripcion(alumno, curso, "90000"))
                .andExpect(jsonPath("$.queSalda").value("DJ · INICIAL"));
    }

    /** El autor sale del token, nunca del cuerpo. */
    @Test
    void queda_registrado_quien_carga_el_pago() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        Usuario mica = crear(Rol.STAFF);

        long idPago = idDe(mvc.perform(post("/api/pagos")
                .header("Authorization", credencialPara(mica))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpoInscripcion(alumno, curso, "90000")))
                .andExpect(status().isCreated()));

        assertThat(jdbc.queryForObject(
                "SELECT id_usuario_registra FROM pago WHERE id_pago = ?", Long.class, idPago))
                .isEqualTo(mica.getId());
    }

    // == Las cuatro reglas del esquema, vistas desde la pantalla ==============

    /**
     * <b>Un pago salda una cosa, exactamente.</b> El CHECK pasó de {@code >= 1} a
     * {@code = 1} porque con dos destinos el monto se contaba dos veces en los
     * reportes por línea de negocio.
     */
    @Test
    void un_pago_sin_destino_no_entra() throws Exception {
        Usuario persona = crear(Rol.USUARIO);

        mvc.perform(pagar("""
                {"idUsuario":%d,"monto":5000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(persona.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.destinoUnico").isNotEmpty());
    }

    @Test
    void un_pago_con_dos_destinos_no_entra() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"idVentaEquipo":7,
                 "monto":5000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.destinoUnico").isNotEmpty());
    }

    @Test
    void un_pago_en_dolares_sin_cotizacion_no_entra() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "300", Moneda.USD);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":150,"moneda":"USD","medioPago":"PAYPAL"}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cotizacionPresenteSiEsUsd").isNotEmpty());
    }

    @Test
    void un_descuento_sin_justificacion_no_entra() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                 "medioPago":"EFECTIVO","descuentoPorcentaje":20}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.descuentoJustificado").isNotEmpty());
    }

    /** El descuento es un porcentaje: un 20000 ahí es un importe disfrazado. */
    @Test
    void un_descuento_mayor_a_cien_no_entra() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                 "medioPago":"EFECTIVO","descuentoPorcentaje":20000,"motivoDescuento":"Ex alumno"}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.descuentoPorcentaje").isNotEmpty());
    }

    @Test
    void un_pago_de_monto_cero_no_entra() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagarInscripcion(alumno, curso, "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.monto").isNotEmpty());
    }

    /**
     * <b>El hueco que ninguna FK tapa.</b> {@code pago.id_usuario} y
     * {@code pago.id_inscripcion} son dos columnas sueltas: se podía acreditar el
     * pago de uno contra el curso de otro y las dos cuentas quedaban mal en
     * silencio. Es el mismo hueco que `V1` §8.2 tapó del lado de las clases.
     */
    @Test
    void no_se_puede_acreditar_un_pago_contra_la_inscripcion_de_otro() throws Exception {
        Alumno ana = alumnoNuevo();
        Inscripcion cursoDeAna = inscripcionDe(ana, "180000", Moneda.ARS);
        Usuario juan = crear(Rol.USUARIO);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(juan.getId(), cursoDeAna.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("de otra persona")));
    }

    /**
     * Un alta con {@code ANULADO} no tiene de dónde sacar las tres firmas que
     * `V7` exige, así que moría con un 409 de constraint. Ahora dice qué hacer.
     */
    @Test
    void un_pago_no_se_registra_ya_anulado() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                 "medioPago":"EFECTIVO","estadoPago":"ANULADO"}
                """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.estadoDeAltaValido").isNotEmpty());
    }

    @Test
    void pagar_por_alguien_que_no_existe_da_404() throws Exception {
        mvc.perform(pagar("""
                {"idUsuario":99999999,"idVentaEquipo":1,"monto":5000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """))
                .andExpect(status().isNotFound());
    }

    // == La anulación (P15) ===================================================

    @Test
    void anular_un_pago_lo_saca_de_la_caja_y_lo_deja_firmado() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        mvc.perform(anular(idPago, "Se cargó dos veces"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoPago").value("ANULADO"))
                .andExpect(jsonPath("$.motivoAnulacion").value("Se cargó dos veces"))
                .andExpect(jsonPath("$.fechaAnulacion").isNotEmpty())
                // Y deja de sumar: es lo que anular significa para el balance.
                .andExpect(jsonPath("$.entro").value(false));

        assertThat(jdbc.queryForObject(
                "SELECT id_usuario_anula FROM pago WHERE id_pago = ?", Long.class, idPago))
                .isNotNull();
    }

    @Test
    void anular_sin_motivo_no_se_puede() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        mvc.perform(anular(idPago, "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.motivo").isNotEmpty());
    }

    /**
     * La base no lo impide —anular dos veces cumple la constraint igual— pero la
     * segunda pisa el autor y el motivo de la primera, y con eso se pierde quién
     * dio de baja la plata de verdad.
     */
    @Test
    void anular_dos_veces_no_se_puede() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        mvc.perform(anular(idPago, "Se cargó dos veces")).andExpect(status().isOk());
        mvc.perform(anular(idPago, "Otra vez"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("ya está anulado")));
    }

    /**
     * <b>La plata no se borra.</b> Lo impone un trigger de `V6`, y este caso lo
     * ejercita con SQL crudo justamente para probar que quien sostiene la regla
     * es la base y no el hecho de que el controller no exponga un DELETE.
     */
    @Test
    void un_pago_no_se_puede_borrar_ni_con_sql_crudo() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        assertThatThrownBy(() -> jdbc.update("DELETE FROM pago WHERE id_pago = ?", idPago))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("No se borran filas");
    }

    // == El comprobante =======================================================

    @Test
    void invalidar_un_comprobante_lo_marca_y_no_lo_borra() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                 "medioPago":"TRANSFERENCIA","comprobantePath":"/comprobantes/1.pdf"}
                """.formatted(alumno.getUsuario().getId(), curso.getId()))));

        mvc.perform(patch("/api/pagos/" + idPago + "/comprobante-invalido")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"El comprobante era de otra transferencia"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comprobanteInvalido").value(true))
                // El path sigue estando: se marca, no se borra.
                .andExpect(jsonPath("$.comprobantePath").value("/comprobantes/1.pdf"))
                .andExpect(jsonPath("$.motivoInvalidacion").isNotEmpty());
    }

    @Test
    void no_se_invalida_un_comprobante_que_no_existe() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        mvc.perform(patch("/api/pagos/" + idPago + "/comprobante-invalido")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"No sirve"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no tiene comprobante")));
    }

    // == `V19` · el pagador sin cuenta y la edición ============================

    /**
     * El caso que motivó `V19` §1 (`mejoras.md` §8 #1): antes de esa migración
     * {@code pago.id_usuario} era NOT NULL y <b>a un comprador sin cuenta no se le
     * podía cobrar nunca</b>.
     */
    @Test
    void registrar_un_pago_de_alguien_sin_cuenta() throws Exception {
        mvc.perform(pagar("""
                {"nombrePagadorExterno":"Comprador de Paso","contactoPagadorExterno":"11-5555-5555",
                 "idVentaEquipo":%d,"monto":900000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(ventaNueva())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").doesNotExist())
                .andExpect(jsonPath("$.pagador").value("Comprador de Paso"))
                .andExpect(jsonPath("$.pagadorSinCuenta").value(true));
    }

    /**
     * La otra mitad del CHECK, y sin este caso la primera no prueba nada: un CHECK
     * escrito al revés dejaría pasar la de arriba y rompería todos los pagos
     * normales del sistema.
     */
    @Test
    void el_pago_con_cuenta_sigue_diciendo_de_quien_es() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagarInscripcion(alumno, curso, "90000"))
                .andExpect(jsonPath("$.pagadorSinCuenta").value(false))
                .andExpect(jsonPath("$.idUsuario").value(alumno.getUsuario().getId()));
    }

    /** Ni cuenta ni nombre: el pago no dice de quién es y no entra. */
    @Test
    void un_pago_sin_cuenta_y_sin_nombre_no_entra() throws Exception {
        mvc.perform(pagar("""
                {"idVentaEquipo":%d,"monto":1000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(ventaNueva())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.pagadorIdentificado").isNotEmpty());
    }

    /**
     * <b>Saldar un curso sí exige cuenta</b>, y no es una regla nueva: una
     * {@code inscripcion} cuelga de un {@code alumno}, que cuelga de un
     * {@code usuario}. El pago se acreditaría en una cuenta que no es de nadie.
     */
    @Test
    void un_curso_no_se_salda_a_nombre_de_alguien_sin_cuenta() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"nombrePagadorExterno":"El tío","idInscripcion":%d,"monto":90000,
                 "moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(curso.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("cuenta del alumno")));
    }

    /**
     * ⚠️ <b>El caso que cuida el modo de falla que `mejoras.md` §9.1 llama el
     * verdadero riesgo de `V19`</b>: que un pago sin dueño se caiga en silencio de
     * un listado. Antes de la migración el repositorio hacía {@code JOIN FETCH}
     * —un INNER—, así que la fila desaparecía sin ningún error: la pantalla
     * andaba y el total mentía.
     */
    @Test
    void el_pago_sin_cuenta_aparece_en_el_listado() throws Exception {
        mvc.perform(pagar("""
                {"nombrePagadorExterno":"Aparezco Igual","idVentaEquipo":%d,
                 "monto":123456,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(ventaNueva())))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/pagos").param("buscar", "Aparezco")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido.length()").value(1))
                .andExpect(jsonPath("$.contenido[0].pagador").value("Aparezco Igual"));
    }

    // -- La edición (`V19` §2) ------------------------------------------------

    /** Corregir un pago mal cargado, que hasta `V19` solo se podía anular. */
    @Test
    void editar_un_pago_mal_cargado() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long id = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        editar(id, """
                {"monto":95000,"moneda":"ARS","medioPago":"EFECTIVO","fechaPago":"2030-06-10",
                 "concepto":"Corregido"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.monto").value(95000.00))
                .andExpect(jsonPath("$.concepto").value("Corregido"));
    }

    /**
     * <b>La firma la escribe el servidor, y la fecha la escribe la base.</b> El
     * autor sale del token; la fecha la pone el trigger de `V19` §2, porque un
     * sello que el cliente elige se puede antedatar (DB-07).
     */
    @Test
    void la_edicion_queda_firmada() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long id = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        editar(id, """
                {"monto":95000,"moneda":"ARS","medioPago":"EFECTIVO","fechaPago":"2030-06-10"}
                """)
                .andExpect(status().isOk());

        assertThat(jdbc.queryForObject(
                "SELECT id_usuario_modifico FROM pago WHERE id_pago = ?", Long.class, id))
                .isNotNull();
        assertThat(jdbc.queryForObject(
                "SELECT fecha_modificacion FROM pago WHERE id_pago = ?", java.sql.Timestamp.class, id))
                .isNotNull();
    }

    /**
     * <b>El trigger es el que manda, no el servicio.</b> Un UPDATE crudo que se
     * saltee la aplicación —o un endpoint futuro que se olvide de firmar— no entra.
     * Es el mismo molde con que `InscripcionTest` prueba la baja de nivel.
     */
    @Test
    void un_update_sin_autor_lo_rechaza_la_base() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long id = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE pago SET monto = 1 WHERE id_pago = ?", id))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("exige decir quien lo hizo");
    }

    /**
     * Tocar algo que no es la plata no despierta al trigger, igual que en
     * {@code reserva}: corregir un concepto no es "editar la plata". Si el
     * {@code WHEN} del trigger estuviera de más, este caso lo detecta.
     */
    @Test
    void corregir_solo_el_concepto_no_exige_autor() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long id = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        jdbc.update("UPDATE pago SET concepto = 'a mano' WHERE id_pago = ?", id);

        assertThat(jdbc.queryForObject(
                "SELECT concepto FROM pago WHERE id_pago = ?", String.class, id))
                .isEqualTo("a mano");
    }

    /**
     * Un pago anulado es historia: editarlo volvería a moverlo en la caja, que es
     * justo lo que la anulación vino a deshacer, y su motivo escrito quedaría
     * explicando una fila que ya no es la que se anuló.
     */
    @Test
    void un_pago_anulado_no_se_edita() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long id = idDe(mvc.perform(pagarInscripcion(alumno, curso, "90000")));

        mvc.perform(patch("/api/pagos/" + id + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Cargado dos veces"}
                        """))
                .andExpect(status().isOk());

        editar(id, """
                {"monto":95000,"moneda":"ARS","medioPago":"EFECTIVO","fechaPago":"2030-06-10"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("anulado")));
    }

    /**
     * Una venta de equipo real, porque {@code pago.id_venta_equipo} tiene FK desde
     * `V1`: un id inventado no da 400 sino una violación de integridad, y el caso
     * fallaría por el motivo equivocado.
     */
    private long ventaNueva() {
        Usuario vendedor = crear(Rol.STAFF);
        return jdbc.queryForObject("""
                INSERT INTO venta_equipo (nombre_comprador_externo, id_usuario_vendedor,
                                          modelo_equipo, precio, moneda)
                VALUES ('Comprador de Paso', ?, 'CDJ-3000', 900000, 'ARS')
                RETURNING id_venta
                """, Long.class, vendedor.getId());
    }

    private ResultActions editar(long id, String cuerpo) throws Exception {
        return mvc.perform(put("/api/pagos/" + id)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    // == Estado de cuenta =====================================================

    /**
     * <b>Nunca resta entre monedas.</b> Un curso en pesos con un pago en dólares
     * no tiene un saldo: tiene dos renglones. Unificarlos exigiría elegir una
     * cotización y el número no correspondería a ninguna caja real (§2.3).
     */
    @Test
    void el_estado_de_cuenta_lleva_las_monedas_separadas() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion enPesos = inscripcionDe(alumno, "180000", Moneda.ARS);
        Inscripcion enDolares = inscripcionDe(alumno, "300", Moneda.USD, Disciplina.PRODUCCION);

        mvc.perform(pagarInscripcion(alumno, enPesos, "90000")).andExpect(status().isCreated());
        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":150,"moneda":"USD",
                 "cotizacionDolar":1200,"medioPago":"PAYPAL"}
                """.formatted(alumno.getUsuario().getId(), enDolares.getId())))
                .andExpect(status().isCreated());

        estadoDeCuenta(alumno)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldos.length()").value(2))
                .andExpect(jsonPath("$.saldos[?(@.moneda == 'ARS')].pagado").value(90000.00))
                .andExpect(jsonPath("$.saldos[?(@.moneda == 'USD')].pagado").value(150.00));
    }

    @Test
    void el_contrato_muestra_lo_pagado_y_el_saldo() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        mvc.perform(pagarInscripcion(alumno, curso, "50000")).andExpect(status().isCreated());
        mvc.perform(pagarInscripcion(alumno, curso, "30000")).andExpect(status().isCreated());

        estadoDeCuenta(alumno)
                .andExpect(jsonPath("$.contratos[0].pagado").value(80000.00))
                .andExpect(jsonPath("$.contratos[0].saldo").value(100000.00))
                .andExpect(jsonPath("$.contratos[0].saldado").value(false));
    }

    /** §13: la seña es el 50% del total. Cubierto eso, se puede reservar. */
    @Test
    void el_contrato_avisa_cuando_la_sena_esta_cubierta() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagarInscripcion(alumno, curso, "89999")).andExpect(status().isCreated());
        estadoDeCuenta(alumno).andExpect(jsonPath("$.contratos[0].senado").value(false));

        mvc.perform(pagarInscripcion(alumno, curso, "1")).andExpect(status().isCreated());
        estadoDeCuenta(alumno).andExpect(jsonPath("$.contratos[0].senado").value(true));
    }

    /** Un pago anulado no cuenta para el saldo del contrato. */
    @Test
    void un_pago_anulado_no_cancela_el_contrato() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        long idPago = idDe(mvc.perform(pagarInscripcion(alumno, curso, "180000")));

        estadoDeCuenta(alumno).andExpect(jsonPath("$.contratos[0].saldado").value(true));

        mvc.perform(anular(idPago, "Nunca entró")).andExpect(status().isOk());

        estadoDeCuenta(alumno)
                .andExpect(jsonPath("$.contratos[0].pagado").value(0.00))
                .andExpect(jsonPath("$.contratos[0].saldado").value(false));
    }

    /**
     * Un pago en otra moneda <b>no</b> cancela el contrato: aparece en los saldos
     * y no en el renglón del curso. Es la misma regla vista desde el otro lado.
     */
    @Test
    void un_pago_en_otra_moneda_no_cancela_el_contrato() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion enPesos = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":180000,"moneda":"USD",
                 "cotizacionDolar":1200,"medioPago":"PAYPAL"}
                """.formatted(alumno.getUsuario().getId(), enPesos.getId())))
                .andExpect(status().isCreated());

        estadoDeCuenta(alumno)
                .andExpect(jsonPath("$.contratos[0].pagado").value(0.00))
                .andExpect(jsonPath("$.contratos[0].saldado").value(false))
                .andExpect(jsonPath("$.saldos[?(@.moneda == 'USD')].pagado").value(180000.00));
    }

    @Test
    void alguien_sin_movimientos_tiene_un_estado_de_cuenta_vacio_y_no_un_error() throws Exception {
        Usuario persona = crear(Rol.USUARIO);

        mvc.perform(get("/api/pagos/estado-de-cuenta/" + persona.getId())
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldos.length()").value(0))
                .andExpect(jsonPath("$.contratos.length()").value(0))
                .andExpect(jsonPath("$.pagos.length()").value(0));
    }

    // == Permisos (§6: registrar pago es ADMIN·STAFF) =========================

    @Test
    void un_directivo_ve_los_pagos_y_no_los_carga() throws Exception {
        String directivo = credencialPara(crear(Rol.DIRECTIVO));
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);

        mvc.perform(get("/api/pagos").header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(post("/api/pagos")
                .header("Authorization", directivo)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpoInscripcion(alumno, curso, "90000")))
                .andExpect(status().isForbidden());
    }

    @Test
    void un_usuario_comun_no_ve_los_pagos_de_nadie() throws Exception {
        mvc.perform(get("/api/pagos").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    @Test
    void sin_credencial_no_se_ve_nada() throws Exception {
        mvc.perform(get("/api/pagos")).andExpect(status().isUnauthorized());
    }

    // =========================================================================

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder pagar(String cuerpo) {
        return post("/api/pagos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder pagarInscripcion(
            Alumno alumno, Inscripcion curso, String monto) {
        return pagar(cuerpoInscripcion(alumno, curso, monto));
    }

    private String cuerpoInscripcion(Alumno alumno, Inscripcion curso, String monto) {
        return """
                {"idUsuario":%d,"idInscripcion":%d,"monto":%s,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(alumno.getUsuario().getId(), curso.getId(), monto);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder anular(
            long idPago, String motivo) {
        return patch("/api/pagos/" + idPago + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"%s"}
                        """.formatted(motivo));
    }

    private ResultActions estadoDeCuenta(Alumno alumno) throws Exception {
        return mvc.perform(get("/api/pagos/estado-de-cuenta/" + alumno.getUsuario().getId())
                .header("Authorization", comoStaff()));
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

    private Inscripcion inscripcionDe(Alumno alumno, String precio, Moneda moneda) {
        return inscripcionDe(alumno, precio, moneda, Disciplina.DJ);
    }

    private Inscripcion inscripcionDe(Alumno alumno, String precio, Moneda moneda, Disciplina disciplina) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(disciplina);
        inscripcion.setNivel(com.lajuanita.backend.inscripcion.Nivel.INICIAL);
        inscripcion.setClasesContratadas((short) 8);
        inscripcion.setPrecioTotal(new BigDecimal(precio));
        inscripcion.setMoneda(moneda);
        if (moneda == Moneda.USD) {
            inscripcion.setCotizacionDolar(new BigDecimal("1200"));
        }
        inscripcion.setFechaInicio(HOY);
        return inscripciones.save(inscripcion);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Pago" + rol.name());
        usuario.setEmail("pago-" + UUID.randomUUID() + "@lajuanita.local");
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
