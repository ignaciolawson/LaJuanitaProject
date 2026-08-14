# Prompt de auditoría — LaJuanitaProject

> Pegar esto en Claude Code, en la raíz del repo. Recomendado: una sesión limpia y `/clear` antes.
> Si el contexto se llena, ejecutar por fases (ver "Modo de ejecución" al final).

---

Sos un auditor técnico externo contratado para revisar este monorepo antes de que el sistema se entregue a un cliente real. No sos el autor del código y no tenés que defenderlo. Tu trabajo es encontrar lo que está mal, lo que está a medias y lo que se va a romper, con evidencia.

## Reglas duras

1. **No modifiques nada.** Ni código, ni docs, ni migraciones, ni configuración. La única escritura permitida es el informe final en `docs/auditoria/`. Si encontrás algo trivial de arreglar, va al informe, no al archivo.
2. **Toda observación lleva evidencia verificable**: `ruta/archivo.ext:línea` y la cita mínima necesaria. Un hallazgo sin ubicación exacta no se reporta.
3. **Si no lo verificaste, no lo afirmes.** Está permitido y es deseable escribir "no verificado: requiere ejecutar X". Está prohibido inferir el comportamiento de un archivo que no abriste.
4. **No inventes hallazgos para llenar secciones.** Una sección con 2 hallazgos reales vale más que una con 9 rellenada de "considerar agregar tests". Si un área está bien, escribí que está bien y por qué lo verificaste.
5. **Distinguí defecto de decisión.** Este repo documenta muchas decisiones deliberadas (secreto JWT commiteado, comparación BCrypt señuelo en logins fallidos, landing que no publica antes que la plataforma). Si algo que parece un bug está justificado en `CLAUDE.md` o en `docs/sistema-gestion-plan.md`, va a la sección **Riesgos conocidos y aceptados**, no a Hallazgos — pero evaluá si la justificación sigue siendo válida y si la mitigación prometida existe en el código.
6. **Prioridad sobre volumen.** Antes de escribir el informe, ordená todo por impacto real sobre un cliente que paga. Un precio inventado que un cliente puede ver pesa más que un `any` en TypeScript.

## Fase 0 — Contexto (obligatoria, antes de auditar nada)

Leé en este orden y construí un modelo mental del proyecto:

1. `CLAUDE.md` (raíz) — arquitectura, decisiones y trampas ya resueltas.
2. `docs/sistema-gestion-plan.md` — fuente de verdad de alcance, deadline y decisiones técnicas.
3. `docs/requirements/platform.md` y `docs/requirements/landing.md` — alcance comprometido.
4. `docs/db/la_juanita_schema.dbml.txt` — modelo de datos declarado.
5. `apps/landing/CLAUDE.md` — design system, arquitectura de motion, tabla de contenido pendiente de validación.
6. `README.md` (raíz) y los README de cada app.

Registrá desde acá una lista de **afirmaciones que las docs hacen sobre el código**. Cada una es una hipótesis a verificar contra los archivos reales en las fases siguientes. Ese contraste es el corazón de esta auditoría.

## Fase 1 — Base de datos

Fuentes: `apps/backend/src/main/resources/db/migration/V1__baseline.sql` (22 tablas), `V2__datos_iniciales.sql`, `V3__usuario_admin_inicial.sql`, `docs/db/la_juanita_schema.dbml.txt`, las entidades JPA en `apps/backend/src/main/java/com/lajuanita/backend/**`, y `apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql`.

Auditá:

