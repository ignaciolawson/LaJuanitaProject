# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Monorepo for **La Juanita Studio / La Juanita Music** (record label + DJ/electronic music production academy, Pilar). Two deliverables:

1. **Landing page** (`apps/landing`) — public marketing site replacing the client's current Linktree. **Has its own `CLAUDE.md` — read it before touching styles or animations there.** It documents a custom design system, a GSAP motion architecture, and several already-solved integration traps that are easy to re-break.
2. **Management platform** (`apps/platform` + `apps/backend`) — authenticated system covering students, room/schedule booking, payments, student/teacher portals, mix & mastering requests, and the record label workflow. **This is the current work.** As of 2026-08-15: Fase 0 is closed (database, JWT login, protected routes, role-driven menu) and **Módulo 1 (Alumnos) is ~35% done** — public signup, admin-created accounts with a temporary password, student and people listings, real role-based authorization, and `AlumnoTest` covering the module's own logic. **Next is `inscripcion`, and nothing blocks it**: the two client questions that used to (P4, P5) are answered in `platform.md` §13.

> **Three things to know before starting anything, all in `docs/sistema-gestion-plan.md` §6d:** everything is pushed but **the CI pipeline has still never been seen running on Actions** — its four steps were only ever verified locally; **the deposit rule (DB-04a) is undecided and blocks Módulo 2**; and the audit backlog is down to **51 of 61 resolved**, with everything still open being tanda 8 *documentation* — five findings, none of which change how anything behaves.

> **Read `docs/sistema-gestion-plan.md` before doing anything on platform/backend.** It is the source of truth for scope, deadline, build order, and the technical decisions already settled (Flyway, the corrected role model, JWT, file storage, hosting shape). Written in Spanish, for the developer as much as for Claude. If a decision there changes, edit that file — don't leave the old decision alongside the new one.
>
> **Start at §6d "DÓNDE RETOMAR"** — it carries the current state, what's next, and open questions, and it wins over anything else in that file that contradicts it. For two days it also warned that Ignacio had unstated objections to the first Módulo 1 batch; **he confirmed on 2026-08-14 that he has none. That batch is settled — build on it.**
>
> **But for anything that is a *decision*, the authority is `docs/requirements/platform.md` §13 — "Decisiones cerradas el 2026-08-14".** Twenty questions answered at once, including all five that were waiting on the client, and it postdates both the plan and the audit report. It is easy to miss because nothing else linked to it, which is exactly how the audit report spent a day listing as *"blocked on a decision"* ten findings whose decision was already written down. **Check §13 before telling anyone something is blocked.** Among what it settles: the courses' real format (1:30 weekly, DJ 8 classes / Producción 16), that **Mix & Mastering is a service and not a program**, that `hola@lajuanitastudio.com` **does not exist**, the full street address, that a reservation is **never** created without its deposit (P8, no exception), and that a class is only consumed when it is actually taken.

## Repo structure

```
apps/
├── landing/     Next.js — public landing (SSR/SSG)
├── platform/    React + Vite — authenticated SPA
└── backend/     Spring Boot — single API for platform (and landing if it ever needs dynamic data)
docs/
├── relevamiento/  client interviews / discovery notes
├── propuesta/     technical & commercial proposal
├── requirements/  per-app scope
├── branding/      brand assets + identity guide
├── db/            data model (DBML) + the adversarial audit of the schema
├── auditoria/     the 2026-08 technical audit and its remediation log
├── operacion.md   backup, tested restore, deploy, migration failures
└── sistema-gestion-plan.md   plan + settled decisions for platform/backend
scripts/
├── backup.sh      pg_dump with retention, for cron
└── pruebas-sql.sh the two SQL suites against throwaway databases
.github/workflows/ci.yml   the pipeline
```

`apps/landing` and `apps/platform` are npm workspaces declared in the root `package.json`. `apps/backend` is a separate Maven project, not part of the npm workspace.

## Commands

Run from repo root unless noted.

