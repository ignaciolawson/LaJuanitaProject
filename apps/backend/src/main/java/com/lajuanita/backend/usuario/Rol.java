package com.lajuanita.backend.usuario;

/**
 * Eje de PERMISOS: qué puede administrar del sistema. Es lo que lee Spring
 * Security.
 *
 * <p>Es independiente de las relaciones de negocio (tener fila en {@code alumno}
 * o en {@code profesor}), que son las que arman el menú del portal. Ghezz es
 * {@link #STAFF} <em>y</em> profesor <em>y</em> puede alquilarse una cabina para
 * él, las tres cosas a la vez y sin contradicción.
 *
 * <p>Son cuatro y no tres: la propuesta comercial promete cuatro roles
 * diferenciados, y el Módulo 8 distingue de verdad entre directivo y staff
 * ("solo directivos y socios ven el dashboard completo; Micaela ve el resumen
 * financiero básico"). Ver {@code docs/requirements/platform.md} §2.1.
 *
 * <p>Los valores tienen que coincidir con el CHECK {@code usuario_rol_valido}
 * de {@code V1__baseline.sql}. Agregar uno acá sin migración rompe los INSERT.
 */
public enum Rol {

    /** Ignacio, dirección técnica. Todo, incluida la administración de usuarios y roles. */
    ADMIN,

    /** Socios e inversores. Leen todo (dashboard completo, cualquier alumno). No escriben nada. */
    DIRECTIVO,

    /** Micaela, Ghezz. Operan: alumnos, reservas, pagos, M&M, sello. Resumen financiero básico. */
    STAFF,

    /** Alumnos, clientes ocasionales, profesores. Solo lo propio. */
    USUARIO;

    /**
     * ¿Este rol administra el sistema?
     *
     * <p>Sirve para proteger las cuentas administrativas de quien no es ADMIN:
     * Micaela ({@link #STAFF}) da de alta alumnos todo el día, pero no debería
     * poder editar ni desactivar la cuenta de un ADMIN o un DIRECTIVO. Sin esta
     * distinción podía dejar al sistema sin nadie que lo administre -- y se
     * comprobó que podía: desactivó al ADMIN y la cuenta quedó bloqueada.
     */
    public boolean esAdministrativo() {
        return this != USUARIO;
    }
}