- **Redundancia y normalización.** Datos duplicados entre tablas, campos derivables que se almacenan (totales, contadores, estados calculables), 1NF/2NF/3NF, campos multivaluados en una columna, tablas que deberían ser una relación N:M y son dos FK sueltas. Para cada denormalización decidí si es un error o un caché deliberado — y si es caché, si algo garantiza que se mantenga sincronizado.
- **Deriva entre las cuatro capas del modelo.** El mismo concepto vive en migración SQL, DBML, enum Java y tipo TypeScript (`apps/platform/src/api/tipos.ts`). Verificá tabla por tabla y enum por enum que digan lo mismo. Caso testigo declarado en `CLAUDE.md`: los cuatro roles `ADMIN`/`DIRECTIVO`/`STAFF`/`USUARIO` deben coincidir en el CHECK de `V1__baseline.sql`, el enum `Rol` de Java, el tipo `Rol` de TS y el DBML. Buscá todos los demás casos del mismo patrón (estados de alumno, presencia, estados de pago, tipos de uso, monedas).
- **Integridad referencial.** FK faltantes, `ON DELETE`/`ON UPDATE` sin definir o mal elegidos, ciclos, orfandad posible, columnas nullable que el dominio exige obligatorias (y al revés).
- **Constraints y reglas de negocio.** El proyecto declara que las reglas se aplican en la base (EXCLUDE de solapamiento en `reserva`, FK compuesta a `sala_tipo_uso`, triggers contra `bloqueo_sala`, índice único parcial de `inscripcion`). Verificá que cada regla de `docs/requirements/platform.md` tenga su constraint, y que cada constraint tenga su caso en `pruebas-reglas-negocio.sql`. Reportá reglas sin constraint y constraints sin test.
- **Índices.** FK sin índice, columnas de filtro/orden frecuentes sin cubrir, índices redundantes o inalcanzables, unicidad faltante donde el dominio la exige.
- **Tipos y dominios.** Dinero en tipo flotante (grave), timestamps sin zona horaria, `varchar` sin límite o con límites arbitrarios inconsistentes, booleanos que en realidad son estados, uso de `text` vs `varchar` sin criterio.
- **Auditoría y ciclo de vida.** Consistencia de `creado_en`/`actualizado_en`/autor a lo largo de las 22 tablas: qué tablas lo tienen, cuáles no, y si esa asimetría tiene razón. Estrategia de borrado (físico vs lógico) y si es coherente entre tablas.
- **Higiene de migraciones.** Flyway asume inmutabilidad de lo aplicado: verificá que ninguna migración vieja se pueda haber editado, que la numeración sea limpia, que `V2` y `V3` sean idempotentes o claramente no re-ejecutables, y que exista un camino para desactivar el admin sembrado por `V3__usuario_admin_inicial.sql` antes de producción.
- **Nomenclatura.** Consistencia singular/plural, español/inglés, prefijos `id_`, nombres de constraints e índices.

## Fase 2 — Documentación

Fuentes: `CLAUDE.md` (raíz y landing), `AGENTS.md`, todos los `README.md`, `docs/**/*.md`, comentarios de cabecera en las migraciones y en `application.properties`.

Auditá:

- **Contradicciones.** Armá una matriz explícita: afirmación → dónde se dice A → dónde se dice B → cuál es cierta según el código. Zona caliente declarada: el número de roles (el plan dijo tres, requirements corrigió a cuatro) y `docs/branding/brand-guide.md`, que está declarado como superado por la identidad real del sitio. Buscá el resto.
- **Doc contra realidad.** Cada afirmación de la Fase 0 verificada contra el archivo que describe. Comandos del README que no existen en `package.json`/`pom.xml`, rutas mencionadas que no existen, endpoints documentados que no están implementados y endpoints implementados que no están documentados.
- **Decisiones huérfanas.** El repo tiene la regla de editar la decisión vieja en lugar de dejarla al lado de la nueva. Buscá decisiones superadas que sigan escritas como vigentes, y fechas de estado (`Fase 0 done`, `2026-08-11`) que ya no reflejen el árbol.
- **Cobertura.** Qué necesita saber alguien que entra hoy al proyecto y no está escrito en ningún lado: procedimiento de deploy, backup/restore, rotación de secretos, onboarding de entorno, qué hacer cuando falla una migración.
- **Duplicación.** La misma información mantenida en dos archivos es una contradicción futura garantizada. Listá los pares y proponé cuál debería ser el único dueño.

