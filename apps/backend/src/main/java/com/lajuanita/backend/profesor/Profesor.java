package com.lajuanita.backend.profesor;

import com.lajuanita.backend.usuario.Usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Relación docente de un usuario con el estudio.
 *
 * <p>Ser profesor NO es un rol de permisos: los profesores son
 * {@code Rol.USUARIO} con fila acá. El acceso a "mis alumnos" viene de esta
 * relación, no del rol -- por eso Ghezz puede ser STAFF y profesor a la vez.
 */
@Entity
@Table(name = "profesor")
@Getter
@Setter
@NoArgsConstructor
public class Profesor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_profesor")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false, unique = true)
    private Usuario usuario;

    @Column(name = "especialidad", length = 150)
    private String especialidad;

    @Column(name = "activo", nullable = false)
    private boolean activo = true;
}
