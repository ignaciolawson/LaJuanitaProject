package com.lajuanita.backend.web;

// OJO con el paquete: en Boot 3 es `…boot.web.servlet.error.ErrorController` y
// en 4.1 es este. Verificado con `jar tf` sobre spring-boot-webmvc-4.1.0.jar.
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;

/**
 * El desagüe: todo error que no resuelve ningún {@code @ExceptionHandler}
 * termina reenviado internamente a {@code /error}, y hasta ahora lo atendía el
 * {@code BasicErrorController} de Spring Boot.
 *
 * <p><b>Por qué existe esta clase (ARQ-04).</b> El
 * {@code application.properties} declara que activando
 * {@code spring.mvc.problemdetails.enabled} deja de haber dos formatos de error.
 * No era del todo cierto: el de Spring seguía saliendo por esta puerta. Medido
 * contra la API corriendo, un {@code GET /error} contestaba
 * <pre>{"timestamp":"…","status":999,"error":"None"}</pre>
 * con un HTTP 500 — sin {@code detail}, que es el único campo que el front lee.
 *
 * <p>Y el front no se defendía: {@code cliente.ts} parsea ese JSON sin
 * problemas (es JSON válido), no encuentra {@code detail} y por eso <b>no entra
 * al {@code catch}</b> que existe justamente para poner un mensaje razonable
 * cuando el cuerpo no sirve. Quedaba el texto por defecto. Las dos mitades se
 * arreglaron: acá, y en el cliente.
 *
 * <p><b>No dice nada del error.</b> {@code /error} es {@code permitAll} —tiene
 * que serlo: es un reenvío interno, no un endpoint— así que cualquiera puede
 * pedirlo. El mensaje sale del código de estado y de ningún lado más: ni la
 * excepción, ni el {@code jakarta.servlet.error.message} que Spring deja en la
 * petición, que puede traer texto interno.
 */
@RestController
public class ErrorPorDefecto implements ErrorController {

    @RequestMapping("/error")
    public ResponseEntity<ProblemDetail> manejar(HttpServletRequest peticion) {
        HttpStatus estado = estadoDe(peticion);

        ProblemDetail problema = ProblemDetail.forStatusAndDetail(estado, mensajeDe(estado));
        problema.setTitle(estado.is5xxServerError() ? "Error inesperado" : "No se pudo procesar el pedido");

        // La dirección original, la que pidió el cliente -- no `/error`, que es
        // a dónde lo reenvió Spring. El resto de los errores de esta API traen
        // `instance` y conviene que este también.
        Object direccion = peticion.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        if (direccion instanceof String texto && !texto.isBlank()) {
            problema.setInstance(java.net.URI.create(texto));
        }

        return ResponseEntity.status(estado).body(problema);
    }

    /**
     * El estado que traía el reenvío. Si no hay ninguno —o trae algo que no es
     * un código HTTP: pidiendo {@code /error} a mano, Spring pone un
     * {@code 999}— es un 500, que es lo que efectivamente pasó.
     */
    private HttpStatus estadoDe(HttpServletRequest peticion) {
        Object codigo = peticion.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        if (codigo instanceof Integer numero) {
            HttpStatus estado = HttpStatus.resolve(numero);
            if (estado != null) {
                return estado;
            }
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    /**
     * Mensajes en español rioplatense, iguales a los que ya da
     * {@link ManejadorDeErrores} para el mismo caso: que la respuesta cambie de
     * texto según por qué camino interno salió sería confuso para quien la lee.
     */
    private String mensajeDe(HttpStatus estado) {
        return switch (estado) {
            case NOT_FOUND -> "No encontramos esa dirección.";
            case METHOD_NOT_ALLOWED -> "Esa dirección no acepta este tipo de pedido.";
            case UNSUPPORTED_MEDIA_TYPE -> "El formato del pedido no es el que esperamos.";
            case BAD_REQUEST -> "No pudimos interpretar el pedido.";
            case UNAUTHORIZED -> "Tu sesión no es válida. Volvé a entrar.";
            case FORBIDDEN -> "No tenés permiso para hacer esto.";
            default -> estado.is5xxServerError()
                    ? "Hubo un error inesperado. Probá de nuevo en un momento."
                    : "No se pudo completar la operación.";
        };
    }
}
