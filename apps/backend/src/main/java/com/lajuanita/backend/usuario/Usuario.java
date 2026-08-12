package com.lajuanita.backend.usuario;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Identidad única de login. Cualquier persona -- alumno, profesor, cliente
 * ocasional -- es primero un usuario. {@code alumno} y {@code profesor} son
 * relaciones que cuelgan de acá, no reemplazos.
 *
 * <p>La contraseña vive solo como hash BCrypt en {@link #passwordHash}. No hay
 * campo de contraseña en claro en ningún lado, ni siquiera transitorio: si
 * alguien la olvida se resetea, no se recupera.
 */
@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Long id;

    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    /**
     * Credencial de acceso. Único sin distinguir mayúsculas -- lo impone el
     * índice {@code usuario_email_unico} sobre {@code lower(email)}, así que
     * las búsquedas de login tienen que ser case-insensitive también.
     */
    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Column(name = "telefono", length = 40)
    private String telefono;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "rol", nullable = false, length = 20)
    private Rol rol = Rol.USUARIO;

    @Column(name = "foto_perfil", length = 500)
    private String fotoPerfil;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_presencia", nullable = false, length = 20)
    private EstadoPresencia estadoPresencia = EstadoPresencia.ACTIVO;

    @Column(name = "bio", columnDefinition = "text")
    private String bio;

    @Column(name = "especializacion", length = 150)
    private String especializacion;

    /**
     * Baja lógica. Nada se borra en este sistema (ver la cabecera de
     * {@code V1__baseline.sql}): un usuario inactivo conserva su historial de
     * pagos y reservas, pero no puede iniciar sesión.
     */
    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    /** La escribe el DEFAULT de la base, no la aplicación. */
    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "ultimo_acceso")
    private OffsetDateTime ultimoAcceso;
}
