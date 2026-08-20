package com.lajuanita.backend.archivo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

/**
 * El {@code StorageService} de §2.4, construido por fin en el Módulo 7.
 *
 * <p><b>Esta suite no levanta Spring y es a propósito.</b> Lo que hay que probar
 * acá no es un endpoint: es qué pasa cuando el archivo que llega no es lo que dice
 * ser, o cuando su nombre está armado para salirse de la carpeta. Eso se prueba
 * más rápido y más claro contra la clase sola, con una carpeta temporal.
 *
 * <p><b>Y la pregunta de la suite es una sola: ¿lo que se guarda es lo que dice
 * ser, y queda donde tiene que quedar?</b> Estos archivos se vuelven a servir —un
 * contrato se abre en el navegador de otra persona— así que las dos formas de
 * fallar acá terminan en la misma consecuencia: el sistema entrega algo que no
 * revisó nadie.
 */
class AlmacenamientoTest {

    /** {@code %PDF-1.4}, que es como empieza cualquier PDF real. */
    private static final byte[] PDF = "%PDF-1.4\nfake pero con el encabezado bien"
            .getBytes(StandardCharsets.US_ASCII);

    private static final byte[] PNG = new byte[] {
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 13 };

    private static final byte[] JPEG = new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x1B };

    @TempDir Path carpeta;

    private Almacenamiento almacenamiento;

    @BeforeEach
    void prepararlo() {
        almacenamiento = new AlmacenamientoEnDisco(
                new PropiedadesDeArchivos(carpeta.toString(), 1));
    }

    // == Lo que tiene que andar ==============================================

    @Test
    void guarda_un_pdf_y_lo_devuelve_igual() throws IOException {
        String clave = almacenamiento.guardar(archivo("contrato.pdf", PDF), "contratos");

        assertThat(almacenamiento.leer(clave).getContentAsByteArray()).isEqualTo(PDF);
    }

    @Test
    void reconoce_los_tres_tipos_aceptados() {
        assertThat(almacenamiento.guardar(archivo("a.pdf", PDF), "contratos")).endsWith(".pdf");
        assertThat(almacenamiento.guardar(archivo("b.png", PNG), "portadas")).endsWith(".png");
        assertThat(almacenamiento.guardar(archivo("c.jpg", JPEG), "portadas")).endsWith(".jpg");
    }

    /**
     * Dos archivos con el mismo nombre son dos archivos.
     *
     * <p>Parece obvio y no lo es: guardando por el nombre original, el segundo
     * contrato de un artista pisa al primero **y ninguna de las dos filas de la base
     * se entera**. Las dos apuntarían al mismo PDF, que sería el segundo.
     */
    @Test
    void dos_archivos_con_el_mismo_nombre_no_se_pisan() throws IOException {
        byte[] otro = "%PDF-1.4\notro contrato distinto".getBytes(StandardCharsets.US_ASCII);

        String primero = almacenamiento.guardar(archivo("contrato.pdf", PDF), "contratos");
        String segundo = almacenamiento.guardar(archivo("contrato.pdf", otro), "contratos");

        assertThat(primero).isNotEqualTo(segundo);
        assertThat(almacenamiento.leer(primero).getContentAsByteArray()).isEqualTo(PDF);
        assertThat(almacenamiento.leer(segundo).getContentAsByteArray()).isEqualTo(otro);
    }

    // == El contenido manda sobre el nombre ==================================

    /**
     * <b>El caso que justifica mirar los bytes.</b> Renombrar cualquier cosa a
     * {@code .pdf} cuesta un segundo, y el {@code Content-Type} del multipart lo
     * escribe el cliente HTTP: los dos los elige quien sube. Los primeros bytes los
     * pone el programa que generó el archivo.
     */
    @Test
    void un_ejecutable_renombrado_a_pdf_no_entra() {
        byte[] ejecutable = new byte[] { 'M', 'Z', (byte) 0x90, 0x00 };

        assertThatThrownBy(() -> almacenamiento.guardar(
                archivo("contrato.pdf", ejecutable), "contratos"))
                .isInstanceOf(ArchivoInvalidoException.class)
                .hasMessageContaining("mira el contenido");
    }

    /**
     * Y el otro lado: un PDF de verdad llamado {@code .exe} entra, y <b>llega al
     * disco con extensión {@code .pdf}</b>. La extensión no se copia del nombre: se
     * deduce del contenido, que es lo que hace imposible que un {@code .pdf.exe}
     * quede guardado con ese nombre.
     */
    @Test
    void la_extension_sale_del_contenido_y_no_del_nombre() {
        String clave = almacenamiento.guardar(archivo("contrato.pdf.exe", PDF), "contratos");

        assertThat(clave).endsWith(".pdf").doesNotContain(".exe");
    }

    @Test
    void un_archivo_vacio_no_entra() {
        assertThatThrownBy(() -> almacenamiento.guardar(archivo("vacio.pdf", new byte[0]), "contratos"))
                .isInstanceOf(ArchivoInvalidoException.class);
    }

    /** El mensaje dice cuánto pesa y cuánto se aceptaba: lo lee alguien que acaba de arrastrar un archivo. */
    @Test
    void un_archivo_mas_grande_que_el_maximo_no_entra() {
        byte[] gordo = new byte[2 * 1024 * 1024];
        System.arraycopy(PDF, 0, gordo, 0, PDF.length);

        assertThatThrownBy(() -> almacenamiento.guardar(archivo("gordo.pdf", gordo), "contratos"))
                .isInstanceOf(ArchivoInvalidoException.class)
                .hasMessageContaining("2,0 MB")
                .hasMessageContaining("1 MB");
    }

    // == No salirse de la carpeta ============================================

    /**
     * <b>El nombre lo elige quien sube, así que no puede llegar al disco.</b> Un
     * nombre con {@code ../} escribiendo fuera de la carpeta es la forma clásica de
     * dejar un archivo en cualquier lado del servidor. Acá ni siquiera se intenta
     * limpiar el nombre: se descarta entero y se genera uno.
     */
    @Test
    void un_nombre_con_puntos_no_escribe_fuera_de_la_carpeta() throws IOException {
        String clave = almacenamiento.guardar(
                archivo("../../../secreto.pdf", PDF), "contratos");

        assertThat(clave).doesNotContain("..").startsWith("contratos/");
        assertThat(Files.walk(carpeta).filter(Files::isRegularFile))
                .allSatisfy(a -> assertThat(a.normalize()).startsWithRaw(carpeta.normalize()));
    }

    /**
     * La otra mitad, y la que va a importar el día que alguien agregue un endpoint
     * que reciba la clave del cliente: leer con una clave que se sale de la carpeta
     * contesta <b>"no está"</b>, no el archivo.
     */
    @Test
    void una_clave_que_se_sale_de_la_carpeta_no_lee_nada() throws IOException {
        Files.writeString(carpeta.getParent().resolve("secreto.txt"), "esto no se sirve");

        assertThatThrownBy(() -> almacenamiento.leer("../secreto.txt"))
                .isInstanceOf(ArchivoInvalidoException.class)
                .hasMessageContaining("No está");
    }

    @Test
    void leer_algo_que_no_existe_dice_que_no_esta() {
        assertThatThrownBy(() -> almacenamiento.leer("contratos/2026/08/no-existe.pdf"))
                .isInstanceOf(ArchivoInvalidoException.class);
    }

    // == Borrar ==============================================================

    /**
     * El borrado existe para <b>una sola cosa</b>: limpiar el archivo que quedó
     * escrito cuando la transacción que iba a registrarlo se cayó. Ninguna regla del
     * negocio borra nada en este esquema.
     */
    @Test
    void borrar_saca_el_archivo_y_avisa_si_no_habia_nada() {
        String clave = almacenamiento.guardar(archivo("contrato.pdf", PDF), "contratos");

        assertThat(almacenamiento.borrar(clave)).isTrue();
        assertThat(almacenamiento.borrar(clave)).isFalse();
        assertThatThrownBy(() -> almacenamiento.leer(clave))
                .isInstanceOf(ArchivoInvalidoException.class);
    }

    // =========================================================================

    private MockMultipartFile archivo(String nombre, byte[] contenido) {
        // El content-type va bien a propósito en todos los casos: es el que manda
        // el cliente y por eso no prueba nada. Si un caso pasara solo porque acá
        // dice "application/octet-stream", estaría probando el content-type en vez
        // del contenido.
        return new MockMultipartFile("archivo", nombre, "application/pdf", contenido);
    }
}