```
npm install                # installs landing + platform (npm workspaces)
npm run dev:landing        # next dev
npm run dev:platform       # vite dev server
npm run build:landing
npm run build:platform

cd apps/landing && npm run lint       # eslint
cd apps/platform && npm run lint      # oxlint

cd apps/platform && npm test          # vitest, 55 cases, no backend needed
cd apps/platform && npm run test:watch

cd apps/backend && mvn spring-boot:run
cd apps/backend && mvn test
cd apps/backend && mvn -Dtest=ClassName#methodName test   # single test

docker compose up -d       # Postgres on localhost:5432 (db/user/pass: la_juanita)
./scripts/pruebas-sql.sh   # the two SQL suites on throwaway databases
./scripts/backup.sh        # pg_dump with retention — see docs/operacion.md
```

**To see the platform running you need all three up**, in this order: `docker compose up -d`,
then `mvn spring-boot:run` in `apps/backend` (:8080), then `npm run dev:platform` (:5173).
The Vite dev server proxies `/api` to :8080, so the browser only ever talks to :5173.
Log in with **`admin@lajuanita.local` / `lajuanita2026`** — a development credential seeded by
`V3__usuario_admin_inicial.sql`, to be deactivated in a new migration before the real deploy.

**Use `mvn`, not `./mvnw`.** The wrapper tries to download its own Maven and fails on
this machine (`curl: Failed to fetch .../apache-maven-3.9.16-bin.zip`); a working Maven
3.9.14 is already on `PATH`. Java on `PATH` is JDK 25 while the pom targets 21 — that
compiles fine, it just isn't the mismatch it looks like. Docker Desktop is often not
running: `docker compose up -d` fails with a named-pipe error until you launch it.

**Database rule tests** — 171 cases (121 business-rule + 50 adversarial) covering every
rule the schema enforces (overlap, room×use matrix, premaster lock, state machines,
currency, discounts, deletion protection). They run against throwaway databases, never
the dev one. **Run them with `./scripts/pruebas-sql.sh`** — the nine-command procedure
that used to live in the file headers is gone, and so is the hand-maintained list of
migrations: **the script reads the migration directory**, so a new migration joins the
run on its own. That list was duplicated in both headers and went stale twice, at V4
and at V6. In Git Bash prefix `docker` calls with `MSYS_NO_PATHCONV=1` or it rewrites
`/tmp` into a Windows path — and never set that variable in a shell where you also run
`mvn`, because it breaks the Maven launcher's classpath.

**`mvn test` does not run them**, and that asymmetry is the point: the CHECKs, triggers
and EXCLUDEs are where this project put its business rules, and neither suite is part of
the Java build. The script exits non-zero when a case fails — the suites themselves print
a summary and exit 0 no matter what, which is why CI would have run them green forever.

Two rules those tests encode, learned by getting them wrong: never hardcode IDs (a
rejected INSERT still consumes the identity value, so IDs stop being sequential), and
a "should succeed" case must assert rows were actually affected — an UPDATE matching
nothing raises no error and passes vacuously.

**CI runs all four checkable things** (`.github/workflows/ci.yml`): `mvn test` against a
Postgres service — which also proves the nine migrations apply to an empty database, the
one thing nobody had verified before the audit — the SQL script, the two builds, the two
linters, and the platform's Vitest suite. The SQL script has a second mode for exactly
this: with `PGHOST` set it uses `psql` directly instead of `docker exec`, because in
Actions Postgres is a service, not a container you can exec into.

**Operations live in `docs/operacion.md`**: backup, **a restore that was actually
rehearsed**, and what to do when a migration fails. The restore rehearsal is worth knowing
about before you need it — it verified that the restored database keeps its *rules*, not
just its rows, and that the real application boots against it. The one section left open
is deploy, which waits on the October hosting decision; it says so in its first paragraph
rather than inventing a procedure nobody ran.

## Landing: current state

Static Next.js App Router site, no dynamic data. **13 route files → 19 generated
pages, 18 of them in the sitemap** (`/ingresar` is `noindex`), including program
detail pages and blog post pages (both SSG), plus sections for programs,
services (booth rental and set recording), gear sales, and the record label.
Don't hardcode those counts anywhere new — six comments carried a route count,
five of them wrong and none agreeing with another (SEO-04).

