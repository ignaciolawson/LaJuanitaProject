# La Juanita Studio / La Juanita Music

Sistema completo para el sello discográfico y academia de DJ y producción de música electrónica La Juanita (Pilar). Proyecto académico desarrollado por Ignacio Lawson.

Dos entregables:

1. **Landing pública de marketing** (`apps/landing`) — reemplaza el Linktree actual. Catorce rutas, estática. Ver [`apps/landing/CLAUDE.md`](apps/landing/CLAUDE.md).
2. **Sistema de gestión interno** (`apps/platform` + `apps/backend`) — alumnos, horarios/salas, pagos, portal alumno, portal profesor, mix & mastering, sello discográfico, dashboard de dirección.

## Estructura del repo

```
apps/
├── landing/     Next.js — landing pública (SSR/SSG, SEO)
├── platform/    React + Vite — SPA del sistema de gestión (autenticado)
└── backend/     Spring Boot — API única para landing (si aplica) y platform

docs/
├── relevamiento/  relevamiento y entrevistas al cliente
├── propuesta/     propuesta técnica y comercial
├── requirements/  alcance por app
├── branding/      assets de marca (la guía visual está supersedida)
└── db/            modelo de datos (DBML)
```

## Stack

- **Landing**: Next.js (App Router), TypeScript, Tailwind CSS v4, GSAP (ScrollSmoother, ScrollTrigger, SplitText, DrawSVG).
- **Platform**: React + Vite, TypeScript, Tailwind CSS.
- **Backend**: Java 21, Spring Boot, Spring Data JPA, Spring Security (JWT).
- **DB**: PostgreSQL.

## Desarrollo local

### 1. Base de datos

```
docker compose up -d
```

Levanta Postgres en `localhost:5432` (db `la_juanita`, user/pass `la_juanita`).
Docker Desktop tiene que estar corriendo, o el comando falla con un error de
*named pipe*.

### 2. Backend

```
cd apps/backend
mvn spring-boot:run
```

Queda en `http://localhost:8080`. Al arrancar, Flyway aplica las migraciones de
`src/main/resources/db/migration` sobre la base vacía.

> **Usá `mvn`, no `./mvnw`.** El wrapper intenta descargarse su propio Maven y
> falla en esta máquina; ya hay un Maven en el `PATH`. El `PATH` tiene JDK 25 y
> el pom apunta a 21: compila igual, no es el problema que parece.

### 3. Platform

```
cd apps/platform
npm run dev
```

Queda en `http://localhost:5173`. **Necesita el backend arriba**: el dev server
de Vite redirige `/api` a `:8080` (ver `vite.config.ts`), así que el navegador
ve un solo origen y no hay CORS en el medio.

Para entrar, las credenciales de desarrollo están más abajo.

### Landing

```
cd apps/landing
npm run dev
```

### Tests

```
cd apps/backend && mvn test        # 72 casos: login, JWT, registro, permisos, vigencia, errores
cd apps/platform && npm run build  # incluye el chequeo de tipos
cd apps/platform && npm run lint
```

Las pruebas de reglas de negocio de la base (69 casos SQL) se corren aparte;
las instrucciones están en la cabecera de
`apps/backend/src/test/resources/db/pruebas-reglas-negocio.sql`.

## Autenticación

Implementado en la Fase 0 (2026-08-11). El detalle de las decisiones está en
[`docs/sistema-gestion-plan.md`](docs/sistema-gestion-plan.md) §6.

| Endpoint | Acceso | Qué hace |
|---|---|---|
| `POST /api/auth/login` | **público** | `{email, password}` → `{token, expiraEn, usuario}` |
| `POST /api/auth/registro` | **público** | Crea una cuenta y devuelve la credencial ya emitida |
| `GET /api/me` | autenticado | El usuario del token: datos + `rol` + `esAlumno` / `esProfesor` |
| `POST /api/me/password` | autenticado | Cambiar la propia contraseña |
| `GET /api/usuarios` | ADMIN·DIRECTIVO·STAFF | Listado con buscador (`buscar`) y paginado (`pagina`, `tamanio`) |
| `GET /api/usuarios/{id}` | ADMIN·DIRECTIVO·STAFF | Una cuenta |
| `POST /api/usuarios` | ADMIN·STAFF | Alta con contraseña temporal |
| `PUT /api/usuarios/{id}` | ADMIN·STAFF | Editar datos de contacto |
| `PATCH /api/usuarios/{id}/activo` | ADMIN·STAFF | Baja o alta lógica |
| `GET /api/alumnos` | ADMIN·DIRECTIVO·STAFF | Listado con buscador y filtro `estado` |
| `GET /api/alumnos/{id}` | ADMIN·DIRECTIVO·STAFF | Perfil |
| `POST /api/alumnos` | ADMIN·STAFF | Alta (usuario existente o cuenta nueva) |
| `PUT /api/alumnos/{id}` | ADMIN·STAFF | Editar nivel de ingreso e Instagram |
| `PATCH /api/alumnos/{id}/estado` | ADMIN·STAFF | Activo / inactivo / suspendido |

Todo lo demás exige `Authorization: Bearer <token>`. Sobre los dos accesos:
`ADMIN·STAFF` es escritura y **`DIRECTIVO` queda afuera a propósito** — lee todo
el sistema y no modifica nada.

