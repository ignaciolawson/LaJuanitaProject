package com.lajuanita.backend.archivo;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * Los archivos en una carpeta del servidor. La implementación de desarrollo de
 * §2.4 — y probablemente también la del primer deploy, sobre un disco del VPS.
 *
 * <h2>La clave que devuelve, y por qué tiene esa forma</h2>
 *
 * <p>{@code contratos/2026/08/9f2c…-1a.pdf}. Tres decisiones adentro:
 *
 * <ul>
 *   <li><b>El nombre es un UUID, no el que trajo el archivo.</b> Un nombre del
 *       cliente puede decir {@code ../../application.properties}, puede chocar con
 *       otro que ya está, y puede traer caracteres que Linux acepta y Windows no —
 *       este proyecto se desarrolla en uno y se despliega en el otro. El nombre
 *       original se guarda en la base, que es donde sirve: para que la descarga
 *       llegue llamándose como la persona espera.
 *   <li><b>La extensión sale del contenido reconocido</b>, no del nombre. Un
 *       {@code contrato.pdf.exe} no puede llegar al disco con esa extensión porque
 *       la extensión no se copia: se deduce.
 *   <li><b>Año y mes en la ruta.</b> No es estética: una sola carpeta con miles de
 *       archivos es incómoda de listar y de respaldar por partes, y con esto el
 *       backup incremental tiene por dónde cortar.
 * </ul>
 *
 * <h2>El huérfano, que es el error barato de los dos</h2>
 *
 * <p>Escribir un archivo no es transaccional y la fila que lo referencia sí. Los
 * dos órdenes posibles fallan distinto, y no da igual cuál:
 *
 * <ul>
 *   <li><b>Fila primero, archivo después:</b> si falla la escritura queda un
 *       contrato registrado cuyo PDF no existe. La regla dura del Módulo 7 —<i>no
 *       se publica un release sin contrato adjunto</i>— seguiría dándose por
 *       cumplida sobre un archivo que no está. <b>El sistema mentiría.</b>
 *   <li><b>Archivo primero, fila después:</b> si falla la fila queda un archivo que
 *       nadie referencia. Ocupa lugar y no le miente a nadie.
 * </ul>
 *
 * <p>Por eso el orden es archivo primero, y quien registra la fila borra el
 * archivo si su transacción no llegó a buen puerto. <b>El borrado es "mejor
 * esfuerzo" a propósito</b>: si tampoco se puede borrar, lo que queda es el error
 * barato, y hacer fallar la operación por no poder limpiar sería cambiar un
 * problema chico por uno grande.
 */
@Component
public class AlmacenamientoEnDisco implements Almacenamiento {

    private static final Logger log = LoggerFactory.getLogger(AlmacenamientoEnDisco.class);

    /** Ver {@link #enMegas}: el separador decimal no puede depender del servidor. */
    private static final Locale ESPANOL = Locale.forLanguageTag("es-AR");

    private final Path raiz;
    private final long tamanoMaximo;
    private final String tamanoMaximoLegible;

    public AlmacenamientoEnDisco(PropiedadesDeArchivos propiedades) {
        this.raiz = Path.of(propiedades.raiz()).toAbsolutePath().normalize();
        this.tamanoMaximo = propiedades.tamanoMaximoEnBytes();
        this.tamanoMaximoLegible = propiedades.tamanoMaximoMb() + " MB";

        try {
            Files.createDirectories(raiz);
        } catch (IOException e) {
            // Al arranque y no al primer archivo: una carpeta que no se puede
            // crear es un problema de configuración del servidor, y enterarse
            // cuando alguien sube un contrato es enterarse tarde y en la peor
            // pantalla. Es el mismo criterio con el que el secreto de firma
            // aborta el arranque en vez de avisar por log.
            throw new IllegalStateException(
                    "No se pudo preparar la carpeta de archivos en " + raiz, e);
        }
        log.info("Los archivos del sistema se guardan en {}", raiz);
    }

