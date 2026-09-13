package com.lajuanita.backend.usuario;

import java.util.List;

/**
 * Qué parte del Directorio pide una pantalla (P77).
 *
 * <p>Se filtra <b>en el servidor</b> y no en la pantalla, por lo de siempre:
 * filtrar del lado del cliente sobre una página de veinte es un listado que
 * miente a los veintiuno (§17 · H8). Y es un enum y no un {@code rol=...}
 * suelto porque "Equipo" es una definición —los roles administrativos, ADMIN
 * adentro— que tiene que vivir en un solo lugar.
 */
public enum GrupoDeCuentas {

    /** Todas las cuentas: el Directorio. */
    TODOS(List.of(Rol.values())),

    /** Quienes administran La Juanita: ADMIN, DIRECTIVO y STAFF. */
    EQUIPO(List.of(Rol.ADMIN, Rol.DIRECTIVO, Rol.STAFF));

    private final List<Rol> roles;

    GrupoDeCuentas(List<Rol> roles) {
        this.roles = roles;
    }

    public List<Rol> roles() {
        return roles;
    }
}
