# landing — sitio público de La Juanita Studio

Sitio de marketing que reemplaza el Linktree actual: academia de DJ y de
producción, alquiler de cabina, grabación de sets, venta de equipamiento, sello
discográfico y blog. Next.js (App Router) + Tailwind v4 + GSAP, **estático**.

La parte interna del proyecto es otra app (`apps/platform`); esta no tiene
sesión ni datos dinámicos.

**Estado (2026-08-15):** terminado como sitio. 13 archivos de ruta → 19 páginas
generadas, 18 en el sitemap. Lo que falta no es código: es contenido del cliente
y la conexión de los formularios.

---

## ⚠️ No se publica todavía, y no es un detalle de agenda

**Los cinco formularios no envían nada a ningún lado, y contestan "listo".**
Solicitud de programa, reserva de cabina, consulta de equipos, contacto e
inicio de sesión: todos simulan el envío. El aviso de "no se envía" se sacó de
pantalla a pedido del cliente el 2026-08-09, así que hoy una persona completa el
formulario, lee que su solicitud fue recibida, y la solicitud no le llega a
nadie.

**Publicar el sitio en ese estado no es publicar antes de tiempo: es perder
leads reales y quedar mal con quien escribió.**

La decisión, del 2026-08-10: **la landing espera al sistema de gestión.** Los
formularios se conectan al backend cuando el módulo de alumnos esté vivo
(~septiembre) y recién ahí se publica. No hay parche intermedio —ni relay de
mail, ni servicio de formularios de terceros—, y es una decisión, no una
omisión: el punto de conexión es el `onSubmit` de
`src/components/forms/Fields.tsx` y `src/components/forms/LoginForm.tsx`.

Además hay contenido que **bloquea publicar** aunque los formularios estuvieran
conectados:

- **Las seis notas del blog son inventadas.** Hoy firman "Equipo La Juanita"
  —hasta el 2026-08-14 firmaban con los nombres reales de tres profesores, que
  no las escribieron—, pero siguen siendo texto de relleno con formato de nota
  técnica. Se reescriben o se borran.
- **Casi todo el texto largo y todos los precios son placeholder.** Los precios
  llevan la salvedad "precio de referencia", que es lo mínimo, no lo correcto.
  La tabla de qué está inventado, archivo por archivo, está en
  [`CLAUDE.md`](CLAUDE.md).

---

## Correrlo

```
npm run dev      # http://localhost:3000
npm run build    # build de producción (genera sitemap, robots y la imagen social)
npm run lint     # eslint
```

Desde la raíz del repo: `npm run dev:landing` y `npm run build:landing`.

No necesita backend, ni base de datos, ni variables de entorno. Sí necesita
salida a internet **en tiempo de build**: `next/font` descarga las tipografías
de Google Fonts.

**Si estás midiendo rendimiento, medí contra `npm run build && npm start`**, no
contra `next dev`. La primera visita paga la codificación de cada imagen (~7 s
en la home con la caché de imágenes vacía) y en desarrollo eso se paga seguido.

---

## Cómo está armado

```
src/
├── app/          rutas (App Router) + sitemap.ts, robots.ts, opengraph-image.tsx
├── components/
│   ├── brand/    abanico SVG y wordmark arqueado
│   ├── motion/   infraestructura de animación reutilizable
│   ├── sections/ secciones de la home
│   ├── forms/    formularios (ninguno envía nada — ver arriba)
│   ├── blog/     cuerpo y tarjeta de nota
│   └── seo/      inserta bloques de JSON-LD
├── data/         TODO el contenido, en TypeScript. Nada hardcodeado en el JSX
└── lib/          gsap.ts (plugins y helpers), seo.ts (metadata y JSON-LD)
```

**Dos archivos concentran las decisiones que más cuesta reconstruir:**

- **[`CLAUDE.md`](CLAUDE.md)** — el sistema visual, la arquitectura de
  movimiento, el repaso de móvil y **diecinueve trampas de integración ya
  resueltas**. Leelo antes de tocar estilos o animaciones: varias de esas
  trampas se re-rompen sin darse cuenta y el build pasa igual en verde.
- **[`src/data/business.ts`](src/data/business.ts)** — los hechos del negocio, y
  la regla que gobierna todo el SEO: **en los datos estructurados sólo entra lo
  verificado.** Lo que no está confirmado va como `null` y los constructores de
  JSON-LD lo omiten en vez de rellenarlo. Un dato provisorio en pantalla se lee
  como provisorio; el mismo dato en JSON-LD se publica como un hecho que Google
  levanta y un LLM repite.

**El contenido vive en `src/data/*.ts`**, no en las páginas. Agregar una nota al
blog, un programa o un servicio es editar un archivo de datos.

**El blog está construido para mudarse a un CMS.** El cuerpo de una nota es un
array de bloques tipados —la forma del Portable Text de Sanity, a propósito—,
así que migrar es cambiar `data/posts.ts` por un fetch, sin tocar el renderer.
Ver el punto de decisión en `CLAUDE.md`.

---

## SEO y datos estructurados

Canonicales, `sitemap.xml`, `robots.txt`, imagen social generada en build,
`llms.txt` y JSON-LD en todas las rutas (`LocalBusiness` +
`EducationalOrganization`, `Course`, `Service`, `FAQPage`, `Person`,
`BlogPosting`, `BreadcrumbList`).

**Los bots de IA están permitidos a propósito** en `robots.ts`: bloquearlos
evita el entrenamiento pero también hace imposible que el negocio sea citado, y
para una academia local sin tráfico orgánico ser citado vale más. `CCBot` es el
único bloqueado — entrena a granel y no deriva tráfico.

`public/llms.txt` es estático y **se actualiza a mano**: si cambian programas,
servicios o datos de contacto, hay que tocarlo.

---

## Qué falta

| | |
|---|---|
| **Conectar los formularios** | Bloquea publicar. Ver arriba |
| **Reescribir o borrar las seis notas del blog** | Bloquea publicar |
| Validar los textos largos y **todos los precios** | Tabla por archivo en `CLAUDE.md` |
| Perfiles reales de Instagram y YouTube | Hoy son el dominio pelado y quedan fuera de `sameAs` |
| Coordenadas del local | La dirección está confirmada; el punto en el mapa, no |
| Casilla de email | No existe una. El canal es WhatsApp |
| Política de privacidad | — |
| Medir Core Web Vitals en móvil | Nunca se midió (SEO-06) |

---

## Más contexto

- [`CLAUDE.md`](CLAUDE.md) — diseño, movimiento, móvil, trampas resueltas, SEO.
- [`../../docs/requirements/landing.md`](../../docs/requirements/landing.md) —
  qué se comprometió.
- [`../../README.md`](../../README.md) — el monorepo entero.
- `AGENTS.md` lo genera y reescribe `next dev`. Está commiteado a propósito;
  no lo borres del diff.
