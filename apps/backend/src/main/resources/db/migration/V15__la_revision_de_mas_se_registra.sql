-- =============================================================================
-- V15 — LA REVISIÓN DE MÁS SE REGISTRA, NO SE PROHÍBE
--
-- Módulo 6, Mix & Mastering. Esta migración DESHACE una regla de `V6` §3, y es
-- la primera vez que el proyecto revierte una decisión de la auditoría del
-- esquema. Por eso el detalle.
--
-- QUÉ DECÍA `V6` §3:
--     CHECK (revisiones_realizadas <= revisiones_incluidas)
-- El ataque que lo motivó era real: `revisiones_incluidas = 3` con
-- `revisiones_realizadas = 99` pasaba, y ese número no significa nada.
--
-- POR QUÉ SALE:
-- `docs/requirements/platform.md` §9 tiene, entre las reglas duras marcadas
-- como confirmadas con el cliente: **"alerta al superar las revisiones
-- incluidas"**. Una alerta al superar algo que la base rechaza es imposible de
-- escribir. Las dos reglas no pueden convivir y hay que elegir cuál gana.
--
-- Gana §9, por la misma razón por la que P22 se resolvió a favor de la
-- entrevista: **`V6` §3 es una inferencia de la auditoría, §9 es una regla que
-- el cliente confirmó.** La auditoría leyó el campo como un contador que no
-- puede dar un número imposible; el negocio lo usa para responder otra cosa —
-- *"¿este trabajo se pasó de lo que se vendió?"*—, y esa pregunta no se puede
-- contestar si el hecho no se puede registrar.
--
-- Y encaja con lo que este mismo módulo ya decide dos veces: Ghezz trabaja con
-- flexibilidad deliberada según el cliente. `liberado_sin_pago` existe porque un
-- bloqueo sin salida se esquiva por afuera del sistema (`V1` §8.4). Una cuarta
-- revisión hecha a un cliente cercano es exactamente el mismo caso: pasa, y lo
-- que el sistema tiene que hacer es dejarlo escrito, no negar que pasó.
--
-- QUÉ QUEDA EN PIE:
-- `trabajo_revisiones_no_negativas` (`V1`) sigue: ninguna de las dos puede ser
-- negativa, que es la parte del ataque de `V6` que sí era un dato imposible.
-- Lo que se pierde es el techo, y lo reemplaza una pantalla que muestra
-- "4 de 3" en rojo — un hecho visible, que es más de lo que daba el CHECK.
-- =============================================================================

ALTER TABLE trabajo_mastering DROP CONSTRAINT trabajo_revisiones_coherentes;

COMMENT ON COLUMN trabajo_mastering.revisiones_realizadas IS
    'Cuántas revisiones se hicieron. PUEDE superar a revisiones_incluidas: esa es '
    'la alerta de §9, no un error. El techo que ponía V6 §3 se sacó en V15 porque '
    'hacía imposible registrar el hecho que la regla pide avisar.';
