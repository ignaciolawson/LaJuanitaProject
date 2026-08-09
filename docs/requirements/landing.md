# Landing Page — alcance

> Actualizado tras la reconstrucción de la landing. La versión anterior de
> este archivo listaba secciones que nunca se construyeron (Blog) o que se
> quitaron (Testimonios), y no incluía Servicios ni Equipos. Si algo acá
> contradice al código, gana el código: `apps/landing/CLAUDE.md` documenta
> el estado real.

## Objetivo

Presentar las cuatro patas del negocio y convertir visitantes en alumnos,
en reservas de cabina y en consultas de equipamiento. Reemplaza el Linktree.

## Rutas construidas

| Ruta | Estado |
| --- | --- |
| `/` | Home |
| `/programas` | Índice de los tres programas |
| `/programas/[slug]` | Detalle + solicitud (SSG, 3 slugs) |
| `/servicios` | Alquiler de cabina y grabación de sets + reserva |
| `/equipos` | La Juanita Shop + consulta |
| `/sello` | La Juanita Records |
| `/profesores` | |
| `/nosotros` | |
| `/faq` | |
| `/contacto` | |
| `/ingresar` | Login del campus — maqueta, sin auth |

## Secciones de la home

Hero · Próximas fechas · Manifiesto · Programas (riel horizontal anclado) ·
Números · Profesores · Servicios · Equipos · Sello · Cierre · Footer

**Testimonios se quitó** de la home: la única reseña disponible era
placeholder y no aportaba. Si aparecen testimonios reales, el lugar natural
es la página de cada programa, no la home.

**Blog no se construyó.** Estaba en la lista original pero implica un CMS o
MDX, contenido sostenido en el tiempo, y no hay quién lo escriba hoy. Si se
retoma, es una decisión de producto antes que de código.

## Programas

Tres, no cuatro. "DJ Inicial" y "DJ Avanzado" eran el mismo camino partido
en dos y obligaban a la persona a autodiagnosticarse el nivel antes de
entender qué se enseña:

1. **Convertite en DJ** — detalle + formulario de solicitud
2. **Producción Musical Electrónica** — detalle + formulario
3. **Mix & Mastering** — detalle + CTA de consulta (es a medida, con cupo de
   sala; pedir los mismos datos que en un programa con fecha de arranque no
   tendría sentido)

El nivel se resuelve dentro de la solicitud, con la pregunta de experiencia
previa.

## Formularios

Todos visuales, ninguno conectado. Ver `apps/landing/CLAUDE.md`.

## Animaciones

GSAP con ScrollSmoother, ScrollTrigger, SplitText y DrawSVG. La arquitectura
completa y las trampas de integración están en `apps/landing/CLAUDE.md`.

Regla de fondo: el movimiento tiene que salir de la identidad (el abanico
que se abre, el wordmark arqueado), no de un catálogo de efectos.

## Responsive

Desktop, tablet y mobile. El scroll horizontal anclado del riel de programas
existe sólo desde 1024px; abajo es lista vertical.

## Accesibilidad

- `prefers-reduced-motion` respetado en todos los componentes animados.
- SplitText revierte en cleanup: el texto sigue siendo texto real para
  lectores de pantalla y para SEO.
- Formularios con radios y checkboxes reales, navegables por teclado.

## Performance

Lazy loading, code splitting y optimización de imágenes vía `next/image`.
Objetivo Lighthouse > 95 — **sin medir todavía**, y hay dos deudas conocidas:
las fotos de `public/images/estudio/` pesan 1.3–1.7 MB en origen, y GSAP con
todos sus plugins no es liviano.

## Pendiente

- OG image y política de privacidad.
- Validar con el cliente todo el contenido placeholder (tabla en
  `apps/landing/CLAUDE.md`).
- Medir Lighthouse y optimizar imágenes en origen.
- Las páginas interiores conservan estructura vieja; funcionan y son
  coherentes, pero no están al nivel de la home.
