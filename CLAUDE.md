# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Monorepo for **La Juanita Studio / La Juanita Music** (record label + DJ/electronic music production academy, Pilar). Two deliverables:

1. **Landing page** (`apps/landing`) — public marketing site replacing the client's current Linktree. **Has its own `CLAUDE.md` — read it before touching styles or animations there.** It documents a custom design system, a GSAP motion architecture, and several already-solved integration traps that are easy to re-break.
2. **Management platform** (`apps/platform` + `apps/backend`) — authenticated system covering students, room/schedule booking, payments, student/teacher portals, mix & mastering requests, and the record label workflow. **This is the current work.** As of 2026-08-11 Fase 0 is done: the database exists, login works end to end (JWT), and `platform` has a real login screen plus a protected route behind a role-driven menu. No business module is built yet — Alumnos is first, September.

> **Read `docs/sistema-gestion-plan.md` before doing anything on platform/backend.** It is the source of truth for scope, deadline, build order, and the technical decisions already settled (Flyway, the corrected role model, JWT, file storage, hosting shape). Written in Spanish, for the developer as much as for Claude. If a decision there changes, edit that file — don't leave the old decision alongside the new one.

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
├── db/            data model (DBML)
└── sistema-gestion-plan.md   plan + settled decisions for platform/backend
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

cd apps/backend && mvn spring-boot:run
cd apps/backend && mvn test
cd apps/backend && mvn -Dtest=ClassName#methodName test   # single test

docker compose up -d       # Postgres on localhost:5432 (db/user/pass: la_juanita)
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

**Database rule tests** — 69 cases covering every business rule the schema enforces
(overlap, room×use matrix, premaster lock, state machines, currency, discounts,
deletion protection). They run against a throwaway database, never the dev one.
Full instructions are in the header of
`apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql`. In Git Bash prefix
`docker` calls with `MSYS_NO_PATHCONV=1` or it rewrites `/tmp` into a Windows path —
and never set that variable in a shell where you also run `mvn`, because it breaks
the Maven launcher's classpath.

Two rules those tests encode, learned by getting them wrong: never hardcode IDs (a
rejected INSERT still consumes the identity value, so IDs stop being sequential), and
a "should succeed" case must assert rows were actually affected — an UPDATE matching
nothing raises no error and passes vacuously.

## Landing: current state

Static Next.js App Router site, no dynamic data. Fourteen routes, including
program detail pages and blog post pages (both SSG), plus sections for
programs, services (booth rental and set recording), gear sales, and the
record label.

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
and an LLM will repeat. Still blocked on the client for: street address, phone,
opening hours, founding year, and real Instagram/YouTube profiles.

The visual identity was rebuilt from the actual brand assets (the fan icon
and the arched patch wordmark) and **deliberately supersedes**
`docs/branding/brand-guide.md`, which described a generic dark-mode look
that no longer matches the site. See that file's header note.

## Architecture notes

**Data model — "usuario" is the root identity, not "alumno".** The original client-provided model treated `ALUMNO` (student) as the system's user, which breaks for one-off customers (someone who only rents the booth, buys gear, or sends a mastering job without ever enrolling). The corrected model: `usuario` is the single login identity; `alumno` and `profesor` are separate tables hanging off `usuario` via FK, not replacements for it. Transactional tables (`reserva`, `pago`, `venta_equipo`, `solicitud_reprogramacion`) key off `id_usuario`, never `id_alumno`. Full schema: `docs/db/la_juanita_schema.dbml.txt` (paste into dbdiagram.io to visualize).

**Two independent axes, not one `rol` column.** Permissions (what you may administer — this is what Spring Security reads) are separate from business relations (whether you have an `alumno` / `profesor` row — this is what builds the portal menu). Ghezz is `STAFF` *and* a `profesor` *and* can book a booth for himself, with no contradiction.

**There are four roles: `ADMIN` / `DIRECTIVO` / `STAFF` / `USUARIO`.** Not three. The plan of 2026-08-10 collapsed them to three; `docs/requirements/platform.md` §2.1 corrected that on 2026-08-11 because the commercial proposal promises four differentiated roles and Module 8 draws a real line between them (*"only directors and partners see the full dashboard; Micaela sees the basic financial summary"*). Four places now carry the four roles and must move together: the CHECK in `V1__baseline.sql`, the `Rol` enum in Java, the `Rol` type in TypeScript, and `docs/db/la_juanita_schema.dbml.txt`. Adding a role is a migration *plus* three file edits.

**Portal menu is three rules, not one.** Sections tied to a *relation* (Mis Cursos, Mis Alumnos, Subir Material) render only when the relation exists. Sections tied to a *service anyone can buy* (Reservar cabina, Mix & Mastering, Mis Pagos) always render — gate those on existing rows and a user who never booked can never make a first booking. Administration sections render by `rol`. All three are driven off `GET /api/me` (user + role + which relations exist); never hardcode the menu. The rules live in one file, `apps/platform/src/layout/menu.ts`.

