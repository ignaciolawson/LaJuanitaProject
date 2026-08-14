-- =============================================================================
-- Vencimiento de la contraseña temporal — hallazgo SEC-08 de la auditoría del
-- 2026-08-13, y la pieza que le faltaba a SEC-03.
--
-- `usuario.debe_cambiar_password` (V5) es un booleano sin fecha: dice QUE la
-- contraseña la generó administración, no CUÁNDO. Sin esa fecha no hay forma de
-- hacerla vencer, y una contraseña temporal que Micaela mandó por WhatsApp sigue
-- siendo válida para siempre si la persona nunca entra. Cualquiera que lea ese
-- chat —el teléfono prestado, el WhatsApp Web abierto en la compu del estudio—
-- entra y la cambia, que es justamente lo único que ese estado habilita: se
-- queda con la cuenta.
--
-- Se vuelve concreto en diciembre, cuando se den de alta ~80 cuentas de golpe y
-- buena parte no entre en semanas.
--
-- La fecha se escribe en los dos lugares que generan una contraseña temporal
-- (el alta por administración y el reseteo de SEC-03) y se borra al cambiarla.
-- =============================================================================

ALTER TABLE usuario ADD COLUMN password_temporal_desde TIMESTAMPTZ;

-- Las cuentas que hoy están esperando el cambio no tienen fecha. Se les pone la
-- de creación, que es cuando se generó la temporal: es el dato verdadero, no un
-- relleno. Con esto, una cuenta vieja que nunca entró queda vencida ya mismo,
-- que es exactamente lo que la regla quiere.
UPDATE usuario SET password_temporal_desde = fecha_creacion
 WHERE debe_cambiar_password;

-- Las dos columnas son una sola cosa dicha en dos campos, y por eso se exige que
-- no se contradigan. Sin esto, un UPDATE que baje el booleano y se olvide la
-- fecha —o al revés— deja una cuenta que el backend no sabe si venció.
ALTER TABLE usuario ADD CONSTRAINT usuario_password_temporal_coherente
    CHECK (debe_cambiar_password = (password_temporal_desde IS NOT NULL));

COMMENT ON COLUMN usuario.password_temporal_desde IS
    'Cuando se genero la contrasena temporal vigente. NULL si la persona ya eligio la suya. Ver V8.';
