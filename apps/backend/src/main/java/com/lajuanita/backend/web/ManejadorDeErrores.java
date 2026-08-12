package com.lajuanita.backend.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.lajuanita.backend.auth.CredencialesInvalidasException;
import com.lajuanita.backend.auth.SesionInvalidaException;

/**
 * Traduce las excepciones a respuestas JSON con forma estable, para que el
 * front tenga siempre el mismo lugar donde buscar el mensaje.
 *
 * <p>Se usa {@link ProblemDetail} (RFC 7807), que es el formato que Spring ya
 * emite por su cuenta para los errores que maneja él: así no conviven dos
 * formas distintas de error en la misma API.
 */
@RestControllerAdvice
public class ManejadorDeErrores {

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ProblemDetail credencialesInvalidas(CredencialesInvalidasException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
        problema.setTitle("No se pudo iniciar sesión");
        return problema;
    }

    @ExceptionHandler(SesionInvalidaException.class)
    public ProblemDetail sesionInvalida(SesionInvalidaException e) {
        ProblemDetail problema = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, e.getMessage());
        problema.setTitle("Sesión inválida");
        return problema;
    }

    /**
     * Errores de Bean Validation. Devuelve además un mapa campo → mensaje para
     * que el formulario pueda marcar el input equivocado en vez de mostrar un
     * cartel general.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail datosInvalidos(MethodArgumentNotValidException e) {
        Map<String, String> porCampo = new LinkedHashMap<>();
        for (FieldError error : e.getBindingResult().getFieldErrors()) {
            porCampo.putIfAbsent(error.getField(), error.getDefaultMessage());
        }

        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Revisá los datos del formulario.");
        problema.setTitle("Datos inválidos");
        problema.setProperty("errores", porCampo);
        return problema;
    }
}