    @Override
    public String guardar(MultipartFile archivo, String carpeta) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ArchivoInvalidoException("No llegó ningún archivo.");
        }
        if (archivo.getSize() > tamanoMaximo) {
            throw new ArchivoInvalidoException(
                    "El archivo pesa %s y el máximo es %s."
                            .formatted(enMegas(archivo.getSize()), tamanoMaximoLegible));
        }

        TipoDeArchivo tipo = reconocer(archivo);
        String clave = "%s/%s/%s.%s".formatted(carpeta, mesDeHoy(),
                UUID.randomUUID(), tipo.extension());
        Path destino = resolver(clave);

        try {
            Files.createDirectories(destino.getParent());
            try (InputStream entrada = archivo.getInputStream()) {
                Files.copy(entrada, destino, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar el archivo en " + destino, e);
        }
        return clave;
    }

    @Override
    public Resource leer(String clave) {
        Path archivo = resolver(clave);
        if (!Files.isRegularFile(archivo)) {
            // Mismo criterio que el resto del sistema con lo que no existe: no se
            // dice si la clave está bien formada y el archivo falta, o si la clave
            // no significa nada. Las dos son "no está".
            throw new ArchivoInvalidoException("No está el archivo pedido.");
        }
        return new PathResource(archivo);
    }

    @Override
    public boolean borrar(String clave) {
        try {
            return Files.deleteIfExists(resolver(clave));
        } catch (IOException e) {
            log.warn("No se pudo borrar el archivo {}. Queda huérfano, que es el error barato.",
                    clave, e);
            return false;
        }
    }

    // =========================================================================

    /**
     * De clave a ruta, verificando que la ruta caiga adentro de la carpeta.
     *
     * <p><b>La verificación es redundante hoy y se hace igual.</b> Las claves las
     * genera {@link #guardar} y no pueden salirse; pero la clave viaja por la base
     * de datos y vuelve, y el día que alguien agregue un endpoint que la reciba del
     * cliente —o una migración de datos escriba una a mano— esta línea es la
     * diferencia entre servir un contrato y servir {@code application.properties}.
     * Un chequeo que solo sirve cuando alguien se equivoque en el futuro es
     * exactamente el que hay que dejar puesto.
     *
     * <p>{@code normalize()} antes de comparar es lo que hace el trabajo: sin él,
     * {@code contratos/../../secreto} arranca con la raíz y aun así sale de ella.
     */
    private Path resolver(String clave) {
        if (clave == null || clave.isBlank()) {
            throw new ArchivoInvalidoException("No está el archivo pedido.");
        }
        Path destino = raiz.resolve(clave).normalize();
        if (!destino.startsWith(raiz)) {
            throw new ArchivoInvalidoException("No está el archivo pedido.");
        }
        return destino;
    }

    /**
     * Qué es realmente este archivo, mirándole los primeros bytes.
     *
     * <p>Lee solo el encabezado: reconocer el tipo no necesita el archivo entero en
     * memoria, y con un techo de 10 MB por archivo eso importa apenas hay dos
     * personas subiendo a la vez.
     */
    private TipoDeArchivo reconocer(MultipartFile archivo) {
        byte[] encabezado;
        try (InputStream entrada = archivo.getInputStream()) {
            encabezado = entrada.readNBytes(TipoDeArchivo.bytesNecesarios());
        } catch (IOException e) {
            throw new ArchivoInvalidoException("No se pudo leer el archivo.");
        }

        TipoDeArchivo tipo = TipoDeArchivo.reconocer(encabezado);
        if (tipo == null) {
            throw new ArchivoInvalidoException(
                    "Ese archivo no es " + TipoDeArchivo.aceptados()
                            + ". Fijate que sea el archivo correcto: el sistema mira el contenido, "
                            + "no la extensión.");
        }
        return tipo;
    }

    private String mesDeHoy() {
        LocalDate hoy = LocalDate.now();
        return "%d/%02d".formatted(hoy.getYear(), hoy.getMonthValue());
    }

    /**
     * <b>Con el idioma puesto, no con el del servidor.</b> {@code formatted} sin
     * {@code Locale} usa el del sistema operativo, así que el mismo mensaje dice
     * "2,0 MB" en esta máquina y "2.0 MB" en el contenedor de Linux del deploy o de
     * CI. Para el usuario es cosmético; para un test que compara el texto es un
     * fallo que aparece solo en otra máquina, que es la peor forma de aparecer.
     * Este sistema le habla en español a gente en Argentina: la coma no depende de
     * dónde esté corriendo.
     */
    private String enMegas(long bytes) {
        return String.format(ESPANOL, "%.1f MB", bytes / 1024.0 / 1024.0);
    }
}
