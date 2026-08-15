# Auditoría adversarial de la base — 2026-08-12

Auditoría hecha **contra una base Postgres real**, no leyendo SQL. Se levantó
una base descartable desde cero (`V1`…`V5`), se corrieron los 69 casos
existentes, y después se atacó el esquema con una batería nueva diseñada para
violar las reglas que el proyecto daba por garantizadas.

**Encontró 10 formas de romper reglas que se creían protegidas.** Las diez
están corregidas en `V6__integridad_auditoria.sql` y fijadas con tests en
`apps/backend/src/test/resources/db/pruebas-adversariales.sql`.

Este archivo documenta **qué garantiza realmente la base y qué no**, que era la
pregunta de la auditoría.

> **Actualizado el 2026-08-14 (V9).** `platform.md` §13 —"Decisiones cerradas el
> 2026-08-14"— contestó las preguntas que mantenían abierta §6, y `V9` escribió
> cinco de las reglas que esta lista daba por huérfanas: nadie en dos salas a la
> vez (profesor y alumno), el nivel que no retrocede sin firma, no consumir más
> clases que las contratadas, `sala.activa` con significado, y la anulación de
> `egreso` y `venta_equipo` —que era la condición que V6 §7 se había puesto a sí
> misma para prohibirles el borrado—. **§6 queda con una sola regla sin dueño: la
> seña.** Los inventarios de abajo están al día con V9.
>
> **Actualizado el 2026-08-14 (V7).** La auditoría técnica del 13/08 encontró
> que este documento leyó *"nada se borra"* como una regla **financiera**, y por
> eso `reserva` y `reserva_participante` —que son el historial de clases, y la
> razón de ser del Módulo 1— quedaron afuera de §3. Eso, más la anulación de un
> pago sin autor y el `EXCLUDE` de bloqueos mal definido, se corrigió en
> `V7__auditoria_historial_y_bloqueos.sql`. Los inventarios y las tablas de
> abajo están al día con V7; §6 —las reglas sin dueño— creció, que es lo que
> hay que mirar primero.

---

## 1. Inventario real (post-V9, leído del catálogo, no de los archivos)

| Objeto | Cantidad |
|---|---|
| Tablas | 22 |
| Claves primarias | 22 (todas `BIGINT GENERATED ALWAYS AS IDENTITY`) |
| Claves foráneas | 52 — **todas `NO ACTION`** en DELETE y en UPDATE, verificado en `pg_constraint`. Las tres nuevas son de V9: los dos `id_usuario_anula` y `id_usuario_baja_nivel` |
| CHECK | 60 (43 en V1..V5 + 12 en V6 + 2 en V7 + 1 en V8 + 2 en V9) |
| UNIQUE | 7 + 6 índices únicos parciales |
| EXCLUDE | 3 (`reserva` por sala, `bloqueo_sala` —reescrito en V7— y **`reserva` por profesor, nuevo en V9**) |
| Triggers | 22 (7 de V1 + 3 de V6 + 4 de V7 + 8 de V9) |
| Funciones propias | 17 — 16 de trigger + `solapamiento_de_persona`, que **no** es de trigger: la comparten los dos triggers de V9 que verifican que una persona no esté en dos salas a la vez |
| Vistas | **0** |
| Extensiones | `plpgsql`, `btree_gist` |
| Tipos propios | 1 (`rango_horario`, V7: Postgres no trae un range de `time`) |
| Columnas generadas | 3 (`reserva.periodo`, `bloqueo_sala.dias`, `bloqueo_sala.franja`) |

Las 22 tablas del informe previo son correctas. No hay objetos fuera de la
documentación. **No hay ninguna columna monetaria en `float`/`double`**: las 12
son `NUMERIC`, `(14,2)` para importes y `(14,4)` para cotizaciones.

---

## 2. Dónde vive cada garantía

La tabla que importa: **qué está en la base, qué queda para el backend, y qué
no está en ningún lado.**