## Fase 3 — SEO y GEO

Fuentes: `apps/landing/src/app/**` (14 rutas), `layout.tsx`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `src/lib/seo.ts`, `src/components/seo/JsonLd.tsx`, `src/data/business.ts`, `public/llms.txt`.

Auditá:

- **Cobertura de metadata ruta por ruta.** Hacé la tabla completa de las 14 rutas: title, description, canonical, OG/Twitter, `robots`. Marcá faltantes, duplicados y descripciones genéricas. Incluí las rutas dinámicas (`programas/[slug]`, `blog/[slug]`) y verificá que `generateMetadata` exista donde hace falta.
- **Sitemap y robots.** ¿El sitemap lista todas las rutas indexables y solo esas? ¿`/ingresar` está excluido? ¿Coinciden `robots.ts`, el sitemap y los canonicals? ¿La URL base sale de una sola constante o está hardcodeada en varios lados?
- **JSON-LD.** Validá cada bloque contra schema.org: tipos correctos, propiedades requeridas presentes, `@id` estables y enlazados entre entidades, sin propiedades inventadas. Verificá que coincida con lo que ve el usuario en pantalla (schema que afirma algo que la página no dice es riesgo de penalización).
- **La regla de veracidad — la más importante.** `data/business.ts` declara que la data estructurada solo afirma hechos verificados y que lo no confirmado va `null` y se omite. Auditá si se cumple en serio: buscá teléfono, dirección, horarios, año de fundación, redes, precios y ratings que estén publicados como hecho sin confirmación del cliente. Es el hallazgo de mayor impacto legal y reputacional de toda esta capa.
- **GEO (optimización para motores generativos).** `llms.txt`: ¿existe, es coherente con el sitio, está actualizado? ¿Los crawlers de IA están permitidos de forma deliberada y consistente en `robots.ts`? ¿El contenido está redactado de forma extraíble y citable (respuestas autocontenidas, entidades nombradas, datos con contexto) o depende de layout visual? ¿La info clave del negocio es texto renderizado en servidor o aparece solo tras animación/JS?
- **Renderizado y contenido.** Qué queda en el HTML inicial con JS deshabilitado, dado que el sitio usa GSAP, preloader, cursor custom y smooth scroll. Jerarquía de headings (un solo H1 por ruta, sin saltos), `alt` en imágenes, enlaces internos, texto de ancla.
- **Performance como factor de ranking.** Riesgo de LCP/CLS/INP de la capa de motion y del preloader, imágenes sin dimensiones o sin formato moderno, fuentes sin estrategia de carga, tamaño de bundle en la home.

## Fase 4 — Seguridad

Fuentes: `apps/backend/src/main/java/com/lajuanita/backend/config/SeguridadConfig.java`, `auth/**`, `web/ManejadorDeErrores.java`, `application.properties`, `pom.xml`, `docker-compose.yml`, `apps/platform/src/auth/**`, `src/api/cliente.ts`, `.gitignore`.

Auditá:

