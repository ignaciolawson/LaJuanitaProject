package com.lajuanita.backend.docencia;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
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
import com.lajuanita.backend.docencia.dto.AltaMaterialRequest;
import com.lajuanita.backend.docencia.dto.AltaNotaRequest;
import com.lajuanita.backend.docencia.dto.AlumnoDelProfesor;
import com.lajuanita.backend.docencia.dto.ClasesDictadas;
import com.lajuanita.backend.docencia.dto.MaterialResumen;
import com.lajuanita.backend.docencia.dto.NotaResumen;
import com.lajuanita.backend.docencia.dto.SeguimientoRequest;
import com.lajuanita.backend.docencia.dto.SeguimientoResumen;
import com.lajuanita.backend.reserva.dto.ReservaResumen;

import jakarta.validation.Valid;

/**
 * El portal del profesor. Módulo 5.
 *
 * <p><b>Vive bajo {@code /api/me/profesor/**} y esa ruta es la decisión de
 * diseño.</b> Sigue la regla del portal —el id de quien pide sale del token, no
 * de la URL— y agrega el tramo {@code /profesor} porque <b>una misma persona
 * puede ser alumna y profesora a la vez</b>: Ghezz da clases y también alquila
 * cabina. Sin ese tramo, {@code /api/me/materiales} sería ambiguo — ¿los que subí
 * o los que me dieron? El tramo dice desde qué relación estoy mirando.
 *
 * <p><b>Ninguna anotación de rol, y no es un descuido.</b> Ser profesor es una
 * relación, no un permiso (§2.1), así que un {@code @PreAuthorize} no puede
 * decidirlo: quien no tiene fila en {@code profesor} recibe un 403 de
 * {@code DocenciaService}, que fue a buscarla. Un ADMIN sin esa fila tampoco
 * entra — administrar el estudio no es dar clases.
 *
 * <p><b>No hay ningún endpoint que escriba sobre una reserva</b>, y es la regla
 * dura de §8: el profesor ve su agenda y no la modifica. Mover una clase es de
 * administración, y la razón es de plata — una reserva arrastra su seña.
 */
@RestController
@RequestMapping("/api/me/profesor")
public class DocenciaController {

    private final DocenciaService docencia;

    public DocenciaController(DocenciaService docencia) {
        this.docencia = docencia;
    }

    // == Mi agenda ===========================================================

    /** Las clases que doy en el rango. Con sus alumnos: son los míos. */
    @GetMapping("/agenda")
    public List<ReservaResumen> miAgenda(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Authentication quienPide) {

        return docencia.miAgenda(Autoridades.idDe(quienPide), desde, hasta);
    }

    /**
     * Cuántas clases di en un período.
     *
     * <p>Cuenta, no liquida: P20 sigue abierta. Ver {@link ClasesDictadas}.
     */
    @GetMapping("/clases")
    public ClasesDictadas misClases(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Authentication quienPide) {

        return docencia.misClasesDictadas(Autoridades.idDe(quienPide), desde, hasta);
    }

    // == Mis alumnos =========================================================

    @GetMapping("/alumnos")
    public List<AlumnoDelProfesor> misAlumnos(Authentication quienPide) {
        return docencia.misAlumnos(Autoridades.idDe(quienPide));
    }

    /**
     * El semáforo de un alumno.
     *
     * <p>{@code PUT} y no {@code POST} porque hay uno solo por par
     * profesor-alumno: ponerlo y moverlo son el mismo gesto. Ver
     * {@link DocenciaService#fijarSeguimiento}.
     */
    @PutMapping("/alumnos/{idAlumno}/seguimiento")
    public SeguimientoResumen fijarSeguimiento(@PathVariable Long idAlumno,
            @Valid @RequestBody SeguimientoRequest solicitud,
            Authentication quienPide) {

        return docencia.fijarSeguimiento(Autoridades.idDe(quienPide), idAlumno, solicitud);
    }

    // == Notas privadas ======================================================

    /**
     * Las notas que YO escribí sobre ese alumno.
     *
     * <p>Nunca las de otro profesor, ni siquiera sobre el mismo alumno: la
     * consulta filtra por las dos cosas. Es la regla dura de §8 y es la razón por
     * la que este módulo existe — un Excel paralelo se lleva justamente porque
     * nadie quiere escribir en un campo que otro puede abrir.
     */
    @GetMapping("/alumnos/{idAlumno}/notas")
    public List<NotaResumen> misNotas(@PathVariable Long idAlumno, Authentication quienPide) {
        return docencia.misNotasSobre(Autoridades.idDe(quienPide), idAlumno);
    }

    @PostMapping("/notas")
    @ResponseStatus(HttpStatus.CREATED)
    public NotaResumen anotar(@Valid @RequestBody AltaNotaRequest solicitud,
            Authentication quienPide) {

        return docencia.anotar(Autoridades.idDe(quienPide), solicitud);
    }

    @PutMapping("/notas/{idNota}")
    public NotaResumen corregir(@PathVariable Long idNota,
            @Valid @RequestBody AltaNotaRequest solicitud,
            Authentication quienPide) {

        return docencia.corregirNota(Autoridades.idDe(quienPide), idNota, solicitud.contenido());
    }

    // == Material ============================================================

    /** Lo que subí. Con {@code idAlumno}, lo de ese alumno. Incluye lo no publicado. */
    @GetMapping("/materiales")
    public List<MaterialResumen> misMateriales(
            @RequestParam(required = false) Long idAlumno,
            Authentication quienPide) {

        return docencia.misMateriales(Autoridades.idDe(quienPide), idAlumno);
    }

    /** Subir material. Sin {@code idAlumno} es grupal. */
    @PostMapping("/materiales")
    @ResponseStatus(HttpStatus.CREATED)
    public MaterialResumen subir(@Valid @RequestBody AltaMaterialRequest solicitud,
            Authentication quienPide) {

        return docencia.subirMaterial(Autoridades.idDe(quienPide), solicitud);
    }

    /**
     * Publicar o esconder un material.
     *
     * <p>Es la regla dura *"los materiales se ven solo si el profesor los
     * habilitó"*, y sirve para preparar algo con anticipación y mostrarlo el día
     * de la clase.
     */
    @PatchMapping("/materiales/{idMaterial}/visibilidad")
    public MaterialResumen cambiarVisibilidad(@PathVariable Long idMaterial,
            @RequestParam boolean visible,
            Authentication quienPide) {

        return docencia.cambiarVisibilidad(Autoridades.idDe(quienPide), idMaterial, visible);
    }
}