**The blog (`/blog`) is the one section built to be handed over to a CMS.**
It renders from `data/posts.ts`, whose post bodies are arrays of typed
blocks — the shape of Sanity's Portable Text — so migrating means replacing
that module with a fetch, not rewriting the pages. Nothing is wired to a CMS
yet, and the six sample posts are invented and signed with the real
teachers' names: they must be rewritten or deleted before publishing. See
the landing `CLAUDE.md` for the migration point (`generateStaticParams` will
need revalidation).

**Every form on the landing is visual only.** Program applications, booth
booking, gear inquiries and the `/ingresar` login submit nothing. The
connection points are the `onSubmit` in `components/forms/Fields.tsx` and
`components/forms/LoginForm.tsx`.

**The landing waits for the platform — decided 2026-08-10; it does not
publish first.** The forms currently answer "listo" without the request
reaching anyone (the client asked for the "not connected" notice to be
removed on 2026-08-09), so publishing early means losing real leads. No
interim patch (no email relay, no third-party form service) — they get wired
straight to the backend once the students module is live, ~September. This
is affordable because the landing is blocked on client-supplied data anyway.
Revisit only if the client confirms that data and wants to publish early.

**Most long-form copy and all prices are invented placeholder.** The landing
`CLAUDE.md` has the file-by-file table of what still needs client
validation. Treat prices in `data/services.ts` as the highest-risk item:
they are numbers a customer would act on.

**SEO/GEO layer (added 2026-08-10).** Canonicals, `sitemap.xml`, `robots.txt`
(AI crawlers explicitly allowed so the business can be cited), a generated
1200×630 social image, `llms.txt`, and JSON-LD across every route —
`LocalBusiness`+`EducationalOrganization`, `Course`, `Service`, `FAQPage`,
`Person`, `BlogPosting`, `BreadcrumbList`. The governing rule lives in
`apps/landing/src/data/business.ts`: **structured data only ever states
verified facts.** Unconfirmed fields are `null` and get omitted rather than
filled — a placeholder phone number on screen reads as provisional, but the
same number in JSON-LD is published as a verified fact that Google can surface
and an LLM will repeat.

**The business data is no longer blocked — it was confirmed on 2026-08-14**
(`docs/requirements/platform.md` §13): street address (Office Park **Quatro**,
Colectora Oeste Ramal Pilar 209, locales 5 y 6, B1669 Pilar — already broken down
into `PostalAddress` fields there), phone, opening hours (10–18) and founding year
(2021). **The `LocalBusiness` can now be published whole, with no `null` fields.**
What §13 does *not* answer, and stays `null`: real Instagram/YouTube profiles. And
one field has to move the other way — `hola@lajuanitastudio.com` **does not exist**,
the model invented it, so it comes out of the JSON-LD (SEO-02).

The visual identity was rebuilt from the actual brand assets (the fan icon
and the arched patch wordmark) and **deliberately supersedes**
`docs/branding/brand-guide.md`, which described a generic dark-mode look
that no longer matches the site. See that file's header note.

## Architecture notes

**Data model — "usuario" is the root identity, not "alumno".** The original client-provided model treated `ALUMNO` (student) as the system's user, which breaks for one-off customers (someone who only rents the booth, buys gear, or sends a mastering job without ever enrolling). The corrected model: `usuario` is the single login identity; `alumno` and `profesor` are separate tables hanging off `usuario` via FK, not replacements for it. Transactional tables (`reserva`, `pago`, `venta_equipo`, `solicitud_reprogramacion`) key off `id_usuario`, never `id_alumno`. Full schema: `docs/db/la_juanita_schema.dbml.txt` (paste into dbdiagram.io to visualize).

**Two independent axes, not one `rol` column.** Permissions (what you may administer — this is what Spring Security reads) are separate from business relations (whether you have an `alumno` / `profesor` row — this is what builds the portal menu). Ghezz is `STAFF` *and* a `profesor` *and* can book a booth for himself, with no contradiction.

