package com.lajuanita.backend.tablero;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 8 — la exportación del tablero a Excel y PDF.
 *
 * <p>Un archivo exportado es lo más difícil de probar y lo más fácil de romper
 * sin enterarse: <b>nadie lo abre hasta la reunión</b>. Los casos apuntan a las
 * tres formas concretas de que salga mal y se vea bien:
 *
 * <ol>
 *   <li><b>Que los importes viajen como texto</b> y la columna no se sume. Es
 *       literalmente lo que §15 pidió evitar: <i>"Excel de verdad, no un CSV con
 *       otro nombre"</i>. Un {@code "$ 180.000,00"} se ve idéntico a un número y
 *       rompe el primer {@code SUM} que alguien haga.</li>
 *   <li><b>Que falte la cabecera de trazabilidad</b>, y entonces dos
 *       exportaciones del mismo tablero con un mes de diferencia sean dos
 *       planillas que no se pueden comparar ni explicar.</li>
 *   <li><b>Que el archivo tenga más permisos que la pantalla</b>: un endpoint de
 *       exportación más flojo que lo que exporta es la forma más silenciosa de
 *       filtrar datos, porque nadie revisa dos veces un {@code .xlsx}.</li>
 * </ol>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExportacionTest {

    private static final LocalDate DESDE = LocalDate.of(2029, 4, 1);
    private static final LocalDate HASTA = LocalDate.of(2029, 4, 30);

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    // == Que sea un Excel de verdad ===========================================

    /**
     * El caso central: <b>los importes tienen que ser números</b>. Si esto falla,
     * el archivo se abre perfecto y no se puede sumar.
     */
    @Test
    void los_importes_van_como_numero_y_no_como_texto() throws Exception {
        try (Workbook libro = abrirExcel()) {
            Sheet caja = libro.getSheet("Caja");
            Row primera = primeraFilaDeDatos(caja, "Moneda");

            assertThat(primera.getCell(0).getCellType()).isEqualTo(CellType.STRING);
            for (int columna = 1; columna <= 6; columna++) {
                assertThat(primera.getCell(columna).getCellType())
                        .as("la columna %d de Caja tiene que ser numérica", columna)
                        .isEqualTo(CellType.NUMERIC);
            }
        }
    }

    /** Y con formato de moneda, que es lo que hace legible la columna. */
    @Test
    void los_importes_llevan_el_formato_de_su_moneda() throws Exception {
        try (Workbook libro = abrirExcel()) {
            Row pesos = primeraFilaDeDatos(libro.getSheet("Caja"), "Moneda");
            String formato = pesos.getCell(1).getCellStyle().getDataFormatString();

            assertThat(formato).contains("$").contains("#,##0.00");
        }
    }

    /** Una hoja por indicador, y las ocho. */
    @Test
    void el_libro_trae_una_hoja_por_indicador() throws Exception {
        try (Workbook libro = abrirExcel()) {
            List<String> hojas = new ArrayList<>();
            libro.sheetIterator().forEachRemaining(h -> hojas.add(h.getSheetName()));

            assertThat(hojas).containsExactly("Caja", "Ingresos por línea", "Alumnos cursando",
                    "Ocupación", "Cobros pendientes", "Retención", "Mix & Mastering", "Sello");
        }
    }

    // == Trazabilidad =========================================================

    /**
     * <b>La cabecera va en CADA hoja, no solo en la primera.</b> El escenario que
     * lo justifica: alguien copia la hoja "Caja" a otro libro y la manda por
     * mail. Sin la cabecera adentro, esa hoja suelta perdió el período, la fecha
     * y quién la generó — y ahí nace la planilla que nadie puede explicar.
     */
    @Test
    void cada_hoja_lleva_su_cabecera_de_trazabilidad() throws Exception {
        try (Workbook libro = abrirExcel()) {
            libro.sheetIterator().forEachRemaining(hoja -> {
                String cabecera = textoDe(hoja);

                assertThat(cabecera)
                        .as("la hoja %s tiene que decir de dónde salió", hoja.getSheetName())
                        .contains("La Juanita Studio")
                        .contains("Período: 01/04/2029 al 30/04/2029")
                        .contains("Generado:");
            });
        }
    }

    /**
     * <b>Quién pidió el archivo se lee de la base por el id del token.</b> Una
     * cabecera de trazabilidad que se pudiera escribir desde afuera no traza
     * nada; es la misma razón por la que la firma de una baja de nivel la escribe
     * el servidor.
     */
    @Test
    void la_cabecera_nombra_a_quien_pidio_el_archivo() throws Exception {
        Usuario quien = crear(Rol.DIRECTIVO);

        try (Workbook libro = abrir(excel(credencialPara(quien), null))) {
            assertThat(textoDe(libro.getSheet("Caja")))
                    .contains(quien.getNombre())
                    .contains(quien.getEmail());
        }
    }

    /** Y qué filtros lo generaron: la sala va por su nombre, no por su id. */
    @Test
    void la_cabecera_dice_la_sala_por_su_nombre() throws Exception {
        try (Workbook libro = abrir(excel(comoAdmin(), 1L))) {
            assertThat(textoDe(libro.getSheet("Caja"))).contains("Sala: Sala 1");
        }

        try (Workbook libro = abrirExcel()) {
            assertThat(textoDe(libro.getSheet("Caja"))).contains("Sala: todas");
        }
    }

    /**
     * <b>Cada hoja dice si sus números son del período o de hoy.</b> En pantalla
     * eso está al lado de cada bloque; en un archivo que alguien abre tres meses
     * después esa pantalla no existe, y sin la aclaración leería "cobros
     * pendientes" bajo un título que dice abril y concluiría que esa deuda se
     * generó en abril.
     */
    @Test
    void cada_hoja_dice_si_es_del_periodo_o_una_foto_de_hoy() throws Exception {
        try (Workbook libro = abrirExcel()) {
            assertThat(textoDe(libro.getSheet("Caja"))).contains("Caja — del período");
            assertThat(textoDe(libro.getSheet("Cobros pendientes")))
                    .contains("Cobros pendientes — al día de hoy");
            assertThat(textoDe(libro.getSheet("Alumnos cursando")))
                    .contains("Alumnos cursando — al día de hoy");
        }
    }

    /** El nombre del archivo lleva el período: dos exportaciones no se pisan. */
    @Test
    void el_archivo_se_llama_con_su_periodo() throws Exception {
        String cabecera = mvc.perform(get(url("xlsx", null)).header("Authorization", comoAdmin()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getHeader("Content-Disposition");

        assertThat(cabecera)
                .contains("attachment")
                .contains("tablero-2029-04-01-a-2029-04-30.xlsx");
    }

    // == El PDF ===============================================================

    @Test
    void el_pdf_sale_y_es_un_pdf() throws Exception {
        byte[] archivo = mvc.perform(get(url("pdf", null)).header("Authorization", comoAdmin()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();

        // Los cuatro bytes mágicos. Que pese algo no alcanza: un archivo vacío
        // con Content-Type de PDF también "sale bien".
        assertThat(new String(archivo, 0, 4)).isEqualTo("%PDF");
        assertThat(archivo.length).isGreaterThan(1000);
    }

    // == Permisos =============================================================

    /**
     * <b>Se exporta lo que se puede ver.</b> STAFF no ve el tablero completo, así
     * que tampoco puede bajarlo: un endpoint de exportación con permisos más
     * flojos que su pantalla es la forma más silenciosa de filtrar datos.
     */
    @Test
    void el_staff_no_puede_exportar_el_tablero_completo() throws Exception {
        String suya = credencialPara(crear(Rol.STAFF));

        mvc.perform(get(url("xlsx", null)).header("Authorization", suya))
                .andExpect(status().isForbidden());
        mvc.perform(get(url("pdf", null)).header("Authorization", suya))
                .andExpect(status().isForbidden());
    }

    @Test
    void el_directivo_si_puede() throws Exception {
        mvc.perform(get(url("xlsx", null)).header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isOk());
    }

    @Test
    void un_usuario_comun_no_puede() throws Exception {
        mvc.perform(get(url("pdf", null)).header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /** El techo del período es el mismo que el del tablero: la exportación no lo esquiva. */
    @Test
    void un_periodo_de_mas_de_un_ano_tampoco_se_exporta() throws Exception {
        mvc.perform(get("/api/tablero/exportacion.xlsx?desde=%s&hasta=%s"
                .formatted(DESDE, DESDE.plusDays(400))).header("Authorization", comoAdmin()))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================

    private String url(String extension, Long idSala) {
        return "/api/tablero/exportacion.%s?desde=%s&hasta=%s%s"
                .formatted(extension, DESDE, HASTA, idSala == null ? "" : "&idSala=" + idSala);
    }

    private Workbook abrirExcel() throws Exception {
        return abrir(excel(comoAdmin(), null));
    }

    private byte[] excel(String credencial, Long idSala) throws Exception {
        return mvc.perform(get(url("xlsx", idSala)).header("Authorization", credencial))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
    }

    private Workbook abrir(byte[] archivo) throws Exception {
        return new XSSFWorkbook(new ByteArrayInputStream(archivo));
    }

    /** Todo el texto de una hoja, para buscar la cabecera adentro. */
    private String textoDe(Sheet hoja) {
        StringBuilder texto = new StringBuilder();
        for (Row fila : hoja) {
            for (Cell celda : fila) {
                if (celda.getCellType() == CellType.STRING) {
                    texto.append(celda.getStringCellValue()).append('\n');
                }
            }
        }
        return texto.toString();
    }

    /**
     * La primera fila de datos: la que sigue a la del encabezado de columnas.
     *
     * <p>Se busca por el nombre de la columna y no por un número de fila fijo,
     * porque la cabecera de trazabilidad mide lo que mide y agregarle una línea
     * no tiene por qué romper todos los casos.
     */
    private Row primeraFilaDeDatos(Sheet hoja, String primeraColumna) {
        for (Row fila : hoja) {
            Cell primera = fila.getCell(0);
            if (primera != null && primera.getCellType() == CellType.STRING
                    && primeraColumna.equals(primera.getStringCellValue())) {
                return hoja.getRow(fila.getRowNum() + 1);
            }
        }
        throw new AssertionError("No se encontró el encabezado '%s' en la hoja %s."
                .formatted(primeraColumna, hoja.getSheetName()));
    }

    private String comoAdmin() {
        return credencialPara(crear(Rol.ADMIN));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Exporta");
        usuario.setApellido("Prueba" + rol.name());
        usuario.setEmail("exporta-" + UUID.randomUUID() + "@lajuanita.local");
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
