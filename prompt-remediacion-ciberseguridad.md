# Prompt de remediación de ciberseguridad — LaJuanitaProject

> Se usa **después** de haber leído `informe-ciberseguridad-2026-09.md`.
> Sesión nueva, `/clear` antes. Trabajá sobre una rama, no sobre `main`.

---

Vas a implementar correcciones de seguridad sobre este repo a partir de una barrida ya hecha. **No es la auditoría de agosto**: es la de septiembre, que auditó la superficie construida después (portales, archivos, exportaciones, mastering, sello) y encontró 0 críticos, 2 altos y 5 medios. **La barrida está completa** — la Fase 1 (autenticación/JWT) cerró el 2026-09-24 sin hallazgos nuevos, así que el conteo y los IDs (`CS-01` a `CS-12`) son definitivos. La mayoría de los arreglos viven en archivos de despliegue que todavía no existen; esta sesión toca **solo lo que es código del repo y se puede verificar acá**.

## Entrada

Leé completos, antes de tocar nada:

1. `docs/auditoria/informe-ciberseguridad-2026-09.md` — la barrida. Los hallazgos son `CS-01` a `CS-12`; el backlog priorizado está en su §7.
2. `CLAUDE.md` (raíz) y `docs/sistema-gestion-plan.md` — siguen siendo la fuente de verdad de las decisiones del proyecto.
3. La **§3 del informe** ("Relación con la auditoría de agosto") y la **§5 de la auditoría de agosto** ("Riesgos conocidos y aceptados"): la lista de decisiones deliberadas que **no** se tocan.

## Alcance de ESTA sesión

Corregí, **en este orden**, y nada más:

```
CS-01   — la contraseña temporal alcanza los 32 endpoints de /api/me/**  (código + test)
CS-05   — next y sharp con CVE conocida                                   (deps + lockfile)
ADMIN   — desactivar el admin sembrado (admin@lajuanita.local)           (pendientes.md §1.4)
CS-09   — el comentario que explica por qué isUrlConEsquema es una defensa (1 comentario)
CS-10   — declarar las cabeceras de la API en vez de heredarlas de Spring (config explícita)
```

**Fuera de alcance en esta sesión, y por qué** — no los toques, ni "de paso":

- **`CS-03`, `CS-02` (1ª mitad), `CS-04`, `CS-07`** se arreglan en el `Dockerfile`, el `docker-compose.prod.yml` y la configuración del proxy — **archivos que todavía no existen** (`operacion.md:382-384`). Escribirlos es la tarea del deploy de octubre, no de una rama de código, y no se pueden verificar sin el proxy. Van juntos cuando exista ese trabajo.
- **`CS-06`** (Ley 25.326) tiene una mitad accionable (página de privacidad + línea en los formularios) que depende de **una dirección de contacto que todavía no existe** (`hola@lajuanitastudio.com` no está creada, `platform.md` §13) y una mitad que es **una decisión de negocio tuya** (hasta dónde llega "no se borra nada"). No es código que Claude Code cierre sin esas dos definiciones.
- **`CS-02` (2ª mitad)** — los `@Size` en los 33 componentes — es endurecimiento real pero es una tanda propia grande (M) y ninguno es explotable con el techo del proxy puesto. Si querés, va en su propia rama después; no la mezcles con CS-01.
- **`CS-08`, `CS-11`, `CS-12`** — endurecimiento y comentarios de bajo impacto; agrupables aparte cuando cierres el bloque 3. (La "confirmación en caliente de los IDOR" del bloque 3 del informe es una sesión de prueba con dos cuentas, no código: no entra en ninguna rama de remediación. Y la Fase 1 ya está cerrada — no la listes como pendiente.)

Si al final querés, te dejo enumerada la tanda de deploy y la de endurecimiento por separado; pero esta rama es solo los cinco de arriba.

## Reglas de trabajo

1. **Un hallazgo por commit.** Mensaje: `fix(sec): título del hallazgo [CS-0X]`. Nada de commits que mezclan dos IDs. El de deps es un commit; el del admin sembrado, otro.
2. **El cambio mínimo que resuelve el hallazgo.** No refactorices de paso, no renombres, no reordenes imports, no "aprovechés que estás ahí". Un diff que toca archivos que el hallazgo no menciona es un diff que no se puede revisar.
3. **Antes de editar un archivo, leelo entero.** Este repo tiene defensas deliberadas que parecen accidentes — y la propia barrida encontró tres defensas vivas cuyo comentario explica *otro* motivo (§8 del informe). Si un cambio toca algo que `CLAUDE.md` o la §5 de agosto justifican, **pará y preguntá**. En particular:
   - **No reabras ningún riesgo asumido**: el secreto commiteado, la comparación BCrypt señuelo, `/error` y `/actuator/health` abiertos, sin CSRF, token en `localStorage`, el registro que confirma el email, y que nada se borre físicamente. Están decididos.
   - **CS-01 se arregla por la AUSENCIA de la autoridad `ROLE_PASSWORD_PENDIENTE`, no enumerando los cuatro roles.** Enumerarlos convertiría a `SeguridadConfig` en el séptimo lugar a tocar para agregar un rol, y `CLAUDE.md` ya lleva la cuenta de los seis. El informe da el snippet exacto (§4.2).
