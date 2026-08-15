package com.lajuanita.backend.usuario;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import com.lajuanita.backend.usuario.dto.AltaUsuarioRequest;
import com.lajuanita.backend.usuario.dto.EdicionUsuarioRequest;
import com.lajuanita.backend.usuario.dto.Pagina;
import com.lajuanita.backend.usuario.dto.UsuarioCreado;
import com.lajuanita.backend.usuario.dto.UsuarioResumen;

import jakarta.validation.Valid;

/**
 * Administración de cuentas.
 *
 * <p>Acá aparece el primer control por rol real del sistema. Hasta ahora el
 * backend solo exigía estar autenticado; estas anotaciones son las que hacen
 * que el rol signifique algo del lado del servidor, y no solo que el menú
 * dibuje menos botones.
 *
 * <p>La asimetría entre leer y escribir es la razón de ser del rol
 * {@code DIRECTIVO}: ve todo el sistema y no puede tocar nada.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioService usuarios;

    public UsuarioController(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<UsuarioResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio));
        return Pagina.de(usuarios.listar(buscar, paginado));
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public UsuarioResumen porId(@PathVariable Long id) {
        return usuarios.porId(id);
    }

    /**
     * Alta con contraseña temporal. La respuesta trae esa contraseña **una sola
     * vez**: no se guarda en texto plano en ningún lado.
     */
    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public UsuarioCreado alta(@Valid @RequestBody AltaUsuarioRequest solicitud, Authentication quienPide) {
        return usuarios.altaPorAdministracion(solicitud, Autoridades.esAdmin(quienPide));
    }

    @PutMapping("/{id}")
    @PuedeOperar
    public UsuarioResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionUsuarioRequest solicitud,
            Authentication quienPide) {
        return usuarios.editar(id, solicitud, Autoridades.esAdmin(quienPide), idDe(quienPide));
    }

    /**
     * Contraseña temporal nueva para alguien que perdió la suya.
     *
     * <p>No hay mail, así que no puede haber un "olvidé mi contraseña": el
     * camino es este, y termina en Micaela pasando la contraseña nueva por
     * WhatsApp, igual que en el alta. La respuesta la trae <b>una sola vez</b>.
     */
    @PostMapping("/{id}/password-temporal")
    @PuedeOperar
    public UsuarioCreado resetearPassword(@PathVariable Long id, Authentication quienPide) {
        return usuarios.resetearPassword(id, Autoridades.esAdmin(quienPide), idDe(quienPide));
    }

    /** Baja o alta lógica. Nunca borrado: el historial se conserva siempre. */
    @PatchMapping("/{id}/activo")
    @PuedeOperar
    public UsuarioResumen cambiarActivo(@PathVariable Long id,
            @RequestParam boolean activo,
            Authentication quienPide) {
        return usuarios.cambiarActivo(id, activo, Autoridades.esAdmin(quienPide), idDe(quienPide));
    }

    // -------------------------------------------------------------------------

    /** El id sale del `sub` del token, nunca de la URL ni del cuerpo. */
    private Long idDe(Authentication quienPide) {
        return Long.valueOf(quienPide.getName());
    }

}