### Cómo entra la gente al sistema

Hay dos caminos, y los dos hacen falta:

1. **Se crea la cuenta sola**, desde `/registro`. **Cualquiera puede, sea alumno o
   no**: para ver tus reservas necesitás cuenta, y quien alquila una cabina una vez
   nunca va a cursar nada. Tener cuenta **no** te hace alumno.
2. **La crea administración**, para los alumnos que ya existen y para quien se anota
   por WhatsApp. El sistema genera una contraseña temporal que se muestra **una sola
   vez**, y obliga a cambiarla en el primer ingreso.

**Cómo funciona.** La contraseña se guarda solo como hash BCrypt; es
irreversible, y si alguien la olvida se resetea, no se recupera. El login
devuelve un JWT firmado con HMAC-SHA256 que vale 8 horas y lleva únicamente
`sub` (el id del usuario) y `rol` — un JWT va firmado pero **no** encriptado,
así que cualquiera que lo tenga puede leer sus claims. Firma y verificación las
hace Spring Security con su propio soporte JWT: no hay ningún filtro de
autenticación escrito a mano.

**Los permisos se resuelven contra la base en cada pedido, nunca contra el
token.** El claim `rol` es informativo y no autoriza nada. Cuesta una consulta
por pedido y a cambio da la propiedad que el sistema promete en todos lados:
desactivar a alguien (`usuario.activo = FALSE`) le corta el acceso **en el acto**,
y un cambio de rol pega en el pedido siguiente, sin esperar a que venza el token.

Los errores salen en formato ProblemDetail (RFC 7807): el mensaje para mostrar
está siempre en `detail`, y los errores por campo en `errores`.

### Roles

Son cuatro, y son un eje **independiente** de las relaciones de negocio:

| Rol | Alcance |
|---|---|
| `ADMIN` | Todo, incluida la administración de usuarios |
| `DIRECTIVO` | Lee todo. No escribe nada |
| `STAFF` | Opera: alumnos, reservas, pagos |
| `USUARIO` | Solo lo propio |

Tener fila en `alumno` o en `profesor` es otra cosa distinta del rol: alguien
puede ser `STAFF` **y** profesor **y** alquilarse una cabina, las tres a la vez.
El menú del portal se arma con la respuesta de `/api/me`
(`apps/platform/src/layout/menu.ts`), nunca hardcodeado.

> ⚠️ **Ocultar una opción del menú no es un mecanismo de seguridad**: cualquiera
> puede editar el JavaScript de su navegador. Quien autoriza de verdad es el
> backend, con `@PuedeLeerAdministracion` y `@PuedeOperar`
> (`apps/backend/.../config/`). El menú solo decide qué se dibuja.

### Credenciales de desarrollo

`admin@lajuanita.local` / `lajuanita2026`, sembradas por
`V3__usuario_admin_inicial.sql`. **Son de desarrollo**: el dominio `.local` no
existe ni puede registrarse. Antes del deploy real hay que crear los usuarios
reales y desactivar esta cuenta en una migración nueva.

### Antes de desplegar esto en algún lado

El secreto de firma JWT está **commiteado** en `application.properties` para que
el proyecto arranque recién clonado. Cualquiera que lo lea puede fabricar con él
un token de `ADMIN` sin saber ninguna contraseña. En cualquier entorno accesible
desde afuera hay que definir la variable de entorno `JWT_SECRET` (Base64, mínimo
32 bytes), y ese valor tiene que ser **nuevo**: el del repo hay que darlo por
público para siempre.

El candado **falla cerrado**: la aplicación **se niega a arrancar** si está
firmando con el secreto commiteado, salvo que
`lajuanita.jwt.permitir-secreto-de-desarrollo=true` esté en el
`application.properties` — la línea que un deploy no copia. No depende de que
alguien active un perfil de producción ni de que lea un WARN.

## Estado de la landing

Estática, sin datos dinámicos. Incluye academia (tres programas con página
de detalle), servicios (alquiler de cabina y grabación de sets), venta de
equipamiento, sello y blog.

**Todos los formularios son visuales**: solicitudes, reservas, consultas e
inicio de sesión no envían nada. El aviso de "no se envía" se sacó de pantalla
a pedido del cliente el 2026-08-09, así que hoy contestan "listo" sin que la
solicitud le llegue a nadie — **por eso la landing no se publica hasta que el
sistema de gestión pueda recibir esos formularios** (decisión del 2026-08-10).
Buena parte del contenido —precios incluidos— todavía es placeholder pendiente
de validar con el cliente; el detalle está en
[`apps/landing/CLAUDE.md`](apps/landing/CLAUDE.md).

## Modelo de datos

El schema corregido está en [`docs/db/la_juanita_schema.dbml.txt`](docs/db/la_juanita_schema.dbml.txt), listo para pegar en [dbdiagram.io](https://dbdiagram.io). Decisión clave: `usuario` es la identidad raíz del sistema (no `alumno`); `alumno`/`profesor` y las tablas transaccionales (`reserva`, `pago`, `venta_equipo`, `solicitud_reprogramacion`) cuelgan de `usuario` vía FK.