**Login (built 2026-08-11).** `POST /api/auth/login` → BCrypt check → HMAC-signed JWT (8h, `sub` = user id, claim `rol`); `GET /api/me` re-reads the user from the database rather than trusting the claims, so a role change or a deactivation takes effect without waiting for the token to expire. Signing and verification are Spring Security's own (`starter-security-oauth2-resource-server`) — there is no hand-written auth filter, and there shouldn't be. The front stores the token in `localStorage` and sends it as `Authorization: Bearer`; in dev the Vite proxy forwards `/api` to `:8080`, so CORS is not exercised locally even though the backend configures it.

Things worth not re-learning, most found by auditing the first version:

- **`NimbusJwtEncoder` defaults to RS256** and fails with *"Failed to select a JWK signing key"* unless you pass `JwsHeader.with(MacAlgorithm.HS256)` — the symmetric key alone is not enough.
- **Spring's default JWT validator does not require `exp`** — it only checks it when present, so a token without one never expires. `SeguridadConfig` adds validators requiring `exp` *and* `iss`.
- **All three login failures (unknown email, wrong password, deactivated user) return the identical 401 body** on purpose — *and take the same time*. When the email doesn't exist the code still runs a BCrypt comparison against a decoy hash; without it the response came back in ~10 ms instead of ~88 ms and that gap alone told an attacker which emails have accounts. Don't "optimise away" that seemingly useless comparison, and don't differentiate the messages.
- **`/error` must stay `permitAll`.** It is Spring's internal error forward, not an endpoint. Left authenticated, every error on a public endpoint comes back as an empty 401 — a malformed login body returned 401 instead of 400, hiding the real failure from the front end.
- **`@EnableMethodSecurity` is on.** Without it a `@PreAuthorize` compiles and silently does nothing, which is worse than having no annotation at all.
- **Spring Security 7 adds a `FactorGrantedAuthority` (`FACTOR_BEARER`)** alongside your own authorities. Assert `contains("ROLE_X")`, never `containsExactly`.
- **The JWT signing secret is committed** in `application.properties` so a fresh clone runs. Anyone with repo access can forge an ADMIN token with it, so set `JWT_SECRET` anywhere reachable from outside; the app warns on every boot that uses the dev secret and refuses to start if a production profile is active.

**Backend**: Spring Boot 4.1 / Java 21, Spring Data JPA, Spring Security (JWT), Bean Validation, Lombok. `spring.jpa.hibernate.ddl-auto=validate` — no auto-DDL, ever. Schema lives in Flyway migrations under `src/main/resources/db/migration`: `V1__baseline.sql` (22 tables) and `V2__datos_iniciales.sql` (rooms + the room×use matrix). As of 2026-08-11 the app starts clean and both migrations apply.

**Spring Boot 4 moved autoconfigurations into their own modules.** Depending on raw `org.flywaydb:flyway-core` puts Flyway on the classpath but **it never runs at startup, silently** — the app boots against an empty database and `ddl-auto=validate` passes because there are no entities yet. The dependency that carries the autoconfiguration is `org.springframework.boot:spring-boot-starter-flyway`. Same pattern elsewhere in this pom: it uses `spring-boot-starter-webmvc`, not `spring-boot-starter-web`. Don't port Spring Boot 3 dependency names from memory — check the 4.1 BOM.

The same reshuffle hits **packages and libraries**, not just artifact ids. Verified on 4.1.0, each of these differs from what Boot 3 tutorials (and training data) say:

| What | Boot 3 | **Boot 4.1** |
|---|---|---|
| `@AutoConfigureMockMvc` | `…boot.test.autoconfigure.web.servlet` | `…boot.webmvc.test.autoconfigure` |
| JSON | Jackson 2, `com.fasterxml.jackson.databind` | **Jackson 3, `tools.jackson.databind`** |
| OAuth2 resource server starter | `spring-boot-starter-oauth2-resource-server` | either that or `spring-boot-starter-security-oauth2-resource-server` — the BOM ships **both, and they are identical** (checked); prefer the second for consistency |

When something won't resolve, list what's actually there instead of guessing: `mvn dependency:list`, or `jar tf` over the jars in `~/.m2`.

**Business rules are enforced in the database, not only in services.** A Postgres `EXCLUDE` constraint makes overlapping `reserva` rows for the same `sala` impossible; a composite FK to `sala_tipo_uso` makes an unauthorized room/use combination impossible (no recording in Sala 1, no mentoring in the recording booth); triggers keep reservations and `bloqueo_sala` from overlapping; a partial unique index allows only one active `inscripcion` per discipline per student. Read the comments in `V1__baseline.sql` before changing any of them — each one encodes a decision from `docs/requirements/platform.md`.

**`apps/landing/AGENTS.md`**: auto-generated by Next.js and re-written by `next dev` — it warns that this Next.js version has breaking changes vs. training data and to check `node_modules/next/dist/docs/` before writing Next-specific code there. Keep it committed; don't hand-edit it away.

**Out of scope for now**: WhatsApp Business API integration — deliberately excluded from the initial commercial proposal, but flagged as the highest-value fast-follow after delivery (it targets the client's #1 pain point: manual WhatsApp replies for scheduling/payments).