**There are four roles: `ADMIN` / `DIRECTIVO` / `STAFF` / `USUARIO`.** Not three. The plan of 2026-08-10 collapsed them to three; `docs/requirements/platform.md` §2.1 corrected that on 2026-08-11 because the commercial proposal promises four differentiated roles and Module 8 draws a real line between them (*"only directors and partners see the full dashboard; Micaela sees the basic financial summary"*). **Six places** carry the four roles and must move together: the CHECK in `V1__baseline.sql`, the `Rol` enum in Java, the `Rol` type in TypeScript, `docs/db/la_juanita_schema.dbml.txt`, the two predicates in `apps/platform/src/layout/menu.ts`, and the `NOMBRE_DE_ROL` table in `UsuariosPagina.tsx`. Adding a role is a migration *plus* five file edits. The last two are typed `Rol[]` / `Record<Rol, string>` on purpose, so the compiler is the one that reminds you — the predicates used to be written by negation (`rol !== 'USUARIO'`), which let a hypothetical fifth role into the admin menu on its own and then get a 403 from the backend.

**Anyone can create their own account — student or not (P18, settled 2026-08-12).** `POST /api/auth/registro` is public and takes name, surname, email, phone, password. This is the clearest expression of the `usuario`-as-root decision: you need an account to see your bookings, and someone who rents a booth once never enrols. *Having an account* and *being a student* are separate — the `alumno` row is added later by staff. Micaela can also create accounts (for the ~80 students living in her Notion, and for people who sign up over WhatsApp): the system generates a temporary password she passes on via WhatsApp, and `usuario.debe_cambiar_password` forces a change on first login. No activation email — there is no mail infrastructure and there won't be soon.

**Registration deliberately tells you an email is already taken**, which undoes at signup the user-enumeration protection the login has. It's a considered trade-off, documented in `DatoDuplicadoException`: what leaks is "this address has an account at a music studio in Pilar", and the alternative strands anyone who registered months ago and forgot.

**Portal menu is three rules, not one.** Sections tied to a *relation* (Mis Cursos, Mis Alumnos, Subir Material) render only when the relation exists. Sections tied to a *service anyone can buy* (Reservar cabina, Mix & Mastering, Mis Pagos) always render — gate those on existing rows and a user who never booked can never make a first booking. Administration sections render by `rol`. All three are driven off `GET /api/me` (user + role + which relations exist); never hardcode the menu. The rules live in one file, `apps/platform/src/layout/menu.ts`.

That file also exports the **two role predicates the whole SPA shares**: `puedeAdministrar` (who sees the admin screens — gates the menu group *and* the `/admin/*` routes, so a visible section can never be a route that rejects you) and `puedeOperar` (who may write — ADMIN·STAFF, mirroring `@PuedeOperar`). `DIRECTIVO` sees every admin screen and gets no write buttons; before that, a partner would fill in "Nuevo alumno" and get *"No tenés permiso para hacer esto."* **Neither predicate authorizes anything** — the backend re-reads the role from the database on every request. Deleting them would open no hole, it would just go back to lying to the user. Add a screen, use them; don't write `rol === …` loose in a component.

**Login (built 2026-08-11).** `POST /api/auth/login` → BCrypt check → HMAC-signed JWT (8h, `sub` = user id, claim `rol`). **Nothing trusts that claim**: every authenticated request re-reads the user from the database (see the authorization note below), so a role change or a deactivation takes effect immediately. Signing and verification are Spring Security's own (`starter-security-oauth2-resource-server`) — there is no hand-written auth filter, and there shouldn't be. The front stores the token in `localStorage` and sends it as `Authorization: Bearer`; in dev the Vite proxy forwards `/api` to `:8080`, so CORS is not exercised locally even though the backend configures it.

Things worth not re-learning, most found by auditing the first version:

- **`NimbusJwtEncoder` defaults to RS256** and fails with *"Failed to select a JWK signing key"* unless you pass `JwsHeader.with(MacAlgorithm.HS256)` — the symmetric key alone is not enough.
- **Spring's default JWT validator does not require `exp`** — it only checks it when present, so a token without one never expires. `SeguridadConfig` adds validators requiring `exp` *and* `iss`.
- **All three login failures (unknown email, wrong password, deactivated user) return the identical 401 body** on purpose — *and take the same time*. When the email doesn't exist the code still runs a BCrypt comparison against a decoy hash; without it the response came back in ~10 ms instead of ~88 ms and that gap alone told an attacker which emails have accounts. Don't "optimise away" that seemingly useless comparison, and don't differentiate the messages.
- **`/error` must stay `permitAll`.** It is Spring's internal error forward, not an endpoint. Left authenticated, every error on a public endpoint comes back as an empty 401 — a malformed login body returned 401 instead of 400, hiding the real failure from the front end.
- **`@EnableMethodSecurity` is on.** Without it a `@PreAuthorize` compiles and silently does nothing, which is worse than having no annotation at all.
- **Spring Security 7 adds a `FactorGrantedAuthority` (`FACTOR_BEARER`)** alongside your own authorities. Assert `contains("ROLE_X")`, never `containsExactly`.
- **The JWT signing secret is committed** in `application.properties` so a fresh clone runs. Anyone who reads it can forge an ADMIN token, so set `JWT_SECRET` — to a *new* value — anywhere reachable from outside. **The lock fails closed**: signing with the committed secret aborts startup unless `lajuanita.jwt.permitir-secreto-de-desarrollo=true` is present in `application.properties`, the one line a deploy doesn't copy. It used to trigger only on an active `prod` profile, which was operationally empty — nothing in this repo activates a profile and the planned VPS deploy uses none, so a `docker compose up` with no env vars booted and signed with the public key, leaving one WARN line among hundreds. A lock against forgetting can't require having configured something else.
- **A null parameter in a JPQL `LIKE` blows up on Postgres** with `function lower(bytea) does not exist` — with no value, the driver can't infer the type and binds it as binary. Never pass null: `Busqueda.patron()` returns `"%"` for "match everything", and also escapes `%` and `_` so searching for "100%" works.
- **Never edit an applied migration — not even to add a comment.** Flyway checksums each file and refuses to start on a mismatch. This was learned by adding one explanatory comment to `V3` and watching the app die with *"Migration checksum mismatch for migration version 3"*.
- **A check-then-insert is not a uniqueness guarantee.** `UsuarioService` looks for a duplicate email before inserting, but another transaction can slip in between; six concurrent registrations of the same address produced four 500s. A double-click on the signup button is enough. The database's unique index is the real authority, so `ManejadorDeErrores` translates `DataIntegrityViolationException` into the same 409 the pre-check would have returned.
- **`spring.mvc.problemdetails.enabled=true` needs `@Order(HIGHEST_PRECEDENCE)` on our own advice.** Spring registers its own `@ControllerAdvice` above un-ordered ones and takes over `MethodArgumentNotValidException`, so the 400 kept arriving but lost the `errores` map the forms use to flag the offending field.
- **Spring Security's default 401 has an empty body.** `RespuestaDeNoAutenticado` supplies a ProblemDetail so the front end has a message to show and every error in the API has one shape.

**Authorization resolves against the database on every request, never against the token's claims** (`AutenticacionDesdeBase`). The `rol` claim inside the JWT is informational only — it authorises nothing. This costs one SELECT per authenticated request and buys the property the system documents everywhere else: **`usuario.activo = FALSE` removes someone immediately**, and a role change lands on the next request. The first version read the claim, and an audit measured the consequences on the running API: a deactivated STAFF kept listing students and *created a row*, a demoted ADMIN kept operating as ADMIN, and someone holding an unchanged temporary password kept working through the API because that block lived only in the front end. All three were the same bug. `CredencialVigenteTest` pins all three.

A user who still owes a password change gets the single authority `ROLE_PASSWORD_PENDIENTE` instead of their role: enough to reach `/api/me` and `/api/me/password` (both only require authentication) and nothing else, so the block cannot be bypassed by calling the API directly.