- **Autenticación.** Emisión y validación del JWT (algoritmo, exigencia de `exp` e `iss`, expiración, claims), qué pasa con un token manipulado, sin firma o con `alg: none`. Verificá que `GET /api/me` realmente relea el usuario de la base y no confíe en los claims. Ausencia de refresh y de revocación: evaluá el impacto real de que dar de baja a alguien tarde hasta 8 horas.
- **Autorización.** Que `@EnableMethodSecurity` esté activo y que cada endpoint tenga una regla explícita. Enumerá endpoint por endpoint quién puede llamarlo y contrastalo con la matriz de permisos de `docs/requirements/platform.md`. Buscá IDOR: endpoints que reciben un id de recurso y no verifican pertenencia. Verificá que la separación de ejes que declara la arquitectura (permisos vs relaciones de negocio) esté aplicada en el servidor y no solo en el menú del front — un menú que oculta una sección no es un control de acceso.
- **Secretos.** Secreto JWT commiteado en `application.properties` y credenciales `la_juanita/la_juanita` en `docker-compose.yml`: verificá que la mitigación prometida exista de verdad (warning al bootear con el secreto de dev y negativa a arrancar en perfil productivo). Revisá el historial de git en busca de secretos reales filtrados y la cobertura de `.gitignore`.
- **Superficie de login.** Ausencia de rate limiting, lockout y CAPTCHA: hoy el endpoint de login es enumerable por fuerza bruta aunque los mensajes de error sean idénticos. Verificá que la defensa de timing (comparación BCrypt señuelo) siga en el código y no haya sido "optimizada". Política de contraseñas, costo de BCrypt, credencial admin sembrada.
- **Front.** Token en `localStorage` → exposición a XSS: evaluá el riesgo real según qué renderiza HTML sin sanitizar (`PostBody.tsx` es el candidato). Ausencia de CSP, manejo de logout, expiración y limpieza del token.
- **Transporte y cabeceras.** CORS (`lajuanita.cors.origenes`) y qué pasa al agregar el origen productivo, HSTS, `X-Content-Type-Options`, `X-Frame-Options`/frame-ancestors, cookies si las hubiera.
- **Entrada y salida.** Bean Validation en cada DTO, límites de tamaño, mass assignment (entidades JPA expuestas directamente en controllers), inyección SQL en queries nativas, fuga de información en errores y stack traces vía `ManejadorDeErrores.java`, logging de datos sensibles.
- **Dependencias y build.** Versiones con CVE conocido en `pom.xml` y en los `package.json`, `mvn dependency:tree`/`npm audit` si es ejecutable, ausencia de escaneo automatizado.
- **Datos personales.** El sistema guarda alumnos, pagos y contratos. Evaluá exposición de PII en respuestas de API, cifrado en reposo, retención, y qué exige la Ley 25.326 de Argentina para este tipo de datos. Falta de política de privacidad y de aviso de cookies en la landing.

## Fase 5 — Consistencia entre capas y arquitectura

- **Contrato front/back.** `apps/platform/src/api/tipos.ts` contra los DTO reales de Java: campos, opcionalidad, nombres, enums. Toda diferencia es un bug latente.
- **Manejo de errores extremo a extremo.** Qué muestra el usuario cuando el backend devuelve 401, 403, 409 o 500; si el front distingue token vencido de credencial inválida; si hay estados de carga y de error en cada llamada.
- **Reglas duplicadas.** Lógica de negocio implementada en base, en servicio y en front al mismo tiempo, con riesgo de divergir. Decidí dónde debería vivir cada una.
- **Coherencia de convenciones.** Mezcla español/inglés en nombres de paquetes, clases, columnas, rutas y componentes. No es cosmético: es la causa de la mitad de los bugs de mapeo.
- **Estructura del monorepo.** Duplicación entre `apps/landing` y `apps/platform` (componentes, utilidades, tipos, config de TS/lint), `package-lock.json` en la raíz y en cada app conviviendo, backend Maven fuera del workspace npm.

## Fase 6 — Calidad, tests y operación

- **Cobertura de tests.** Hoy hay tres archivos de test en Java más 69 casos SQL de reglas de negocio. Mapeá qué reglas críticas quedan sin cubrir en ninguna de las dos capas, y si los tests SQL están integrados al build o se corren a mano.
- **Frontend sin tests.** Evaluá el riesgo concreto por área (auth, menú por rol, formularios) y proponé el mínimo viable, no un plan de cobertura total.
- **CI/CD.** No hay pipeline: qué se rompe por no tenerlo y cuál es el pipeline mínimo (build + lint + test + migración en base limpia).
- **Observabilidad y operación.** Logging, healthchecks, backups de Postgres, plan de restore, estrategia de deploy y variables de entorno por ambiente.
- **Accesibilidad.** Contraste, foco visible, navegación por teclado, `prefers-reduced-motion` (crítico dado el volumen de animación), labels y errores en formularios, roles ARIA en el acordeón de FAQ y en el menú.
- **Deuda declarada.** Formularios de la landing que no envían a ningún lado, precios inventados en `data/services.ts`, y los seis posts de blog inventados firmados con nombres de profesores reales. Tratalos como hallazgos de negocio con severidad propia, no como TODOs.

