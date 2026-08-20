package com.lajuanita.backend.sello;

import java.time.LocalDate;

import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.sello.dto.ContratoResumen;

/**
 * Los contratos del sello.
 *
 * <p><b>Es el primer endpoint del sistema que recibe y devuelve un archivo</b>, y
 * las dos mitades tienen su cuidado:
 *
 * <ul>
 *   <li><b>Al subir</b>, el archivo va como {@code multipart} y los datos como
 *       parámetros, no como un JSON anidado: un multipart no lleva un cuerpo JSON
 *       además del archivo sin complicar al cliente para nada.
 *   <li><b>Al bajar</b>, el PDF sale por acá y no por una ruta estática. Un contrato
 *       tiene datos de un tercero: no puede quedar en una URL que se adivina o se
 *       comparte sin querer. Quien llega acá ya pasó por la anotación.
 * </ul>
 *
 * <p>{@code inline} y no {@code attachment}: se abre en el visor del navegador, que
 * es lo que uno quiere al chequear si el PDF adjunto es el correcto. El nombre igual
 * viaja, para cuando lo bajen.
 */
@RestController
@RequestMapping("/api/contratos")
public class ContratoController {

    private final ContratoService contratos;

    public ContratoController(ContratoService contratos) {
        this.contratos = contratos;
    }

    /**
     * @param idRelease en blanco = contrato general del artista, que respalda todos
     *                  sus lanzamientos. Es la mitad no obvia de la regla dura.
     */
    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ContratoResumen cargar(
            @RequestParam Long idArtista,
            @RequestParam(required = false) Long idRelease,
            @RequestPart("archivo") MultipartFile archivo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFirma,
            @RequestParam(required = false) String observaciones) {

        return contratos.cargar(idArtista, idRelease, archivo, fechaFirma, observaciones);
    }

    @GetMapping("/{id}/archivo")
    @PuedeLeerAdministracion
    public ResponseEntity<Resource> descargar(@PathVariable Long id) {
        Resource archivo = contratos.archivoDe(id);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(contratos.nombreDeDescarga(id)).build().toString())
                .body(archivo);
    }

    /** Ver {@code ContratoService#borrar}: se puede, salvo que respalde algo publicado. */
    @DeleteMapping("/{id}")
    @PuedeOperar
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrar(@PathVariable Long id) {
        contratos.borrar(id);
    }
}