| Regla de negocio | Garantía |
|---|---|
| Nunca dos reservas solapadas en la misma sala | 🟢 `EXCLUDE USING gist` — verificado con concurrencia real |
| Solo los usos permitidos por sala | 🟢 FK compuesta a `sala_tipo_uso`, en INSERT **y** en UPDATE |
| Una sala bloqueada no acepta reservas | 🟢 Trigger + lock — **solo en READ COMMITTED** (§5) |
| No bloquear una sala con reservas activas | 🟢 Trigger + lock — ídem |
| Dos bloqueos no se solapan | 🟢 `EXCLUDE` (nuevo en V6) |
| Una sola inscripción ACTIVA por disciplina | 🟢 Índice único parcial |
| La inscripción descontada es del que asiste | 🟢 Trigger |
| Una nota va sobre una clase de ese alumno | 🟢 Trigger |
| Un pago salda exactamente un destino | 🟢 `num_nonnulls(...) = 1` |
| Todo importe en USD lleva cotización | 🟢 CHECK |
| La cotización es un número positivo | 🟢 CHECK (**nuevo en V6**) |
| Ningún importe es negativo | 🟢 CHECK (**completado en V6**) |
| Todo descuento lleva justificación | 🟢 CHECK |
| El premaster no se libera sin pago | 🟢 Trigger + protección del pago (**completado en V6**) |
| Los estados de mastering y release solo avanzan | 🟢 Trigger (**agujero cerrado en V6**) |
| El historial financiero no se borra | 🟢 **las cuatro** — `pago` y `trabajo_mastering` (V6), `egreso` y `venta_equipo` (**nuevo en V9**, cuando §13 les dio forma de anularse) |
| **El historial de CLASES no se borra** | 🟢 `reserva` y `reserva_participante` (**nuevo en V7**) — esta tabla lo daba por cubierto al decir "financiero", y no lo estaba |
| **La asistencia se edita con auditoría** | 🟢 Trigger que exige `id_usuario_modifico` y sella la fecha (**nuevo en V7**) |
| **Anular un pago exige autor, fecha y motivo** | 🟢 CHECK (**nuevo en V7**) — antes era la única excepción del esquema que no pedía explicación |
| **Invalidar un comprobante exige autor, fecha y motivo** | 🟢 CHECK (**nuevo en V7**) |
| Toda venta queda con su fecha de carga | 🟢 `venta_equipo.fecha_registro` (**nuevo en V7**) |
| Dos bloqueos no se pisan | 🟢 `EXCLUDE` sobre rango de fechas **y** franja horaria (**rehecho en V7**): el de V6 leía la fila como un intervalo continuo y rechazaba bloqueos legítimos |
| **No se asigna horario sin seña o pago** | 🔴 **En ningún lado** (§6) — **la única que queda sin dueño.** §13 cerró P8 (*no hay excepción*) pero no dijo a qué reservas alcanza: una clase de una inscripción ya paga no lleva seña propia |
| **El nivel no retrocede sin autorización** | 🟢 Trigger que exige autor, fecha y motivo (**nuevo en V9**). §13 definió que *autorizar* es **firmar**, no consultar un permiso |
| Una clase se recupera una sola vez | 🟢 Índice único parcial |
| No se borra a alguien con historial | 🟢 Las 46 FK en NO ACTION |
| **No consumir más clases que las contratadas** | 🟢 Trigger sobre `reserva_participante`, más el de reactivar una reserva cancelada (**nuevo en V9**). §13 definió qué cuenta como consumida |
| **Un profesor no está en dos salas a la vez** | 🟢 `EXCLUDE` sobre `(id_profesor, periodo)` (**nuevo en V9**) — una sola tabla, así que aguanta concurrencia |
| **Un alumno no está en dos salas a la vez** | 🟢 Trigger (**nuevo en V9**), y no `EXCLUDE`: el alumno vive en `reserva_participante` y el horario en `reserva`. Mismo hueco de concurrencia que los triggers de `bloqueo_sala` |
| El pagador es el titular de lo que paga | 🔴 En ningún lado (§6) |
| `sala.activa` / `tipo_uso.activo` / `profesor.activo` bloquean el uso | 🟡 **`sala.activa` ya no es decorativa** (**V9**): no acepta reservas nuevas a futuro y las cargadas siguen valiendo. Las otras dos siguen sin significado |
| Un teléfono no se repite | 🟡 Parcial: UNIQUE sobre el string crudo (§4) |
| Los estados de reserva/pago/inscripción solo avanzan | 🟡 No existe tal regla — los CHECK validan el valor, no la transición |
| El email tiene formato válido | 🟡 Backend (Bean Validation). La base solo exige no vacío |