**Authorization by role exists as of 2026-08-12** and lives in two meta-annotations, `@PuedeLeerAdministracion` (ADMIN·DIRECTIVO·STAFF) and `@PuedeOperar` (ADMIN·STAFF). Beyond the role, `UsuarioService` also checks *who you are operating on*: **only an ADMIN may edit or deactivate an account that has an administrative role**, and **nobody may remove themselves from the system** — neither by deactivating their own account nor by changing their own role (the second door was open until 2026-08-14; the lone ADMIN could set itself to `USUARIO`, get a 200, and be locked out on the next request). Those two guards together hold the invariant *at least one active ADMIN always remains*, with no row counting: you can demote or deactivate someone else, never yourself. Without that, a STAFF could lock out the ADMIN — measured, not hypothetical — and since only ADMIN grants roles, that was enough to leave the system with nobody able to administer it. Keeping the rule in two places rather than scattered `@PreAuthorize` strings is what makes the four-role model enforceable: **`DIRECTIVO` reads everything and writes nothing**, and `PermisosPorRolTest` fails if anyone "fixes" that by adding DIRECTIVO to `@PuedeOperar`. Only ADMIN may grant roles — a STAFF alta that asks for `rol: ADMIN` silently gets `USUARIO`.

**The auth perimeter exists as of 2026-08-14** (SEC-02/03/08). Three things that weren't there and are easy to undo by accident:

- **Rate limiting** is split on purpose. Per-IP lives in `FiltroDeFrecuencia`, which runs *before* Spring Security's chain (`@Order(SecurityFilterProperties.DEFAULT_FILTER_ORDER - 1)` — that constant moved out of `SecurityProperties` in Boot 4.1). Per-email lives in `SesionService`, because the email is in the request body and reading a body from a filter means wrapping the request for nothing. A successful login clears the email counter. **`mvn test` disables only the per-IP limit**, from the surefire config in the pom — the suite is one machine doing hundreds of logins against 127.0.0.1, which is indistinguishable from an attack. Don't "fix" that by adding `src/test/resources/application.properties`: a file with that name *shadows* the main one instead of extending it, and takes the database config with it.
- **`RegistroDeEventos` is the only place in the backend that reads the request context implicitly** (`RequestContextHolder`, to get the IP). That's deliberate and concentrated in one method, so six services don't have to carry an `HttpServletRequest` they need for nothing else. Behind the planned HTTPS proxy it will log the proxy's IP until `server.forward-headers-strategy` is set — that's part of putting the proxy up.
- **A password reset exists**: `POST /api/usuarios/{id}/password-temporal`. It must keep going through `verificarQuePuedeTocarEstaCuenta` — without it a STAFF resets an ADMIN's password and owns the system, which is the 12/08 hole reopened through a new door. `PermisosPorRolTest` pins it. And the temporary password now expires (7 days, `lajuanita.password-temporal.vigencia`): `debe_cambiar_password` and `password_temporal_desde` are one fact in two columns and the database refuses to let them disagree (`usuario_password_temporal_coherente`, V8), so write them only through `Usuario.marcarPasswordTemporal` / `marcarPasswordElegida`.

**Naming: the domain is in Spanish, the framework's own vocabulary is in English.** This convention was followed from the first commit and written down only on 2026-08-15 (ARQ-08) — it had never caused a mapping bug, but every new file made you look around and guess, and three times the guess came out differently.

| Layer | Language | Examples |
|---|---|---|
| Java package names for technical layers | English, the conventional short word | `auth`, `config`, `web`, `dto` |
| Java package names for the domain | Spanish | `usuario`, `alumno`, `profesor` |
| **Everything else in Java** — classes, methods, fields, DTO components | **Spanish**, including inside the technical packages | `SeguridadConfig`, `AutenticacionDesdeBase`, `ManejadorDeErrores`, `LimitadorDeIntentos`, `Autoridades`, `SesionService` |
| Front — files and symbols | Spanish | `contexto.ts`, `credencial.ts`, `cliente.ts`, `menu.ts`, `paginas/`, `componentes/`, `RutaProtegida.tsx` |
| Front — names the framework imposes | English, unavoidable | `App.tsx`, `main.tsx` |
| Front — types mirroring a Java record | **The Java record's name, whatever language that is** | `LoginResponse`, `RegistroRequest`, `AltaUsuario` |

