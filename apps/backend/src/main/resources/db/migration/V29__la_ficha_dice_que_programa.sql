-- =============================================================================
-- V29 — La ficha dice qué programa, qué experiencia trae y cómo quiere cursar
--
-- Fase 4 de la cuarta barrida (`docs/mejoras.md` §16 · C2), decidida en
-- `docs/requirements/platform.md` §22 — P64 (el nivel sale de la experiencia
-- que el formulario ya pregunta) y P67 (la modalidad se guarda como dato; la
-- sesión virtual se carga igual en una sala).
--
--
-- QUÉ HABÍA, Y POR QUÉ NO ALCANZABA
--
-- El formulario de programas de la landing pregunta tres cosas que el sistema
-- necesita para inscribir: **qué programa** (DJ, Producción, mentoría), **qué
-- experiencia trae** (arranca de cero · algo por su cuenta · ya toca) y **cómo
-- quiere cursar** (presencial · virtual). Las tres viajaban adentro de
-- `detalle`, como una frase armada por el navegador: *"Convertite en DJ ·
-- Presencial en Pilar · arranca de cero"*.
--
-- Eso fue una decisión explícita de `V20`: *"ninguno de esos datos se usa para
-- crear nada"*. Y era cierta mientras el buzón sólo creaba cuentas. **Deja de
-- serlo con la Fase 6**: el alta completa desde el buzón (`POST
-- /api/solicitantes/{id}/inscripcion`) tiene que saber la disciplina para leer
-- el catálogo (`V28`) y prellenar el nivel desde la experiencia (P64), y no
-- puede hacerlo parseando una frase que la landing arma con sus propios
-- nombres. Es **exactamente** lo que `V27` §3 hizo con el horario: cambió la
-- premisa —el dato pasa a usarse para crear algo—, se revisa la decisión.
--
--
-- LO QUE ESTA MIGRACIÓN DECIDE
--
-- 1. **Tres columnas, no doce, y el criterio para acotarlo sigue siendo el de
--    `V20`.** Lo que aquella rechazó fueron columnas *"cuyo significado
--    depende de `interes`"*. Estas tres tienen UN significado cada una:
--    `disciplina` es la de `inscripcion` y `programa` (el mismo CHECK, y tiene
--    que seguir siéndolo); `experiencia` es cuánto ya hace la persona de eso;
--    `modalidad` es si viene a Pilar o se conecta. Lo que sigue en `detalle`
--    es lo que sólo un formulario pregunta: el recorrido de la mentoría
--    (*"toca hace 1 a 3 años"*), las categorías y el presupuesto de equipos.
--
-- 2. **Las tres son NULLABLE y NO se atan a `interes`.** Una ficha de CURSO sin
--    disciplina es válida, y una de cabina con disciplina también. No es
--    descuido: atarlas —`interes = 'CURSO'` ⇔ `disciplina IS NOT NULL`— obliga
--    a desplegar la landing y el backend a la vez, porque una landing vieja
--    manda fichas de curso sin el campo y el CHECK las rechazaría. Y lo que se
--    perdería no es un dato sino **un cliente real**, que es lo único que estos
--    formularios existen para no perder (`V20`, cabecera). El buzón muestra lo
--    que haya; con NULL, la ficha se lee como hasta hoy.
--
-- 3. **`experiencia` guarda lo que el formulario PREGUNTA, no un nivel.** El
--    formulario no ofrece inicial/intermedio/avanzado a propósito —*"en vez de
--    obligar a la persona a autodiagnosticarse antes de leer nada"*—, y P64
--    respeta eso: la ficha guarda la experiencia como dato, y el nivel se
--    **prellena** al inscribir (cero → INICIAL, algo → INICIAL, toca →
--    INTERMEDIO), editable por quien inscribe. Guardar acá el nivel ya
--    traducido sería tomar la decisión en la landing y esconderla.
--
--    El formulario de mentoría no pregunta experiencia previa: su público **ya
--    toca** (P67), así que manda `TOCA` fijo y pregunta otra cosa —hace cuánto—
--    que va a `detalle`. Meter esas respuestas acá sería una columna cuyo
--    significado depende de la disciplina: la excepción que `V20` rechazó.
--
-- 4. **`modalidad` es un dato de la ficha y NO de la reserva** (P67 ⏳). En el
--    sistema toda clase es una `reserva` en una `sala`, y una sesión virtual
--    se carga igual en la sala desde donde el profesor la da — que es lo que
--    pasa en la realidad. Si alguna vez dos profesores dan virtual a la misma
--    hora, ahí hace falta una sala "Virtual" sin exclusión de solapamiento, y
--    eso se decide aparte. Esta columna sólo le dice a quien inscribe lo que la
--    persona eligió.
--
-- 5. **CHECK y no FK a `programa`**, aunque `programa.disciplina` es UNIQUE
--    desde `V28` y el FK sería posible. Es la tercera copia de la misma lista
--    (`inscripcion_disciplina_valida`, `programa_disciplina_valida`, y ésta),
--    con el enum `Disciplina` de Java como cuarta: **una disciplina nueva es una
--    migración que toca los tres CHECKs**, igual que un rol nuevo toca seis
--    lugares. Se elige la copia por coherencia con las dos hermanas, y porque
--    la ficha no depende de que la fila del catálogo exista para seguir
--    diciendo la verdad sobre lo que la persona pidió.
-- =============================================================================


-- =============================================================================
-- 1. LAS TRES COLUMNAS
-- =============================================================================

ALTER TABLE solicitante
    ADD COLUMN disciplina  VARCHAR(20),
    ADD COLUMN experiencia VARCHAR(10),
    ADD COLUMN modalidad   VARCHAR(12);

-- El mismo CHECK que `inscripcion` y `programa`, con el mismo nombre de forma.
ALTER TABLE solicitante ADD CONSTRAINT solicitante_disciplina_valida
    CHECK (disciplina IS NULL OR disciplina IN ('DJ', 'PRODUCCION', 'MENTORIA'));

-- Lo que el formulario pregunta, con sus tres respuestas. No es un nivel.
ALTER TABLE solicitante ADD CONSTRAINT solicitante_experiencia_valida
    CHECK (experiencia IS NULL OR experiencia IN ('CERO', 'ALGO', 'TOCA'));

ALTER TABLE solicitante ADD CONSTRAINT solicitante_modalidad_valida
    CHECK (modalidad IS NULL OR modalidad IN ('PRESENCIAL', 'VIRTUAL'));

COMMENT ON COLUMN solicitante.disciplina IS
    'Que programa pidio. Mismo CHECK que inscripcion y programa; no es FK a '
    'proposito (V29, punto 5). NULL si el formulario no lo dijo -- no se ata a '
    'interes (punto 2).';

COMMENT ON COLUMN solicitante.experiencia IS
    'Lo que el formulario pregunta: CERO (arranca de cero), ALGO (algo por su '
    'cuenta), TOCA (ya toca o produce). NO es un nivel: el nivel se prellena '
    'desde aca al inscribir y quien inscribe lo puede cambiar (P64).';

COMMENT ON COLUMN solicitante.modalidad IS
    'PRESENCIAL o VIRTUAL. Dato de la ficha, no de la reserva: la sesion '
    'virtual se carga igual en una sala (P67).';