---

## 3. Lo que se corrigió (V6)

Cada uno es un ataque que **funcionaba** antes de V6.

| # | Ataque que pasaba | Por qué importa |
|---|---|---|
| 1 | `precio_total`, `precio` y `precio_acordado` **negativos** | `pago` y `egreso` sí tenían el CHECK desde V1; estas tres no. No fue una decisión, fue un olvido — y un precio negativo baja el balance sin dar error |
| 2 | `cotizacion_dolar = 0` o negativa, en las 5 tablas | Con cotización 0, cien dólares cobrados **desaparecen del balance** y nada falla. El peor error contable: el silencioso |
| 3 | `revisiones_realizadas = 99` sobre 3 incluidas | El dato existe para responder "¿le quedan revisiones?" |
| 4 | Dos filas de `artista` sobre el mismo `id_usuario` | `alumno` y `profesor` llevan UNIQUE desde V1; `artista` no, sin razón de dominio |
| 5 | `telefono = ''` → el **segundo** usuario sin teléfono choca | `''` no es `NULL`, el índice parcial lo indexa. El usuario ve "teléfono duplicado" sin haber cargado ninguno. `UsuarioService.normalizar()` ya lo resolvía en el backend: esto es para que la base no dependa de que el backend se acuerde |
| 6 | **Anular o borrar el pago después de liberar el premaster** | Secuencia medida: pago PAGADO → libero premaster → `UPDATE pago SET estado_pago='ANULADO'`. Estado final: premaster entregado, cero cobros. Es exactamente lo que el Módulo 6 viene a evitar |
| 7 | `DELETE FROM pago` / `DELETE FROM trabajo_mastering` | La cabecera de V1 declara "Nada se borra" desde el principio. **Nada lo implementaba.** Ninguna tabla apunta a `pago`, así que no había ni una FK que lo frenara de rebote |
| 8 | `PAGADO → CANCELADO → A_CONFIRMAR` | La máquina de estados se revertía entera en **dos UPDATE**. El `CASE` del trigger no incluía `CANCELADO`, y el `ELSE 0` hacía que cualquier destino contara como "avanzar" |
| 9 | Reserva dentro de una sala bloqueada, bajo REPEATABLE READ | Ver §5 — el hallazgo menos intuitivo de la auditoría |
| 10 | Dos bloqueos solapados sobre la misma sala | Deja el calendario con dos motivos para la misma franja |

---

## 4. Teléfonos: qué garantiza y qué no

Verificado con inserciones reales. `usuario_telefono_unico` es un índice único
parcial sobre el **string crudo**. Entonces:

**Lo que garantiza:** dos filas con exactamente los mismos caracteres no
conviven.

**Lo que NO garantiza:** estas tres entraron sin protestar, y son el mismo
teléfono:

```
1155551234
+54 9 11 5555-1234
011 15 5555 1234
```

O sea que la regla de la propuesta —*"no se permiten alumnos duplicados por
teléfono"*— **está implementada solo para el caso en que las dos personas
escriban el número idéntico**, que es justo el caso que no hace falta atrapar.
Micaela cargando desde el Notion y alguien registrándose desde el celular van a
escribirlo distinto casi siempre.

Y al revés: el índice **bloquea un caso legítimo**. Dos hermanos que anotan el
teléfono de la madre no pueden tener cuenta los dos.

**No se cambió**, porque arreglarlo es decidir qué significa "duplicado", y eso
es una decisión de negocio. Las dos opciones honestas:

- **Normalizar**: guardar el teléfono tal cual lo escribieron, y hacer el UNIQUE
  sobre una columna generada que deje solo los dígitos y los últimos 10. Atrapa
  los tres casos de arriba.
- **Sacar la unicidad** y dejar el teléfono como dato de contacto, detectando
  duplicados como una *advertencia* en el alta en vez de un bloqueo. Resuelve el
  caso de los hermanos.

La segunda es más fiel a cómo trabaja el estudio; la primera es más fiel a la
propuesta escrita. Hay que elegir una.

---

## 5. Concurrencia: qué está resuelto y qué no

Probado con **dos sesiones psql en paralelo**, no razonando sobre el código.