**At the border, the API path wins.** `LoginRequest`, `LoginResponse`, `AuthController` and `MeController` are in English because the endpoints are `/api/auth/login` and `/api/me`: the class is named after the URL it serves. That's why `AuthController` has a `login()` and a `registro()` fifteen lines apart, and why `RegistroRequest` is Spanish while `LoginRequest` is not — `/api/auth/registro` is a Spanish path. It looks like an inconsistency and it is the rule.

**Don't rename what exists to match this.** `LoginRequest` has tests on it and a rename buys nothing; the table describes where a *new* file goes.

**Backend**: Spring Boot 4.1 / Java 21, Spring Data JPA, Spring Security (JWT), Bean Validation, Lombok. `spring.jpa.hibernate.ddl-auto=validate` — no auto-DDL, ever. Schema lives in Flyway migrations under `src/main/resources/db/migration`: `V1__baseline.sql` (22 tables), `V2__datos_iniciales.sql` (rooms + the room×use matrix), `V3__usuario_admin_inicial.sql` (dev admin), `V4__separar_nombre_apellido.sql`, `V5__cambio_de_password_obligatorio.sql`, `V6__integridad_auditoria.sql`, `V7__auditoria_historial_y_bloqueos.sql`, `V8__vencimiento_password_temporal.sql` and `V9__reglas_cerradas_en_la_seccion_13.sql`. **V6** closes 10 integrity holes found by attacking the running schema (12 CHECKs, 3 triggers, an EXCLUDE and a partial UNIQUE); the attacks and what was deliberately left open are written up in **`docs/db/auditoria-2026-08-12.md`**, its companion document. **V7** adds the rules the scope document declares *confirmed with the client* and the schema never tried to enforce: annulling a payment now demands author, date and reason (it was the only exception in the whole schema that demanded nothing); class history — `reserva` and `reserva_participante` — can't be deleted and can't have attendance edited without naming who did it; `venta_equipo` gets a load stamp. It also fixes the `bloqueo_sala` EXCLUDE, which read a blocking row as one continuous interval while both triggers read it as a time slot repeating every day of the range — so it rejected legitimate blocks. **V8** gives the temporary password a date so it can expire. **V9** writes the rules `platform.md` §13 unblocked — they were unwritable before because a decision was missing, not because they were hard: nobody in two rooms at once (a real EXCLUDE for the teacher, a trigger for the student, because the student lives in `reserva_participante` and the time lives in `reserva`), `egreso` and `venta_equipo` can now be annulled and therefore can no longer be deleted (the condition V6 §7 wrote down for itself), a level can't drop without author and reason, `sala.activa = FALSE` finally means something, and no inscription can consume more classes than it contracted. As of 2026-08-14 all nine apply cleanly to an empty database and both SQL suites pass on the result (121/121 and 50/50) — and **CI now proves that on every push**, which is what "applies cleanly to an empty database" needs to keep being true.

**The one rule still without an owner is the deposit (DB-04a).** §13 answered *when* the rule can be skipped (never) but not *which reservations it covers* — a class under an already-paid inscription carries no deposit of its own; a booth rental does — and the schema needs the second to express it. `V9`'s header records the tool for the day it's decided (a `CONSTRAINT TRIGGER … DEFERRABLE INITIALLY DEFERRED` checking at COMMIT) and why it wasn't guessed at: a constraint demanding a deposit from *every* reservation would block Módulo 2's class scheduling, which is the next thing built.

Two traps worth carrying forward, both found by tests written against V7 rather than by reading it:

- **A CHECK that evaluates to NULL doesn't reject anything** — only FALSE does. `CHECK (... AND btrim(motivo) <> '')` let a row through with `motivo` NULL, because `btrim(NULL) <> ''` is NULL. Wrap the text in `coalesce(btrim(x), '')`.
- **A generated column is computed before the CHECKs run**, so an expression that throws (`daterange`/`tsrange` with the bounds inverted) pre-empts the constraint that would have explained the problem. `reserva_horas_validas` is unreachable for exactly this reason (DB-11). V7's generated columns return NULL instead of throwing, so V1's CHECKs stay the ones that speak.

