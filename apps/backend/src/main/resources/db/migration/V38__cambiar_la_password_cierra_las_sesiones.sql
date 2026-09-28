-- =============================================================================
-- V38 — Cambiar la contraseña cierra las sesiones abiertas
-- =============================================================================
--
-- Hasta acá un token valía hasta vencer pasara lo que pasara con la contraseña.
-- Con 8 horas era tolerable; con "Recordarme" (30 días) no: quien cambia la
-- contraseña porque sospecha que alguien entró a su cuenta tiene que poder
-- echarlo, y el token robado seguía sirviendo un mes.
--
-- `credenciales_desde` es el instante a partir del cual valen los tokens de esa
-- cuenta: `AutenticacionDesdeBase` rechaza cualquiera con `iat` anterior. Lo
-- escribe la aplicación (`Usuario.cerrarLasSesionesAbiertas`) cuando la persona
-- elige su contraseña y cuando administración se la resetea. La baja no lo
-- necesita: `activo = FALSE` ya corta en el pedido siguiente.
--
-- NULL = nunca se cerraron sesiones; todas las cuentas existentes nacen así y
-- nadie queda deslogueado por esta migración.
-- =============================================================================

ALTER TABLE usuario ADD COLUMN credenciales_desde TIMESTAMPTZ;

COMMENT ON COLUMN usuario.credenciales_desde IS
    'V38: los tokens firmados antes de este instante no valen. Lo escriben el cambio y el reseteo de la contrasena. NULL = nunca se cerraron sesiones.';