### Lo que aguanta

**Dos reservas solapadas simultáneas** → una entra, la otra recibe
`conflicting key value violates exclusion constraint`. El `EXCLUDE` hace lo que
promete. Esta es la decisión más importante del esquema y está bien tomada: dos
triggers leyendo en paralelo no se ven entre sí y dejarían pasar las dos.

**Bloqueo y reserva simultáneos sobre la misma sala/franja** → la reserva es
rechazada, queda 0. El `SELECT ... FOR UPDATE` sobre la fila de `sala` serializa
las dos transacciones de verdad. Bajo READ COMMITTED cada sentencia toma un
snapshot nuevo, así que después de esperar el lock el trigger **sí ve** lo que
la otra sesión commiteó.

Reproducir:

```bash
# sesión A
psql -c "BEGIN;" -c "INSERT INTO bloqueo_sala ..." -c "SELECT pg_sleep(2);" -c "COMMIT;" &
# sesión B (0,5 s después)
psql -c "BEGIN;" -c "INSERT INTO reserva ...  -- misma sala y franja" -c "COMMIT;" &
```

### Lo que NO aguanta — y es contraintuitivo

**A partir de REPEATABLE READ, la regla del bloqueo se viola en silencio.**
Medido, misma secuencia:

| Nivel de aislamiento | Resultado |
|---|---|
| READ COMMITTED | reserva **rechazada** ✔ |
| REPEATABLE READ | reserva **entra en la sala bloqueada** ✘ |
| SERIALIZABLE | reserva **entra en la sala bloqueada** ✘ |

El motivo: el `FOR UPDATE` serializa, pero **la fila de `sala` nunca se
modifica**, así que no hay conflicto de escritura que dispare un error de
serialización. Y desde REPEATABLE READ el snapshot queda fijado al inicio de la
transacción: el `SELECT` sobre `bloqueo_sala` de adentro del trigger no ve el
bloqueo recién commiteado, por más que haya esperado el lock.

**Acá el nivel de aislamiento más estricto es el menos seguro.** Es exactamente
el error que va a cometer quien escriba el servicio de reservas pensando que
subir el aislamiento no puede hacer daño.

Como el trigger no puede leer datos frescos bajo esos niveles, V6 hace que la
transacción **se niegue a correr** en vez de dar una garantía falsa. Spring usa
READ COMMITTED por defecto, así que no cambia nada hoy.

> **Para quien escriba `ReservaService`:** no le pongas
> `@Transactional(isolation = REPEATABLE_READ)`. La base te va a frenar con un
> mensaje que explica por qué.

---

## 6. Pendiente de decisión (NO se tocó)

Estos son problemas **reales y demostrados**, pero corregirlos exige decidir
algo del negocio. Ninguno se implementó unilateralmente.

### 🔴 1. Se pueden consumir más clases que las contratadas

**Es la regla que el relevamiento marca como el problema principal de hoy** —
no saber cuántas clases le quedan a cada alumno.

Medido: una inscripción de `clases_contratadas = 8` acepta **9 filas** en
`reserva_participante`. La base no cuenta nada.

No se corrigió porque depende de una definición que todavía no existe:
**¿una clase recuperada consume cupo?** La reserva original queda
`REPROGRAMADA` y la nueva apunta a ella con `id_reserva_recupera` — pero si la
fila de participante de la original no se borra, un trigger que cuente a lo
bruto daría falsos positivos justo en el caso más común.

Hay que definir qué cuenta como "clase consumida" (probablemente:
participaciones cuya reserva no está `CANCELADA` ni `REPROGRAMADA`) y recién
ahí escribir el trigger.

### 🔴 2. Un profesor o un alumno pueden estar en dos salas a la vez

El `EXCLUDE` protege `(sala, período)`. **No existe nada equivalente para
`(profesor, período)` ni para `(alumno, período)`.** Ghezz puede figurar dando
clase en la Sala 1 y en la Sala 2 en el mismo horario; Juan puede estar anotado
en dos clases simultáneas en salas distintas.

Se puede resolver con dos `EXCLUDE` más, pero antes hay que confirmar:
¿un profesor puede supervisar dos salas a la vez en la práctica? Si la respuesta
es "a veces sí", la regla es una advertencia, no un bloqueo.

