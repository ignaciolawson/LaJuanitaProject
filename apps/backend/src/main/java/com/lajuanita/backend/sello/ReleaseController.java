package com.lajuanita.backend.sello;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.pago.dto.MotivoRequest;
import com.lajuanita.backend.sello.dto.AltaAparicionRequest;
import com.lajuanita.backend.sello.dto.AltaReleaseRequest;
import com.lajuanita.backend.sello.dto.AparicionResumen;
import com.lajuanita.backend.sello.dto.ContratoResumen;
import com.lajuanita.backend.sello.dto.EdicionReleaseRequest;
import com.lajuanita.backend.sello.dto.ReleaseResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 7 — el catálogo del sello.
 *
 * <p><b>Permisos: leer es ADMIN·DIRECTIVO·STAFF, escribir es ADMIN·STAFF.</b> El
 * alcance dice <i>"Ghezz y administración total; dirección solo consulta;
 * profesores y alumnos sin acceso"</i>, que es exactamente lo que dan estas dos
 * anotaciones — Ghezz opera como STAFF, y "sin acceso" es lo que le pasa a un
 * USUARIO con cualquiera de las dos.
 *
 * <p><b>Publicar tiene su propio endpoint y no es un valor del cambio de estado.</b>
 * Es el mismo criterio que Mix & Mastering: cargar el link del premaster no es
 * entregarlo. Acá, mover un release a "en distribución" es editar; publicarlo es un
 * acto con una regla que lo puede rechazar y con una excepción que queda firmada.
 * Metido en el desplegable de estados, la regla dura del módulo se cruzaría eligiendo
 * una opción de una lista.
 *
 * <p><b>No hay DELETE de release.</b> `V18` §4 lo prohíbe: dar de baja un
 * lanzamiento es {@code CANCELADO}, que además es de una sola dirección.
 */
@RestController
@RequestMapping("/api/releases")
public class ReleaseController {

    private final ReleaseService releases;
    private final ContratoService contratos;

    public ReleaseController(ReleaseService releases, ContratoService contratos) {
        this.releases = releases;
        this.contratos = contratos;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<ReleaseResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) EstadoRelease estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return releases.listar(buscar, estado, pagina, tamanio);
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public ReleaseResumen porId(@PathVariable Long id) {
        return releases.porId(id);
    }

    /** Los que lo respaldan: el suyo y los generales de su artista. */
    @GetMapping("/{id}/contratos")
    @PuedeLeerAdministracion
    public List<ContratoResumen> contratos(@PathVariable Long id) {
        return contratos.queRespaldanAlRelease(id);
    }

    @GetMapping("/{id}/apariciones")
    @PuedeLeerAdministracion
    public List<AparicionResumen> apariciones(@PathVariable Long id) {
        return releases.apariciones(id);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ReleaseResumen crear(@Valid @RequestBody AltaReleaseRequest pedido) {
        return releases.crear(pedido);
    }

    @PutMapping("/{id}")
    @PuedeOperar
    public ReleaseResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionReleaseRequest pedido) {
        return releases.editar(id, pedido);
    }

    @PatchMapping("/{id}/estado")
    @PuedeOperar
    public ReleaseResumen cambiarEstado(@PathVariable Long id, @RequestParam EstadoRelease estado) {
        return releases.cambiarEstado(id, estado);
    }

    /**
     * Publicar.
     *
     * <p>Con el cuerpo vacío intenta publicar normal; si no hay contrato adjunto, la
     * base rechaza y la pantalla muestra <b>sus palabras</b>. Con un motivo escrito,
     * publica igual y lo deja firmado — el autor sale del token, no del cuerpo.
     *
     * <p>Reusa {@code MotivoRequest}, que es el mismo record que ya usan la anulación
     * de un pago, la de un egreso, la de una venta y la liberación de un premaster.
     * Cinco excepciones registradas con la misma forma: quien las lea después no
     * tiene que aprender cinco.
     */
    @PatchMapping("/{id}/publicacion")
    @PuedeOperar
    public ReleaseResumen publicar(@PathVariable Long id,
            @RequestBody(required = false) MotivoRequest pedido,
            Authentication quienPide) {

        return releases.publicar(id, pedido == null ? null : pedido.motivo(),
                Autoridades.idDe(quienPide));
    }

    @PostMapping("/{id}/apariciones")
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public AparicionResumen anotarAparicion(@PathVariable Long id,
            @Valid @RequestBody AltaAparicionRequest pedido,
            Authentication quienPide) {

        return releases.anotarAparicion(id, pedido, Autoridades.idDe(quienPide));
    }

    /** Ver {@code ReleaseService#borrarAparicion}: acá borrar sí está bien. */
    @DeleteMapping("/apariciones/{idAparicion}")
    @PuedeOperar
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void borrarAparicion(@PathVariable Long idAparicion) {
        releases.borrarAparicion(idAparicion);
    }
}
