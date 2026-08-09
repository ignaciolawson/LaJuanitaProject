# La Juanita Studio / La Juanita Music

Sistema completo para el sello discográfico y academia de DJ y producción de música electrónica La Juanita (sede Pilar, expansión a Córdoba). Proyecto académico desarrollado por Ignacio Lawson.

Dos entregables:

1. **Landing pública de marketing** (`apps/landing`) — reemplaza el Linktree actual. Doce rutas, estática. Ver [`apps/landing/CLAUDE.md`](apps/landing/CLAUDE.md).
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

### Base de datos

```
docker compose up -d
```

Levanta Postgres en `localhost:5432` (db `la_juanita`, user/pass `la_juanita`).

### Landing

```
cd apps/landing
npm run dev
```

### Platform

```
cd apps/platform
npm run dev
```

### Backend

```
cd apps/backend
./mvnw spring-boot:run
```

## Estado de la landing

Estática, sin datos dinámicos. Incluye academia (tres programas con página
de detalle), servicios (alquiler de cabina y grabación de sets), venta de
equipamiento y sello.

**Todos los formularios son visuales**: solicitudes, reservas, consultas e
inicio de sesión no envían nada y lo avisan en pantalla. Buena parte del
contenido —precios incluidos— todavía es placeholder pendiente de validar
con el cliente; el detalle está en [`apps/landing/CLAUDE.md`](apps/landing/CLAUDE.md).

## Modelo de datos

El schema corregido está en [`docs/db/la_juanita_schema.dbml.txt`](docs/db/la_juanita_schema.dbml.txt), listo para pegar en [dbdiagram.io](https://dbdiagram.io). Decisión clave: `usuario` es la identidad raíz del sistema (no `alumno`); `alumno`/`profesor` y las tablas transaccionales (`reserva`, `pago`, `venta_equipo`, `solicitud_reprogramacion`) cuelgan de `usuario` vía FK.