### 🟠 3. `sala.activa`, `tipo_uso.activo` y `profesor.activo` son decorativos

Se puede reservar una sala desactivada, con un tipo de uso desactivado, y
asignarle un profesor desactivado. Ninguna de las tres columnas hace nada.

Antes de enforzarlas hay que decidir qué significan: ¿"desactivada" quiere decir
*no se puede reservar más* o *no se ofrece pero las reservas viejas siguen*? La
segunda lectura necesita que la regla aplique solo a fechas futuras.

### 🟠 4. `egreso` y `venta_equipo` se pueden borrar

Se dejaron afuera del bloqueo de DELETE **a propósito**: a diferencia de `pago`
(→ `ANULADO`) y `trabajo_mastering` (→ `CANCELADO`), no tienen forma de
anularse. Prohibirles el borrado dejaría un error de carga grabado para siempre.

La solución es darles un estado de anulación, y eso es agregar una columna a una
tabla de plata: decisión de negocio.

### 🟠 5. `pago.id_usuario` no tiene que coincidir con el titular del destino

Juan puede figurar pagando la inscripción de Ana. Es inconsistente con el resto
del esquema: la regla análoga en `reserva_participante` **sí** está enforzada
por trigger desde V1.

Puede ser legítimo (un padre paga el curso del hijo). Si lo es, hay que
documentarlo; si no lo es, es un trigger de cinco líneas.

### 🔴 6. No se asigna horario sin seña o pago registrado

*Agregada el 2026-08-14 (DB-04a). No estaba en esta lista, y es una **regla dura
✅** de la propuesta: `platform.md:274`, reforzada en `:39` con la frase textual
del cliente — "Si no hay seña, el horario queda libre".*

Medido: un `INSERT INTO reserva` sin ningún pago asociado entra sin resistencia.

**Esta no va a vivir en la base, y hay que decirlo en vez de dejarla flotando.**
La relación va al revés (`pago.id_reserva`), así que en el momento del INSERT de
la reserva el pago todavía no existe: no hay constraint posible. Es una regla de
servicio — la reserva se crea junto con su seña, en una transacción — y lo que
falta decidir antes de escribirla es **P8**: qué cuenta como "autorización
explícita" para reservar sin seña, que sigue abierta.

### 🔴 7. El nivel de una inscripción puede retroceder

*Agregada el 2026-08-14 (DB-04b). También **regla dura ✅**: `platform.md:276`,
"el nivel actual no puede retroceder sin autorización de un administrador".*

Medido: `UPDATE inscripcion SET nivel='AVANZADO'` y después
`SET nivel='INICIAL'`, los dos pasan. `inscripcion_nivel_valido` valida el
**valor**, no la **transición**.

El esquema ya sabe expresar transiciones —lo hace en
`verificar_avance_estado_trabajo` y en `verificar_avance_estado_release`—, así
que la mitad mecánica es un trigger del mismo molde. Lo que falta definir es
"sin autorización de un administrador": la base no sabe quién opera. O se
resuelve en el servicio, o se replica el patrón de V7 §2 (una columna de autor
que el trigger exige cuando el nivel baja).

### 🟡 8. `reserva_horas_validas` no se llega a evaluar nunca

*Agregada el 2026-08-14 (DB-11), encontrada remediando otra cosa.*

`reserva.periodo` es una columna generada, y una columna generada se computa
**antes** que los CHECK. Con las horas al revés, `tsrange()` corta primero con
*"range lower bound must be less than or equal to range upper bound"*: un error
que no nombra las horas y no trae nombre de constraint, así que tampoco se puede
traducir a un mensaje útil.

No se arregla con una constraint: se valida el orden de las horas en el DTO,
cuando exista. El CHECK queda como defensa en profundidad. En `bloqueo_sala`
esto **sí** se pudo evitar —V7 hace que sus columnas generadas devuelvan NULL en
vez de explotar—, pero en `reserva` la columna viene de V1 y no se edita.

### 🟡 9. `trabajo_mastering.estado` vs `pago.estado_pago`

El informe anterior lo marcó como posible bug. **Investigado a fondo: es
redundancia real pero de riesgo acotado.**

- `trabajo_mastering.estado` es el estado del **trabajo** (A_CONFIRMAR →
  EN_PROCESO → ENTREGADO/DEBE → PAGADO).
