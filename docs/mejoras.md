# La etapa de mejoras — después del MVP

> **Abierta el 2026-08-20, el día que cerró el Módulo 8.** Con los ocho módulos
> terminados, el proyecto deja de construir funcionalidad nueva por catálogo y
> pasa a mejorarse por uso: **Ignacio va a usar el sistema como usuario durante
> los próximos días y va a volver con una lista.**
>
> Este archivo es el lugar donde esa lista vive, y —más importante— **las reglas
> con las que se va a triagear, acordadas ANTES de tenerla.** Acordarlas antes es
> lo único que evita que una lista larga se convierta en meses de trabajo sin
> orden.

---

## 1. Por qué existe esta etapa

El veredicto de Ignacio al ver el sistema entero funcionando, y es el que la
abre: *"lo veo muy aburrido, poco intuitivo y demás"*.

**No es un hallazgo, es el plan cumpliéndose.** El front se construyó
función primero y nunca tuvo una pasada de diseño; el rediseño estaba agendado
desde el 2026-08-19 para el final, en una sola pasada, y §6f explica por qué se
podía posponer sin riesgo: **las reglas de negocio viven en la base y no en las
pantallas**, así que un rediseño no puede romper que una reserva necesite seña.

Lo que cambia ahora es que la etapa llegó.

---

## 2. La distinción que hay que sostener: "aburrido" ≠ "poco intuitivo"

Son dos problemas distintos, con costos y riesgos distintos, y **si entran
mezclados en la misma lista la pasada de diseño se come meses sin resolver el
segundo.**

| | **Aburrido** | **Poco intuitivo** |
|---|---|---|
| Qué es | Visual: tipografía, color, densidad, jerarquía | De flujo: no encuentro cómo hacer algo, o lo hago y no entiendo qué pasó |
| Cómo se arregla | Una pasada de diseño | Reordenar un flujo, cambiar textos, **o construir lo que falta** |
| Riesgo | Bajo. Las reglas están en la base | **Alto**: puede destapar funcionalidad faltante |
| Decisiones que necesita | De gusto | **Del negocio**, a veces |

*"No entiendo cómo hacer X"* casi nunca se arregla con estilos. Es el hallazgo
caro y el más valioso de testear en serio.

---

## 3. Cómo anotar un hallazgo

**Cuatro cosas, y la tercera es la que hace la diferencia:**

1. **En qué pantalla estabas.**
2. **Qué querías hacer.**
3. **Qué esperabas que pasara.**
4. **Qué pasó.**

Sin la 3, un *"esto es poco intuitivo"* obliga a adivinar un rediseño. Con la 3
se puede decidir si es un botón mal puesto, un texto que miente, o un endpoint
que no existe — que son tres trabajos completamente distintos.

No hace falta que sea prolijo ni que esté ordenado: eso lo hace el triage.

---

## 4. El triage: tres grupos, y uno no se puede postergar

| Grupo | Qué entra | Cómo se hace |
|---|---|---|
| **A · Front puro** | Estilos, textos, orden de una pantalla, qué se ve primero | Entra en la pasada de rediseño, todo junto |
| **B · Backend sin tocar el esquema** | Un endpoint nuevo que solo lee, un filtro, un cálculo | Ordenado y con tests, de a uno |
| **C · ⚠️ Backend que toca una regla o el esquema** | Una columna nueva, un CHECK, un trigger, cambiar qué es válido | **Migración `V19`+, y la disciplina completa** |

**El grupo C es el que no se puede hacer a las apuradas, y la razón es la misma
que rigió todo el proyecto: las migraciones son inmutables y se acumulan.** Una
regla mal escrita hoy no se corrige editando el archivo — se corrige con otra
migración encima, y el error queda en la historia para siempre. `V18` ya
enseñó lo barato que es pisarse: editarlo después de aplicado dejó a Flyway con
el checksum viejo y la aplicación sin arrancar.

Para el grupo C vale lo que funcionó tres veces seguidas (Módulos 6, 7 y 8):
**contestar las preguntas de negocio ANTES de escribir código.** Es lo que hizo
que ninguno de los tres se frenara a mitad de camino.

---

## 5. ⚠️ Las cinco de §6f ya están en la lista, y dos NO son retoques

`sistema-gestion-plan.md` §6f las tiene anotadas como *"retoques técnicos
pospuestos"*. **Dos de las cinco son funcionalidad, y si entran como retoques van
a parecer más baratas de lo que son:**

| # | Qué | Grupo real |
|---|---|---|
| 1 | El admin no debería cambiarse el nombre ni el mail | **B** — chico. El mail ya no lo cambia nadie; falta decidir si la regla es del rol o de la cuenta de `V3` |
| 2 | Que el rol ADMIN no use los servicios | **A** — es `menu.ts` y nada más. **Como menú, NUNCA como permiso**: como permiso rompe la separación de los dos ejes |
| 3 | **Solicitar reprogramación** | **B, y es una funcionalidad faltante, no un retoque.** La tabla existe desde `V1` y hasta tiene su trigger; no hay endpoint ni pantalla. El Módulo 4 se la debe |
| 4 | **Cotización del dólar por API** | **B/C, y es una integración nueva.** Solo como prellenado, nunca fuente de verdad, nunca tocando filas viejas. ❓ **Y arrastra una pregunta del negocio: ¿qué cotización — oficial, blue o MEP?** |
| 5 | No poder pedir un horario ya tomado | **B** — la maquinaria ya está. **Avisar, no bloquear**, y es un pre-chequeo, nunca la autoridad |

