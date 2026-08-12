# platform — sistema de gestión de La Juanita

SPA autenticada. Es la parte interna del proyecto: alumnos, salas y reservas,
pagos, portales de alumno y profesor, mix & mastering, sello y dashboard de
dirección. Nada de esto es público — la landing es otra app (`apps/landing`).

**Estado (2026-08-11):** solo está construido el login. Los ocho módulos de
negocio vienen después; el primero es Alumnos, en septiembre. Las secciones del
menú que todavía no existen se dibujan apagadas a propósito.

## Correrlo

```
npm run dev      # http://localhost:5173
npm run build    # incluye el chequeo de tipos (tsc -b)
npm run lint     # oxlint
```

**Necesita el backend arriba en `:8080`**, y el backend necesita Postgres. El
orden completo está en el [README de la raíz](../../README.md). El dev server
redirige `/api` al backend (ver `vite.config.ts`), así que el navegador ve un
solo origen y no hay CORS en el medio.

Credenciales de desarrollo: `admin@lajuanita.local` / `lajuanita2026`.

## Cómo está armado

```
src/
├── api/        cliente HTTP (un solo punto de salida) y tipos del backend
├── auth/       contexto de sesión, credencial en localStorage, ruta protegida
├── layout/     shell con el menú lateral + las reglas del menú
└── paginas/    pantallas
```

**El flujo de sesión.** `AuthProvider` arranca en estado `cargando`: si hay una
credencial guardada y vigente, le pregunta al backend quién es con `GET /api/me`
antes de decidir nada. Ese tercer estado no es un detalle — sin él, el primer
render diría "anónimo" y expulsaría al login a alguien que ya estaba adentro
cada vez que refresca la página.

`RutaProtegida` envuelve todo lo que exige sesión, así que agregar un módulo es
agregar una `<Route>` adentro y nada más.

**El menú sale de `/api/me`, nunca de una condición hardcodeada.** Las reglas
están todas en `layout/menu.ts`, y son tres:

1. Secciones de **un servicio que cualquiera contrata** (reservar cabina, mix &
   mastering, mis pagos) → aparecen **siempre**. Si se mostraran solo a quien ya
   tiene una reserva, quien nunca reservó no vería nunca el botón de reservar.
2. Secciones ligadas a **quién sos** (mis cursos, mis alumnos) → solo si existe
   la relación (`esAlumno` / `esProfesor`).
3. Secciones de **administración** → según el rol.

> ⚠️ Ocultar una opción del menú **no** es seguridad: cualquiera puede editar el
> JavaScript de su navegador. Quien autoriza de verdad es el backend. El menú
> solo decide qué se dibuja.

## Decisiones que conviene no re-discutir sin motivo

- **La credencial va en `localStorage`** y viaja en el header `Authorization`.
  Es simple y sobrevive al refresh; la contracara es que un XSS en esta app
  podría leerla. Se mitiga con el vencimiento corto (8 h). La alternativa es una
  cookie `httpOnly`, y cambiarlo toca `auth/credencial.ts` y el CORS del backend.
- **No hay librería de caché de datos** (TanStack Query y similares). Con un
  endpoint es sobre-ingeniería; entra cuando haya listas y mutaciones de verdad.
- **Un solo cliente HTTP**, en `api/cliente.ts`. Todo pasa por ahí, incluido el
  cierre de sesión automático cuando el backend rechaza la credencial.