- `pago.estado_pago` es el estado de **una transacción concreta**.

Se solapan solo en `PAGADO`/`DEBE`. Medido: se puede poner el trabajo en
`PAGADO` sin ninguna fila en `pago`, y nada los sincroniza.

**No es un bug de integridad**, porque el dato que manda para la plata es
`pago` — los reportes financieros se arman de ahí, no del trabajo. El estado del
trabajo es un *tablero de laburo*, y `DEBE` ahí significa "entregué y estoy
esperando", que es información de Ghezz, no contable.

**Clasificación: 🟡 redundancia aceptable, mal nombrada.** El modelo correcto
sería que el estado del trabajo no tuviera `PAGADO`/`DEBE` (que son estados de
cobranza) y se quedara con el ciclo de producción, derivando la cobranza de
`pago`. Cambiarlo ahora es tocar el CHECK, el trigger de la máquina de estados y
el vocabulario que Ghezz ya usa. **Recomendación: dejarlo, documentarlo, y no
construir ningún reporte financiero sobre `trabajo_mastering.estado`.**

---

## 7. Redundancias, clasificadas

| Qué se duplica | Clase | Veredicto |
|---|---|---|
| `moneda` + `cotizacion_dolar` en 5 tablas | **A — necesaria/histórica** | Es una foto del momento, no desnormalización. **No tocar** |
| `reserva.periodo`, `bloqueo_sala.periodo` | **B — derivada pero útil** | Obligatorias: el GiST necesita un rango. **No tocar** |
| `descuento_porcentaje` junto a `monto` neto | **B** | El porcentaje no calcula nada, registra *por qué* se cobró menos. **No tocar** |
| `alumno.nivel_ingreso` vs `inscripcion.nivel` | **F — dominio válido** | Nivel con el que entró vs. nivel que cursa. No es lo mismo |
| Cliente externo en `venta_equipo` y `trabajo_mastering` | **F — dominio válido** | `usuario.password_hash` es NOT NULL: no se puede crear un usuario para un comprador de mostrador. Costo real: si después se registra, su historial no se enlaza. **Documentado, no corregido** |
| `trabajo_mastering.estado` vs `pago.estado_pago` | **C→🟡** | Ver §6.6 |
| `usuario.especializacion`/`bio` vs `profesor.especialidad` | **C — peligrosa** | Dos columnas para el mismo dato, sin nada que las sincronice. Ver abajo |
| `artista` duplicando contacto de `usuario` | **C** | Hoy inofensivo (ningún artista tiene login). Al primer artista con cuenta hay que decidir cuál gana |
| `material.es_grupal` | **D — cosmética** | Totalmente derivable de `id_alumno IS NULL`, y el CHECK impide que se desincronicen. Inofensiva. **No vale una migración** |
| `usuario.estado_presencia` | **E — dato muerto** | Ver abajo |
| `alumno.fecha_ingreso` vs `usuario.fecha_creacion` | **F** | Pueden diferir legítimamente (alguien con cuenta desde marzo que se inscribe en agosto) |
| `seguimiento_alumno` vs `nota_profesor` | **F** | Ver abajo |

### `usuario.especializacion` vs `profesor.especialidad`

Auditado como pidió el encargo: **representan el mismo concepto** y ninguna
tiene ciclo de vida propio. Pero la respuesta correcta no es "normalizar":

`profesor` es el marcador de la **relación** (lo que arma el menú del portal, y
lo que `inscripcion.id_profesor` referencia). Esa tabla tiene que existir. Lo
que sobra es que el dato *especialidad* esté de los dos lados.

**El lugar correcto es `profesor.especialidad`**: la especialidad es un atributo
de *ser profesor*, no de *ser persona*. Un usuario que no da clases no tiene
especialidad. `usuario.especializacion` y `usuario.bio` **nunca se escriben**
desde el backend (verificado: no hay un solo `setEspecializacion`/`setBio` en
todo `apps/backend/src/main/java`).

No se borraron porque borrar columnas de `usuario` toca la entidad JPA ya
mapeada y eso es trabajo de backend, no de base. **Acción recomendada:** cuando
se construya el módulo de profesores, mover el dato a `profesor` y sacar las dos
columnas de `usuario` en una migración.

