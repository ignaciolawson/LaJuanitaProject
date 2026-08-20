package com.lajuanita.backend.mastering;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
import com.lajuanita.backend.mastering.dto.AltaTrabajoRequest;
import com.lajuanita.backend.mastering.dto.CobroRequest;
import com.lajuanita.backend.mastering.dto.EdicionTrabajoRequest;
import com.lajuanita.backend.mastering.dto.LiberacionRequest;
import com.lajuanita.backend.mastering.dto.TrabajoResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 6 — Mix & Mastering, del lado de administración.
 *
 * <p>Permisos como el resto de lo financiero: <b>cargar y mover</b> es ADMIN·STAFF,
 * <b>leer</b> suma DIRECTIVO. Ghezz opera como STAFF.
 *
 * <p><b>Cinco endpoints de escritura y ninguno es un PUT genérico</b>, y eso es el
 * diseño: editar el expediente, avanzar el estado, sumar una revisión, liberar el
 * premaster y cobrar son cinco hechos distintos. Metidos en un solo PUT, liberar un
 * premaster sería mandar un booleano en true junto con el resto del formulario — sin
 * motivo, sin autor y sin nada que distinga "lo liberé" de "guardé la ficha".
 *
 * <p><b>No hay DELETE.</b> `V6` §7 prohíbe borrar la fila; dar de baja un trabajo es
 * pasarlo a {@code CANCELADO}, que es un estado y queda a la vista.
 */
@RestController
@RequestMapping("/api/mastering")
public class MasteringController {

    private final MasteringService mastering;

    public MasteringController(MasteringService mastering) {
        this.mastering = mastering;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<TrabajoResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) EstadoTrabajo estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return mastering.listar(buscar, estado, pagina, tamanio);
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public TrabajoResumen porId(@PathVariable Long id) {
        return mastering.porId(id);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public TrabajoResumen registrar(@Valid @RequestBody AltaTrabajoRequest solicitud) {
        return mastering.registrar(solicitud);
    }

    /** El expediente: presupuesto, fechas y links. No el estado ni la liberación. */
    @PutMapping("/{id}")
    @PuedeOperar
    public TrabajoResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionTrabajoRequest solicitud) {
        return mastering.editar(id, solicitud);
    }

    /** Solo avanza: lo verifica el trigger de `V1` §8.5, no este método. */
    @PatchMapping("/{id}/estado")
    @PuedeOperar
    public TrabajoResumen cambiarEstado(@PathVariable Long id, @RequestParam EstadoTrabajo estado) {
        return mastering.cambiarEstado(id, estado);
    }

    /** Suma una. Puede pasarse de las incluidas: esa es la alerta de §9. */
    @PostMapping("/{id}/revision")
    @PuedeOperar
    public TrabajoResumen registrarRevision(@PathVariable Long id) {
        return mastering.registrarRevision(id);
    }

    /**
     * Libera el premaster.
     *
     * <p>Sin pago registrado, la base rechaza salvo que venga el motivo — y ahí
     * queda firmado quién liberó y por qué. Ver {@link LiberacionRequest}.
     */
    @PatchMapping("/{id}/premaster")
    @PuedeOperar
    public TrabajoResumen liberarPremaster(@PathVariable Long id,
            @RequestBody LiberacionRequest solicitud,
            Authentication quienPide) {

        return mastering.liberarPremaster(id, solicitud.motivo(), Autoridades.idDe(quienPide));
    }

    /** Cobra desde acá, sin pasar por `/admin/pagos`. Ver {@link CobroRequest}. */
    @PostMapping("/{id}/cobro")
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public TrabajoResumen cobrar(@PathVariable Long id,
            @Valid @RequestBody CobroRequest solicitud,
            Authentication quienPide) {

        return mastering.cobrar(id, solicitud, Autoridades.idDe(quienPide));
    }
}