---

## 6. El timing, y por qué conviene un corte

**La lista se junta entera antes de que empiece el rediseño.** Un rediseño hecho
dos veces es el caro: si se arranca con la mitad de los hallazgos, se rehacen
pantallas que recién se habían hecho.

**Pero la lista necesita una fecha de corte.** *"Voy a volver con más"* sin fecha
es la forma en que una lista crece para siempre y no sale nada. La referencia:
**una semana de uso**, y después se congela en un plan. Lo que aparezca más tarde
entra en una segunda tanda, no en la primera.

El calendario que la rodea no se mueve: **octubre** tiene la decisión de hosting
(de la que dependen el deploy y el destino de los backups) y **diciembre** es la
meta, con piloto de uso real y migración del Notion de Micaela.

---

## 7. Dos cosas que conviene saber ANTES de testear

**⚠️ Nada se borra en este sistema, se anula.** Un pago mal cargado, una venta, un
egreso, una clase: la base rechaza el `DELETE` a propósito (`V6` y `V7` — es
historial de un negocio real y plata). **La primera vez se va a sentir como un
bug y no lo es.** Pero anotalo igual si te pasa: puede ser que el mensaje no lo
explique bien, y *eso* sí sería un hallazgo.

**Si querés empezar de cero**, es `docker compose down -v` **y** borrar
`apps/backend/archivos` — **las dos cosas juntas o ninguna**. Borrar solo una deja
la base apuntando a un PDF que no existe, que es exactamente el modo de falla que
el ensayo de restore del 2026-08-20 vino a cubrir.

Y para mirar las pantallas de cada rol, los usuarios de demostración están en
[`sistema-gestion-plan.md` §6d](sistema-gestion-plan.md) — todos con la
contraseña de desarrollo.

---

## 8. La lista

> Se llena a medida que Ignacio testea. Cada hallazgo con las cuatro cosas de §3;
> el grupo lo asigna el triage, no quien lo anota.

| # | Pantalla | Qué querías hacer | Qué esperabas | Qué pasó | Grupo |
|---|---|---|---|---|---|
| 1 | `/admin/ventas` | Marcar como cobrada una venta a un comprador **sin cuenta** | Un botón o una edición que registre el cobro | No existe — y no es un botón que falta: tampoco había forma de cargarla cobrada | **C** |

### 1 · Una venta a comprador externo no se puede cobrar nunca (2026-08-27)

**El detalle, porque el título suena a menos de lo que es.** `pago.id_usuario` es
`NOT NULL`: un pago necesita colgarse de una cuenta, y el comprador externo no
tiene. Las tres capas son coherentes y las tres dicen que no —el formulario
(`VentasPagina.tsx`, *"Para registrar el cobro el comprador tiene que tener
cuenta"*), el `@AssertTrue isCobroConCompradorConCuenta` del DTO, y el `NOT NULL`
de la base—, así que **esa venta no quedó sin cobro por un error de carga: no
había forma de cargarla cobrada.**

**La salida prevista no cubre este caso.** El Módulo 3 dejó anotado que una venta
sin cobro se anula y se recarga con su pago. Eso funciona **solo si el comprador
tiene cuenta**; el comprador externo —que no es un caso raro, porque las ventas
van contra el stock de Pioneer y el que compra un CDJ no se registra— queda
afuera.

**Tampoco hay atajo por API, y conviene saberlo antes de buscarlo:**
`POST /api/pagos` **sí** acepta `idVentaEquipo` como destino —es uno de los
cuatro—, así que la limitación de que `/admin/pagos` solo salde inscripciones es
secundaria. El que ata es `idUsuario`, `@NotNull` en el mismo record. La pantalla
no es el problema. Y el controller de ventas tiene tres endpoints —listar,
registrar, anular—: no hay ninguno que le agregue el cobro a una venta existente.

**Por qué es grupo C.** El arreglo de fondo es que un `pago` pueda apuntar a un
comprador externo, y eso es esquema: o `pago.id_usuario` se vuelve nullable con un
CHECK que exija identificación por alguno de los dos lados —la misma forma que
`venta_comprador_identificado` y que los dos caminos de la seña—, o el cobro de
una venta deja de ser un `pago`. **La primera opción toca la tabla más protegida
del sistema** (`V6` y `V7` prohíben borrar plata y exigen autor para anularla),
así que la pregunta de negocio va antes que el código, como en los Módulos 6, 7 y
8.

**El workaround mientras tanto, y su costo.** Darle cuenta al comprador exige
email válido y único; inventarlo mete basura en la tabla con la que después se
busca gente. Para un comprador de una sola vez conviene **dejar la venta sin cobro
y anotarlo en `notas`**: "no cobrada" es información verdadera —el sistema no sabe
de quién fue el pago— y es mejor que un pago colgado de una cuenta falsa. Lo que
no hay que hacer es ponerlo a nombre de otra cuenta real: le ensucia el estado de
cuenta a alguien que no compró nada.