### `usuario.estado_presencia` — es dato muerto, demostrado

- **Quién lo modifica:** nadie. Cero `setEstadoPresencia` en el backend.
- **Trigger o función que lo mantenga:** ninguno.
- **Regla que lo respalde:** ninguna.
- **Pantalla que lo use:** ninguna (no aparece en `apps/platform/src`).
- **Deriva de las reservas:** `EN_CLASE` sí — es calculable con un JOIN a
  `reserva` por fecha y hora. Los otros tres (`ACTIVO`/`AUSENTE`/`OCUPADO`) son
  estado de presencia tipo chat, que no corresponde a nada de este dominio.

Está mapeado en `Usuario.java` con default `ACTIVO`, así que hoy todas las filas
dicen `ACTIVO` y siempre lo van a decir. Es herencia del modelo original del
cliente.

**No se eliminó** (no es un problema de integridad y borrar una columna mapeada
es cambio de backend). Queda documentado como candidato a baja.

### `seguimiento_alumno` vs `nota_profesor` — no se pisan

Auditadas: **son cosas distintas y las dos tienen sentido.**

| | `seguimiento_alumno` | `nota_profesor` |
|---|---|---|
| Cardinalidad | **1 por (profesor, alumno)** — `UNIQUE` | N por alumno |
| Historial | No: se pisa | Sí, es bitácora |
| Dato | Estado enumerado (`VA_BIEN`/`REQUIERE_ATENCION`/`EN_PAUSA`) | Texto libre |
| Timestamp | `fecha_actualizacion` (última) | `fecha_creacion` + `fecha_modificacion` |
| Para qué | Semáforo: "¿a quién hay que prestarle atención?" | Memoria: "¿qué le pasaba a este alumno?" |

Una es un **índice de atención** consultable de un vistazo, la otra es el
detalle. El solapamiento conceptual es aparente. **No refactorizar.**

---

## 8. Compatibilidad con JPA (para las 19 entidades que faltan)

Lo que va a requerir atención al mapear:

| Qué | Problema | Cómo se maneja |
|---|---|---|
| `reserva.periodo`, `bloqueo_sala.periodo` | Columnas **generadas**: Hibernate no puede insertarlas | `@Generated(EVENT = INSERT)` o `insertable=false, updatable=false`. Si se mapean normal, todo INSERT falla |
| `tsrange` | Sin tipo Java nativo | No mapearlo. Es interno del `EXCLUDE` |
| FK compuesta `(id_sala, id_tipo_uso)` | Hibernate mapea las dos FK por separado y **no sabe** que existe la compuesta | La violación llega como `DataIntegrityViolationException` genérica: hay que traducirla en `ManejadorDeErrores`, igual que ya se hizo con el email duplicado |
| `EXCLUDE` + los 10 triggers | Todos los errores llegan como `DataIntegrityViolationException` / `SQLException` genérica | **Cada regla necesita su traducción a un mensaje útil.** Hoy hay 1 traducida de ~14 |
| `release` | Palabra reservada en varios motores (no en Postgres) | Mapear con `@Table(name = "release")` explícito y no depender de la generación de nombres |
| CHECK como estados | No son ENUM de Postgres | `@Enumerated(EnumType.STRING)`, como ya hace `Usuario.rol`. **Los valores del enum Java tienen que coincidir exactamente con el CHECK** |
| `id_reserva_recupera` | FK auto-referencial | `@ManyToOne` a la propia entidad; ojo con el fetch para no cascadear lecturas |
| Defaults de la base (`now()`, `CURRENT_DATE`) | Hibernate manda NULL si el campo está mapeado y vacío | `insertable=false` + recargar, como ya hace `Usuario.fechaCreacion` |
| Aislamiento | Ver §5 | **No usar `@Transactional(isolation=...)` en reservas** |

---

## 9. Cobertura de tests

| Suite | Casos | Qué cubre |
|---|---|---|
| `pruebas-reglas-negocio.sql` | 69 | Que las reglas escritas funcionen. **69/69 sobre V1..V6** |
| `pruebas-adversariales.sql` | 40 | Que no se puedan violar. **40/40 sobre V1..V6** |
| Concurrencia (manual, §5) | 4 escenarios | Reservas simultáneas, bloqueo+reserva, REPEATABLE READ, SERIALIZABLE |

