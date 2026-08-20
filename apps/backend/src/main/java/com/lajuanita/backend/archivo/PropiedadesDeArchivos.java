package com.lajuanita.backend.archivo;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

/**
 * Dónde se guardan los archivos y hasta cuánto pesan.
 *
 * <p>Lleva {@link Validated} por lo mismo que {@code PropiedadesJwt}: sin él las
 * anotaciones de abajo son decorativas y una propiedad mal puesta arranca igual,
 * para explotar el día que alguien sube un contrato.
 *
 * @param raiz     carpeta donde vive todo. En desarrollo, {@code ./archivos},
 *                 relativa a donde corre el backend. <b>Nunca dentro del repo
 *                 versionado</b> — está en el {@code .gitignore}, y en el deploy
 *                 es una ruta absoluta a un disco que sobreviva al contenedor.
 * @param tamanoMaximoMb techo por archivo. Un contrato escaneado pesa entre 100 KB
 *                 y 2 MB; 10 MB deja lugar de sobra sin que un error de carga
 *                 llene el disco.
 */
@Validated
@ConfigurationProperties(prefix = "lajuanita.archivos")
public record PropiedadesDeArchivos(

        @NotBlank String raiz,

        @Positive int tamanoMaximoMb) {

    public long tamanoMaximoEnBytes() {
        return (long) tamanoMaximoMb * 1024 * 1024;
    }
}