4. **Las dos rutas que quedan abiertas en CS-01 van EXACTAS, no por prefijo.** `/api/me` (GET) y `/api/me/password` (POST) se abren; `/api/me/perfil` también cuelga de `MeController` y **no** debe quedar abierta. Un matcher por prefijo ahí es el bug que estás arreglando, al revés.
5. **Migraciones aplicadas no se editan.** El admin sembrado se desactiva por el camino que indique `pendientes.md` §1.4 / `operacion.md` — **no** editando `V3`. Si ese camino es una migración nueva, es `V37` (verificá el número libre en `CLAUDE.md`, que se movió varias veces); si es un `UPDATE` operativo documentado, seguí ese. Preguntá si no está claro cuál de los dos.
6. **Los conceptos que viven en cuatro capas se mueven juntos.** Ninguno de estos cinco toca un enum ni un CHECK, así que no debería aplicar — pero si CS-01 te lleva a tocar una autoridad que también está en TS, movelas en el mismo commit.
7. **La documentación es parte del arreglo.** CS-01 vuelve **falso** el docstring de `AutenticacionDesdeBase:52-58` ("justo lo necesario para salir del estado, y nada más") — corregilo en el mismo commit. Si un cambio invalida algo escrito en `CLAUDE.md` o los docs, editá la afirmación vieja, no dejes la nueva al lado.

## Verificación (obligatoria por hallazgo)

No declares un hallazgo resuelto sin evidencia de ejecución:

- **CS-01** — Backend: `cd apps/backend && mvn test` (usar `mvn`, no `./mvnw`). **Ampliá `CredencialVigenteTest` con un endpoint del portal antes de arreglar**: el informe pide `GET /api/me/estado-de-cuenta`, que hoy contesta 200 con la temporal y con el arreglo tiene que contestar 403. Sin ese caso agregado, el fix no está probado — los dos casos actuales prueban el eje de administración, donde el candado ya funcionaba. **El test que fallaba antes del arreglo es parte del arreglo.**
- **CS-05** — `npm update next sharp` (a 16.3.6 y 0.35.4 o superior), **rehacer el lockfile con `python scripts/completar-lockfile.py`** (obligatorio en este repo o `npm ci` se cae en el runner de Linux), y `npm run build:landing`. Confirmá con `npm audit --omit=dev` que las dos CVE se fueron.
- **CS-10** — declarar las cabeceras en `SeguridadConfig` (`.headers(...)`) de forma que el resultado observable **no cambie** respecto de los defaults actuales (siguen incluyendo `nosniff`): el objetivo es que dejen de depender de no tocarlas, no cambiar la respuesta. Verificá con `mvn test` que nada se rompe y, si podés, mirá las cabeceras de una respuesta real.
- **CS-09** — es solo un comentario; no hay test. Confirmá que no tocaste una línea de lógica.
- **ADMIN** — seguí el procedimiento de `pendientes.md` §1.4 y **verificá que la cuenta ya no puede loguearse** (o que el `activo`/estado quedó en falso), por el medio que ese documento indique.

Si no podés verificar algo en este entorno, decilo explícitamente y marcá el hallazgo como *implementado, sin verificar*, con el comando exacto que hay que correr.

## Salida

Al terminar, en el chat (no en un archivo):

1. Tabla: ID / qué cambiaste / archivos tocados / cómo lo verificaste / estado (`resuelto` · `parcial` · `bloqueado`).
2. **Bloqueados**: los que no pudiste resolver y por qué. Si es porque hace falta una decisión mía (el número del admin, el camino de baja), planteámela con las opciones y tu recomendación.
3. **Efectos colaterales**: qué otra cosa del sistema se comporta distinto ahora, aunque sea correcto — sobre todo cualquier endpoint de `/api/me/**` que pase a contestar 403 donde antes contestaba 200.
4. **Encontrado de paso**: problemas nuevos que viste y no tocaste, en el formato de hallazgo del informe.
5. **Actualizá el estado en `informe-ciberseguridad-2026-09.md`**: agregá al final de cada hallazgo resuelto una línea de remediación con fecha, como hizo la auditoría de agosto en su §8 — para que el informe siga siendo el registro de qué se hizo y cuándo.

Si un hallazgo del informe está mal diagnosticado y el código en realidad está bien, decilo y no lo "arregles". El informe es una entrada, no una orden.