### Lo que los 69 originales no cubrían

Eran buenos tests, pero probaban el camino feliz de cada regla y **una sola
forma** de violarla. Lo que faltaba:

- **Geometría**: probaban solape parcial y reservas pegadas. Faltaban intervalo
  contenido, contenedor, idéntico, solape de un minuto y duración cero.
- **Esquives en dos pasos**: nada probaba `UPDATE` sobre una fila ya insertada.
  Ahí estaban 4 de los 9 agujeros (resucitar canceladas, extender bloqueos,
  revertir estados, anular el pago del premaster).
- **Borrados**: probaban que no se borre un usuario o una sala. No probaban
  borrar plata.
- **Rangos numéricos**: probaban que el descuento no se pase de 100, pero no que
  un precio no sea negativo ni que una cotización no sea cero.
- **Concurrencia y aislamiento**: cero cobertura.
- **Tablas sin ningún test**: `contrato_sello`, `notificacion`, `egreso`
  (`egreso` ahora tiene uno).

### Trampas del arnés de tests (valen para quien agregue casos)

Las dos que documenta el archivo original —no hardcodear IDs, y exigir que un
caso `ANDA` toque al menos una fila— son correctas y salvaron falsos positivos
reales. Se encontraron dos más escribiendo la batería nueva:

1. **Un `DELETE` no ve las filas que insertó un CTE de la misma sentencia.**
   El patrón `WITH x AS (INSERT ...) DELETE ... WHERE id = (SELECT ...)` borra
   cero filas y reporta "no afectó ninguna fila". Hay que usar dos sentencias.
2. **`BEGIN ISOLATION LEVEL ...` adentro de un `EXECUTE` de plpgsql** revienta
   con *"EXECUTE of transaction commands is not implemented"* — o sea que el
   caso da "rechazado ok" **sin haber probado nada**. Los dos casos de
   aislamiento pasaron así en la primera corrida. Se corrigieron con
   `SET SESSION CHARACTERISTICS`.

---

## 10. Lo que NO hay que tocar

Después de atacarlas, estas decisiones son correctas y no deberían
refactorizarse sin una razón de negocio:

1. **`EXCLUDE` en vez de trigger para el solapamiento de reservas.** Verificado
   bajo concurrencia real. Un trigger no aguantaría.
2. **La matriz `sala_tipo_uso` como tabla + FK compuesta.** Protege INSERT y
   UPDATE, y permite cambiar la regla sin deploy.
3. **Las 46 FK en `NO ACTION`.** Verificado en el catálogo: no hay un solo
   `CASCADE`. Es lo que impide perder historial de rebote.
4. **`num_nonnulls(...) = 1` en `pago`.** Evita contar un mismo importe en dos
   líneas de negocio.
5. **`moneda` + `cotizacion_dolar` repetidos.** Es correcto contablemente.
6. **`NUMERIC` para todo el dinero.** Sin un solo `float`.
7. **Estados como `VARCHAR` + CHECK en vez de `ENUM` de Postgres.** Agregar un
   valor a un ENUM es una migración más molesta de revertir.
8. **`seguimiento_alumno` separada de `nota_profesor`.** Ver §7.
9. **Los lock de fila en los triggers de sala.** Funcionan — con la salvedad de
   §5, ahora explícita.
10. **La salida `liberado_sin_pago` + motivo.** Que la regla tenga una escape
    hatch con rastro es lo que evita que se la esquive por afuera del sistema.

---

## 11. Qué resolver antes de construir encima

Por orden:

1. **Definir qué cuenta como "clase consumida"** y enforzar
   `clases_contratadas`. Es la razón por la que existe el módulo.
2. **Decidir la regla de doble reserva de profesor y de alumno.**
3. **Decidir qué significa `activa`/`activo`** en sala, tipo de uso y profesor.
4. **Elegir el criterio de teléfono duplicado** (§4).
5. **Darle anulación a `egreso` y `venta_equipo`**, o aceptar por escrito que se
   borran.
6. **Traducir los errores de la base a mensajes útiles** en `ManejadorDeErrores`
   — hoy hay 1 de ~14, y sin eso el front recibe un 500 opaco cada vez que se
   viola una regla que la base defiende bien.
