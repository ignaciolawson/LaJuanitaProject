package com.lajuanita.backend.solicitante;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Quien viene CON el que llenó el formulario de un curso (`V36`, P92): hasta
 * dos por ficha, con los cuatro datos obligatorios — sin mail no hay cuenta,
 * sin teléfono no hay WhatsApp con la clave. Quien llenó el formulario es la
 * ficha y el referente del grupo (P88).
 *
 * <p>Sin setters: se crea con la ficha y no cambia (la base tampoco lo deja
 * borrar, `V36` §2 b). Si el dato está mal, se corrige al dar de alta la
 * cuenta, que es donde se corrige todo lo de la ficha (P66).
 */
@Entity
@Table(name = "solicitante_companero")
@Getter
@NoArgsConstructor
public class SolicitanteCompanero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_companero")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_solicitante", nullable = false)
    private Solicitante solicitante;

    @Column(name = "nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "apellido", nullable = false, length = 80)
    private String apellido;

    @Column(name = "email", nullable = false, length = 150)
    private String email;

    @Column(name = "telefono", nullable = false, length = 40)
    private String telefono;

    SolicitanteCompanero(Solicitante solicitante, String nombre, String apellido,
            String email, String telefono) {
        this.solicitante = solicitante;
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.telefono = telefono;
    }
}
