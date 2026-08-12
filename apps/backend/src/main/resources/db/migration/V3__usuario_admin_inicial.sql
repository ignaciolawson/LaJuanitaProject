-- =============================================================================
-- Usuario administrador inicial
--
-- Por qué esta migración existe y por qué no está en V2: una base recién creada
-- no tiene con qué loguearse. No se sembró antes a propósito -- guardar una
-- contraseña encriptada exige haber elegido el algoritmo primero, y sembrar un
-- hash con un método que después hay que cambiar obliga a migrar contraseñas,
-- que es de lo más molesto que hay.
--
-- El hash de abajo se generó con el MISMO BCryptPasswordEncoder que valida el
-- login en SeguridadConfig, así que es coherente por construcción. El test
-- UsuarioAdminInicialTest lo verifica en cada build: si alguien cambia el
-- encoder o el costo, el test falla acá y no en producción un lunes.
--
-- ⚠️  CREDENCIAL DE DESARROLLO. NO ES UNA CUENTA REAL.
--
--        email:      admin@lajuanita.local
--        contraseña: lajuanita2026
--
--     El dominio `.local` no existe y no se puede registrar: es deliberado,
--     para que esta cuenta no pueda recibir un mail de recuperación ni
--     confundirse con la de una persona.
--
--     ANTES DEL DEPLOY REAL (diciembre) hay que, en este orden:
--       1. crear los usuarios reales con sus propias contraseñas,
--       2. desactivar esta cuenta (UPDATE usuario SET activo = FALSE ...),
--     en una migración nueva. No se edita este archivo: ya está aplicado.
-- =============================================================================

INSERT INTO usuario (nombre_completo, email, password_hash, rol, activo)
VALUES (
    'Administrador',
    'admin@lajuanita.local',
    '$2a$10$3RgFcMtU7XoJIEhTxokRreW1H7VG9tGNCjZJCXbajVaQ58TU3Co7W',
    'ADMIN',
    TRUE
);
