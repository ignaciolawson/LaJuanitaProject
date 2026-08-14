# Prompt de remediación — LaJuanitaProject

> Se usa **después** de correr la auditoría y de que vos hayas leído el informe.
> Sesión nueva, `/clear` antes. Trabajá sobre una rama, no sobre `main`.

---

Vas a implementar correcciones sobre este repo a partir de una auditoría ya hecha.

## Entrada

Leé `docs/auditoria/informe-auditoria-2026-08.md` completo antes de tocar nada, y también `CLAUDE.md` (raíz) y `docs/sistema-gestion-plan.md`, que siguen siendo la fuente de verdad de las decisiones del proyecto.

**Hallazgos a corregir en esta sesión:**

```
[COMPLETAR: Los ID que vos eligas, obviamente pensando en que no sean muy pesados, anda proporcionandolos vos y obviamente no hacer todo de una, al final de la remediacion de los ids elegidos obviamente documentalo y propone por cuals seguir hasta completar el 100% de los ID en el docs de informe-auditoria]
```

**Fuera de alcance:** todo lo demás. Si mientras trabajás encontrás otro problema, anotalo al final y seguí. No lo arregles.

## Reglas de trabajo

1. **Un hallazgo por commit.** Mensaje: `fix(area): título del hallazgo [ID]`. Nada de commits que mezclan dos IDs.
2. **El cambio mínimo que resuelve el hallazgo.** No refactorices de paso, no renombres, no reordenes imports, no "aprovechés que estás ahí". Un diff que toca archivos que el hallazgo no menciona es un diff que no puedo revisar.
3. **Antes de editar un archivo, leelo entero.** Este repo tiene decisiones deliberadas que parecen errores: la comparación BCrypt contra un hash señuelo en logins fallidos es una defensa de timing, no código muerto; `/error` está en `permitAll` a propósito; el `AGENTS.md` de landing lo regenera Next. Si un cambio toca algo que `CLAUDE.md` justifica, pará y preguntame.
4. **Migraciones aplicadas no se editan.** Nunca modifiques `V1__baseline.sql`, `V2__datos_iniciales.sql` ni `V3__usuario_admin_inicial.sql`. Todo cambio de esquema va en una migración nueva `V4__...` con nombre descriptivo y comentario que explique el porqué, en el estilo de las existentes.
5. **Los conceptos que viven en cuatro capas se mueven juntos.** Si tocás un enum o un CHECK, actualizá en el mismo commit: la migración SQL, el enum Java, el tipo en `apps/platform/src/api/tipos.ts` y `docs/db/la_juanita_schema.dbml.txt`. Un commit que actualiza tres de cuatro es peor que no haber tocado nada.
6. **La documentación es parte del arreglo.** Si el cambio invalida algo escrito en `CLAUDE.md`, un README o los docs, editá la afirmación vieja — no dejes la nueva al lado de la anterior. Esa es la regla del repo.

## Verificación (obligatoria por hallazgo)

No declares un hallazgo resuelto sin evidencia de ejecución:

- Backend: `cd apps/backend && mvn test` (usar `mvn`, no `./mvnw`).
- Migraciones: aplicar sobre una base limpia y, si tocaste reglas de negocio, correr `apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql` según las instrucciones de su cabecera. Nunca contra la base de desarrollo.
- Front: `npm run build:landing` / `npm run build:platform` y el lint de la app tocada.
- Si el hallazgo era una regla de negocio o de seguridad, **agregá el test que fallaba antes del arreglo**. Un fix de seguridad sin test que lo cubra vuelve en tres meses.
- Si no podés verificar algo en este entorno (Docker apagado, falta credencial), decilo explícitamente y marcá el hallazgo como *implementado, sin verificar*, con el comando exacto que tengo que correr yo.

## Salida

Al terminar, en el chat (no en un archivo):

1. Tabla: ID / qué cambiaste / archivos tocados / cómo lo verificaste / estado (`resuelto` · `parcial` · `bloqueado`).
2. **Bloqueados**: los que no pudiste resolver y por qué — si es porque hace falta una decisión mía, planteame la decisión con las opciones y tu recomendación.
3. **Efectos colaterales**: qué otra cosa del sistema se comporta distinto ahora, aunque sea correcto.
4. **Encontrado de paso**: problemas nuevos que viste y no tocaste, en el mismo formato de hallazgo del informe.

Si un hallazgo del informe está mal diagnosticado y el código en realidad está bien, decilo y no lo "arregles". El informe es una entrada, no una orden.
