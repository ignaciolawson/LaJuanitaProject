package com.lajuanita.backend.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /**
     * Ignora mayúsculas a propósito: el índice único de la base es sobre
     * {@code lower(email)}, así que "Mica@..." y "mica@..." son la misma
     * persona y solo una de las dos puede existir. Buscar con igualdad exacta
     * dejaría afuera a quien escribe su mail con otra capitalización.
     */
    Optional<Usuario> findByEmailIgnoreCase(String email);
}
