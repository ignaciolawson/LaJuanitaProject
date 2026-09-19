-- =============================================================================
-- V36 — La ficha trae a los compañeros: un grupo pide desde la landing
--
-- Fase 3 de la décima barrida (`docs/mejoras.md` §22), decidida en
-- `docs/requirements/platform.md` §28 · P92.
--
--
-- EL PEDIDO
--
-- Ignacio: *"que el form pida todos los nombres y llegue al buzón"*, y sobre
-- los datos de los compañeros, *"todo obligatorio, que entre clean o no
-- entre"*. Una ficha de `V20` es UNA persona —nombre, apellido, mail,
-- teléfono— y un grupo de 2 o 3 no cabe en ella.
--
--
-- LO QUE HACE
--
-- §1  `solicitante_companero`: los que vienen CON quien llenó el formulario,
--     con los cuatro datos obligatorios (P92: sin mail no hay cuenta, sin
--     teléfono no hay WhatsApp con la clave). Cero filas para quien viene
--     solo; hasta dos, porque el grupo es de hasta tres y el que llena el
--     formulario ya es uno. Quien llenó el formulario ES la ficha y es el
--     referente del grupo (P88).
--
-- §2  Tres reglas: hasta dos por ficha; sólo en una ficha de CURSO que no sea
--     de mentoría (la mentoría es 1:1, P88); y no se borran — la ficha tampoco
--     (`V20` §3), y un compañero es parte de lo que la persona pidió.
--
--
-- LO QUE NO HACE
--
-- · No guarda "cuántos son": son 1 + los compañeros.
-- · No cruza compañeros con cuentas existentes: eso lo hace "Inscribirlo" al
--   dar de alta, por mail, como `darleCuenta` con la ficha (P92 · 4).
-- =============================================================================


-- =============================================================================
-- 1. LA TABLA
-- =============================================================================

CREATE TABLE solicitante_companero (
    id_companero     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitante   BIGINT       NOT NULL REFERENCES solicitante (id_solicitante),

    nombre           VARCHAR(80)  NOT NULL,
    apellido         VARCHAR(80)  NOT NULL,
    email            VARCHAR(150) NOT NULL,
    telefono         VARCHAR(40)  NOT NULL,

    fecha_creacion   TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT companero_nombre_no_vacio
        CHECK (btrim(nombre) <> '' AND btrim(apellido) <> ''),
    CONSTRAINT companero_contacto_no_vacio
        CHECK (btrim(email) <> '' AND btrim(telefono) <> '')
);

CREATE INDEX companero_por_ficha ON solicitante_companero (id_solicitante);

COMMENT ON TABLE solicitante_companero IS
    'V36 §1: los que vienen con quien lleno el formulario de un curso (hasta 2). Quien lo lleno es la ficha y el referente. Los cuatro datos obligatorios (P92).';


-- =============================================================================
-- 2. LAS REGLAS
-- =============================================================================

-- --- (a) Hasta dos, y sólo en un curso que no sea mentoría -------------------
CREATE OR REPLACE FUNCTION verificar_companero_de_ficha()
RETURNS TRIGGER AS $$
DECLARE
    v_interes    TEXT;
    v_disciplina TEXT;
    v_actuales   INTEGER;
BEGIN
    SELECT interes, disciplina INTO v_interes, v_disciplina
    FROM solicitante WHERE id_solicitante = NEW.id_solicitante;

    IF v_interes <> 'CURSO' THEN
        RAISE EXCEPTION
            'Los companeros van solo en una ficha de curso; esta pidio %.', v_interes;
    END IF;

    IF v_disciplina = 'MENTORIA' THEN
        RAISE EXCEPTION
            'La mentoria es 1:1 y no admite grupos (P67, P88).';
    END IF;

    SELECT count(*) INTO v_actuales
    FROM solicitante_companero
    WHERE id_solicitante = NEW.id_solicitante;

    IF v_actuales + 1 > 2 THEN
        RAISE EXCEPTION
            'Un grupo es de hasta 3 personas: quien llena el formulario y hasta '
            'dos companeros. Esta ficha ya tiene %.', v_actuales;
    END IF;

    RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER companero_hasta_dos_en_un_curso
    BEFORE INSERT ON solicitante_companero
    FOR EACH ROW EXECUTE FUNCTION verificar_companero_de_ficha();


-- --- (b) No se borra --------------------------------------------------------
--
-- La ficha no se borra (`V20` §3) y un compañero es parte de lo que la persona
-- pidió: borrarlo es cambiar el pedido. Se reutiliza la función de siempre,
-- que enumera las salidas de cada tabla; la de ésta es la de su ficha.
CREATE OR REPLACE FUNCTION prohibir_borrado_historico()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'No se borran filas de %. Es historial de un negocio real: hay que '
        'anular la fila con su estado correspondiente (pago -> ANULADO, '
        'trabajo_mastering -> CANCELADO, reserva -> CANCELADA, '
        'reserva_participante -> CANCELADA, egreso -> anulado = TRUE, '
        'venta_equipo -> anulada = TRUE, solicitud_reserva -> CANCELADA, '
        'solicitante -> DESCARTADO, solicitante_companero -> su ficha, '
        'comprobante_pago -> invalido = TRUE, comprobante_egreso -> invalido = TRUE).',
        TG_TABLE_NAME;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER companero_no_se_borra
    BEFORE DELETE ON solicitante_companero
    FOR EACH ROW EXECUTE FUNCTION prohibir_borrado_historico();
