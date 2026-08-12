package com.lajuanita.backend.alumno;

import java.time.LocalDate;

import com.lajuanita.backend.usuario.Usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
 * Relación formativa de un usuario con el estudio. No todo usuario tiene fila
 * acá: quien solo alquila una cabina o manda un track a mastering nunca es
 * alumno.
 *
 * <p>Ojo: {@code disciplina} y {@code nivel_actual} NO viven acá, viven en
 * {@code inscripcion} -- un alumno puede cursar DJ y producción a la vez, y un
 * campo suelto en el alumno le pisaría el historial.
 */
@Entity
@Table(name = "alumno")
@Getter
@Setter
@NoArgsConstructor
public class Alumno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_alumno")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false, unique = true)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel_ingreso", length = 20)
    private NivelIngreso nivelIngreso;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_alumno", nullable = false, length = 20)
    private EstadoAlumno estadoAlumno = EstadoAlumno.ACTIVO;

    /**
     * Con valor por defecto en Java, no solo en la base.
     *
     * <p>La columna es {@code NOT NULL DEFAULT CURRENT_DATE}, pero ese DEFAULT
     * no se aplica nunca desde acá: Hibernate incluye la columna en el INSERT,
     * así que un {@code Alumno} nuevo sin fecha mandaría {@code NULL} explícito
     * y la base lo rechazaría. Con el valor acá, el alta funciona igual que
     * {@link #estadoAlumno}.
     */
    @Column(name = "fecha_ingreso", nullable = false)
    private LocalDate fechaIngreso = LocalDate.now();

    @Column(name = "ultimo_contacto")
    private LocalDate ultimoContacto;

    @Column(name = "instagram", length = 100)
    private String instagram;
}
