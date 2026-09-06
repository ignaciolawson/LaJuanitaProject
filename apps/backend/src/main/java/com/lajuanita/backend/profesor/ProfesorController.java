package com.lajuanita.backend.profesor;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.profesor.dto.AltaProfesorRequest;
import com.lajuanita.backend.profesor.dto.EdicionProfesorRequest;
import com.lajuanita.backend.profesor.dto.ProfesorResumen;

import jakarta.validation.Valid;

/**
 * Los profesores: quiénes son, y quién pasa a serlo.
 *
 * <p>⚠️ <b>Esto fue de solo lectura hasta el 2026-09-05, y no porque estuviera
 * planeado así.</b> El comentario que vivía acá decía que <i>"el alta y la baja
 * llegan con el Módulo 2, junto con la agenda del profesor"</i> — el Módulo 2
 * cerró el 2026-08-16, el 5 construyó la agenda y las seis pantallas del
 * profesor, y el alta nunca llegó. Quedó una tabla que seis pantallas leen y que
 * <b>ninguna capa del sistema sabía poblar</b>: la única forma de convertir a
 * alguien en profesor era un INSERT a mano. Es la quinta vez que este proyecto
 * encuentra algo que no está en ninguna capa, y como siempre, nada fallaba —
 * una capacidad que no existe no tiene nada que romper.
 *
 * <p>Lo encontró Ignacio usando el sistema, preguntando lo más simple que se
 * puede preguntar: <i>"¿cómo se lo da de alta como profe?"</i>.
 *
 * <p>Por defecto el listado devuelve solo los activos: asignarle un curso a
 * alguien que ya no da clases es un error de carga que conviene no ofrecer. Con
 * {@code ?incluirInactivos=true} vuelven todos, que es lo que necesita una
 * pantalla que muestre inscripciones viejas.
 */
@RestController
@RequestMapping("/api/profesores")
public class ProfesorController {

    private final ProfesorService profesores;

    public ProfesorController(ProfesorService profesores) {
        this.profesores = profesores;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public List<ProfesorResumen> listar(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return profesores.listar(incluirInactivos);
    }

    /**
     * Darle la relación de profesor a alguien que ya tiene cuenta.
     *
     * <p>{@code @PuedeOperar} y no {@code @PuedeLeerAdministracion}: esto escribe.
     * Un {@code DIRECTIVO} ve la lista y no da de alta a nadie, que es la línea
     * que separa a los dos roles administrativos en todo el sistema.
     */
    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ProfesorResumen alta(@Valid @RequestBody AltaProfesorRequest solicitud) {
        return profesores.alta(solicitud);
    }

    /**
     * Corregir la especialidad, o dar de baja al profesor.
     *
     * <p><b>No hay DELETE y no va a haberlo.</b> Dar de baja es {@code activo =
     * false}: la fila se queda para que quien dejó de dar clases pueda seguir
     * viendo el historial de las que dictó, y para que esas clases no queden
     * apuntando a nadie. Es el mismo criterio con el que este esquema no borra ni
     * un pago, ni una clase, ni un contrato.
     */
    @PutMapping("/{id}")
    @PuedeOperar
    public ProfesorResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionProfesorRequest cambios) {
        return profesores.editar(id, cambios);
    }
}