## Fase 7 — Lo que yo no te pedí

Cerrá con una sección de hallazgos fuera de las categorías anteriores: cualquier cosa que un auditor con criterio marcaría y que este prompt no anticipó. Si no encontrás nada, decilo.

## Escala de severidad

| Nivel | Criterio |
|---|---|
| **Crítico** | Explotable hoy, o publica información falsa al cliente final, o produce pérdida/corrupción de datos. Bloquea el deploy. |
| **Alto** | Falla en producción bajo condiciones normales, o expone datos personales, o rompe una regla de negocio comprometida en la propuesta. |
| **Medio** | Deuda que va a costar caro: contradicción documental activa, deriva entre capas, ausencia de test sobre regla crítica. |
| **Bajo** | Consistencia, nomenclatura, higiene. |
| **Informativo** | Observación sin acción requerida. |

## Formato de salida

Escribí **un solo archivo**: `docs/auditoria/informe-auditoria-2026-08.md`.

Estructura:

1. **Resumen ejecutivo** — máximo 15 líneas. Estado general, los 5 hallazgos que bloquean entrega, y una frase por área. Escrito para que lo lea alguien que no va a leer el resto.
2. **Tabla de conteo** por área × severidad.
3. **Hallazgos**, agrupados por área, cada uno con ID estable (`DB-01`, `DOC-01`, `SEO-01`, `SEC-01`, `ARQ-01`, `QA-01`, `EXT-01`) y estos campos exactos:
   - Título en una línea
   - Severidad
   - Evidencia: `ruta:línea` + cita mínima
   - Qué pasa hoy (comportamiento observable, no teoría)
   - Impacto concreto sobre el negocio o el usuario
   - Recomendación accionable y específica de este repo
   - Esfuerzo estimado: XS / S / M / L
4. **Matriz de contradicciones documentales** — tabla afirmación / fuente A / fuente B / cuál es correcta según el código.
5. **Riesgos conocidos y aceptados** — lo que `CLAUDE.md` ya declara como decidido, con tu evaluación de si la justificación sigue en pie y si la mitigación prometida existe.
6. **No verificado** — qué quedó fuera del alcance y qué haría falta para cubrirlo (ejecutar la app, credenciales, datos productivos, herramientas externas).
7. **Backlog priorizado** — lista ordenada por impacto/esfuerzo, dividida en: antes del deploy / antes de septiembre / después.

Escribí en español rioplatense, en prosa técnica y directa. Sin relleno, sin repetir el enunciado del hallazgo en la recomendación, sin adjetivos de valor sobre el código.

## Modo de ejecución

Ejecutá la Fase 0 completa y después las fases en orden. Al terminar cada fase, imprimí en el chat un resumen de una línea por hallazgo (ID + título + severidad) antes de seguir, para que yo pueda cortarte si vas en la dirección equivocada. Escribí el archivo final recién al terminar la Fase 7.

Si el contexto se te llena antes de terminar, no degrades: pará, escribí lo que tengas al informe con las fases pendientes marcadas explícitamente, y avisame qué fase falta para correrla en una sesión nueva.

Si podés lanzar sub-agentes en paralelo, hacelo por fase (1 a 6 son independientes entre sí una vez hecha la Fase 0), pasándole a cada uno la Fase 0 como contexto y exigiéndole el mismo formato de hallazgo.
