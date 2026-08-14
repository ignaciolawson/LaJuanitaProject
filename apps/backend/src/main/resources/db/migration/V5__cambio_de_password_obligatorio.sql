-- =============================================================================
-- Contraseña temporal: marca de "esta persona todavía no eligió su contraseña"
--
-- Contexto (decisión del 2026-08-12, cierra P18): la gente crea su propia
-- cuenta, sea alumno o no -- quien alquila una cabina y nunca cursa también
-- necesita entrar a ver sus reservas. Pero Micaela igual tiene que poder dar de
-- alta a alguien: los ~80 alumnos que hoy viven en su Notion no se van a
-- registrar solos, y mucha gente se anota por WhatsApp.
--
-- En ese caso el sistema genera una contraseña temporal, Micaela se la pasa por
-- WhatsApp (que es como ya trabaja hoy) y esta columna obliga a cambiarla en el
-- primer ingreso. Sin la marca, esa contraseña -- que pasó por un chat y la
-- conocen dos personas -- se quedaría para siempre.
--
-- Se eligió esto por sobre un mail de activación porque no hay, ni va a haber
-- pronto, infraestructura de correo (ver docs/sistema-gestion-plan.md §7).
-- =============================================================================

ALTER TABLE usuario
    ADD COLUMN debe_cambiar_password BOOLEAN NOT NULL DEFAULT FALSE;


-- Quien se registra solo elige su contraseña en el momento, así que arranca en
-- FALSE. El DEFAULT ya lo cubre; lo explícito es el alta hecha por
-- administración, que la pone en TRUE.
COMMENT ON COLUMN usuario.debe_cambiar_password IS
    'TRUE cuando la contraseña la generó administración y la persona todavía no la cambió. '
    'Bloquea el resto del sistema hasta que lo haga.';