**A new migration no longer requires editing the two SQL test headers.** It used to: they carried the list of migrations to apply, the list was duplicated, and it went stale twice — at V4 and at V6 — because a suite run against a schema that is no longer the project's proves nothing and doesn't warn. `scripts/pruebas-sql.sh` now reads the migration directory (`sort -V`, so `V10` doesn't land before `V2`), so the only thing a new migration still owes those files is a case for the rule it adds.

**Spring Boot 4 moved autoconfigurations into their own modules.** Depending on raw `org.flywaydb:flyway-core` puts Flyway on the classpath but **it never runs at startup, silently** — the app boots against an empty database and `ddl-auto=validate` passes because there are no entities yet. The dependency that carries the autoconfiguration is `org.springframework.boot:spring-boot-starter-flyway`. Same pattern elsewhere in this pom: it uses `spring-boot-starter-webmvc`, not `spring-boot-starter-web`. Don't port Spring Boot 3 dependency names from memory — check the 4.1 BOM.

The same reshuffle hits **packages and libraries**, not just artifact ids. Verified on 4.1.0, each of these differs from what Boot 3 tutorials (and training data) say:

| What | Boot 3 | **Boot 4.1** |
|---|---|---|
| `@AutoConfigureMockMvc` | `…boot.test.autoconfigure.web.servlet` | `…boot.webmvc.test.autoconfigure` |
| JSON | Jackson 2, `com.fasterxml.jackson.databind` | **Jackson 3, `tools.jackson.databind`** |
| OAuth2 resource server starter | `spring-boot-starter-oauth2-resource-server` | either that or `spring-boot-starter-security-oauth2-resource-server` — the BOM ships **both, and they are identical** (checked); prefer the second for consistency |
| `ErrorController` | `…boot.web.servlet.error` | **`…boot.webmvc.error`** (verified with `jar tf` on `spring-boot-webmvc-4.1.0.jar`) |

When something won't resolve, list what's actually there instead of guessing: `mvn dependency:list`, or `jar tf` over the jars in `~/.m2`.

**Business rules are enforced in the database, not only in services.** A Postgres `EXCLUDE` constraint makes overlapping `reserva` rows for the same `sala` impossible; a composite FK to `sala_tipo_uso` makes an unauthorized room/use combination impossible (no recording in Sala 1, no mentoring in the recording booth); triggers keep reservations and `bloqueo_sala` from overlapping; a partial unique index allows only one active `inscripcion` per discipline per student. Read the comments in `V1__baseline.sql` before changing any of them — each one encodes a decision from `docs/requirements/platform.md`. **`V6__integridad_auditoria.sql` is the other half of those rules** — money can't be deleted, a premaster can't be released without a payment behind it, state machines can't be walked backwards in two steps — and its rationale is in `docs/db/auditoria-2026-08-12.md`, including the list of rules deliberately left unimplemented.

Those rules only reach the user through `ManejadorDeErrores`. It maps constraint names to Spanish messages and turns a trigger's `RAISE EXCEPTION` (SQLSTATE `P0001`) into a 409 carrying the trigger's own text — without it, the 103 constraints all came out as *"Ese email o ese teléfono ya están registrados"* and the 10 triggers came out as **500**. When you add a rule to the database, add its message to that map.

**The BCrypt hash seeded by `V3` does have a test**, contrary to the migration's own comment: it lives in `AutenticacionTest.el_hash_sembrado_en_V3_lo_valida_el_encoder_de_la_aplicacion`, not in a `UsuarioAdminInicialTest` — that class never existed. `V3` can't be edited to fix the name (Flyway checksums it), so the correction lives here.

**`apps/landing/AGENTS.md`**: auto-generated by Next.js and re-written by `next dev` — it warns that this Next.js version has breaking changes vs. training data and to check `node_modules/next/dist/docs/` before writing Next-specific code there. Keep it committed; don't hand-edit it away.

**Out of scope for now**: WhatsApp Business API integration — deliberately excluded from the initial commercial proposal, but flagged as the highest-value fast-follow after delivery (it targets the client's #1 pain point: manual WhatsApp replies for scheduling/payments).
