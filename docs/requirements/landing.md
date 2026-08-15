# Landing Page — alcance

> **Actualizado el 2026-08-15.** Si algo acá contradice al código, gana el
> código: `apps/landing/CLAUDE.md` documenta el estado real.
>
> Este archivo se equivocó dos veces en el mismo lugar, y las dos por quedarse
> atrás del código. La primera fue **decir que el blog "no se construyó" cuando
> existía**, con seis notas publicadas y en el sitemap (DOC-05): el documento que
> fija qué se comprometió negaba la existencia de la sección de mayor riesgo de
> publicación del sitio, así que un checklist armado leyendo esto se la salteaba
> entera. La segunda fue seguir listando **tres programas** después de que Mix &
> Mastering dejara de ser uno (§13 de `platform.md`, SEO-01).
>
> La moraleja para quien lo edite: cuando cambia una ruta o una sección, esto se
> toca **en el mismo commit**.

## Objetivo

Presentar las cuatro patas del negocio y convertir visitantes en alumnos,
en reservas de cabina y en consultas de equipamiento. Reemplaza el Linktree.

## Rutas construidas

**13 archivos de ruta → 19 páginas generadas, 18 en el sitemap.**

| Ruta | Estado |
| --- | --- |
| `/` | Home |
| `/programas` | Índice de los dos programas |
| `/programas/[slug]` | Detalle + solicitud (SSG, 2 slugs) |
| `/servicios` | Alquiler de cabina y grabación de sets + reserva |
| `/equipos` | La Juanita Shop + consulta |
| `/sello` | La Juanita Records |
| `/blog` | Índice de notas |
| `/blog/[slug]` | Nota (SSG, un slug por entrada de `data/posts.ts` — hoy 6) |
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

**El blog SÍ se construyó** (2026-08-10), y este documento dijo lo contrario
durante días. Existen `/blog` y `/blog/[slug]`, con seis notas en
`data/posts.ts`, en el sitemap, con `Blog` y `BlogPosting` en datos
estructurados, y las tres últimas se muestran en la home (sección `Journal`).

Está armado para mudarse a un CMS sin reescribir las páginas: el cuerpo de una
nota es un array de bloques tipados —la forma del Portable Text de Sanity, a
propósito—, así que migrar es cambiar `data/posts.ts` por un fetch.

⚠️ **Las seis notas son inventadas, y eso bloquea publicar** — ver *Pendiente*.
Hasta el 2026-08-14 además estaban firmadas con los nombres reales de tres
profesores que no las escribieron; hoy firman "Equipo La Juanita".

Y sigue en pie lo que decía la versión vieja de este párrafo, que es un argumento
de producto y no de código: **un blog es un compromiso de publicar.** La última
nota de hace ocho meses se lee como "esto está abandonado", y encima la home la
muestra. Si el cliente no va a escribir, la sección conviene sacarla, no dejarla
quieta.

## Programas

**Dos.** Fueron cuatro, después tres, y desde el 2026-08-14 son dos:

1. **Convertite en DJ** — 8 clases. Detalle + formulario de solicitud
2. **Producción Musical Electrónica** — 16 clases. Detalle + formulario

De cuatro a tres: "DJ Inicial" y "DJ Avanzado" eran el mismo camino partido en
dos y obligaban a la persona a autodiagnosticarse el nivel antes de entender qué
se enseña. El nivel se resuelve dentro de la solicitud, con la pregunta de
experiencia previa.

De tres a dos: **Mix & Mastering no es un programa, es un servicio** (§13 de
`docs/requirements/platform.md`, P31). La landing lo había inventado como un
curso de 3 meses, con página propia y un `Course` de schema.org declarando
instancias que se dictan. Sigue siendo una línea real del negocio —y tiene su
propio módulo en el sistema de gestión—, pero no se vende como cursada.

**El formato, confirmado (§13, P34): una clase por semana, de 1:30.** Se publica
la CANTIDAD DE CLASES y no una cantidad de meses: ninguna clase se pierde, así
que la fecha de fin depende de cada alumno y un número de meses se leería como un
compromiso. La landing publicaba "6 meses, 2 clases semanales" y "8 meses", que
no era una imprecisión sino otro producto.

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
Objetivo Lighthouse > 95 — **sigue sin medirse** (SEO-06).

Una de las dos deudas que este párrafo declaraba ya está saldada: las fotos se
recomprimieron (`public/images`: 11 MB → 2,7 MB, lado largo acotado a 2000px).
La otra sigue: GSAP con todos sus plugins no es liviano.

**Cuando se mida, medir contra `npm run build && npm start`**, nunca contra
`next dev`: la primera visita paga la codificación de cada imagen y en desarrollo
eso se paga seguido, así que el número no significaría nada.

## Pendiente

### Bloquea publicar

1. **Conectar los formularios.** Los cinco contestan "listo" sin enviar nada, y
   el aviso de "no se envía" se sacó de pantalla el 2026-08-09 a pedido del
   cliente. Publicar así pierde leads reales. Decisión del 2026-08-10: la landing
   espera al sistema de gestión (~septiembre).
2. **Reescribir o borrar las seis notas del blog.** Son inventadas. Publicar
   consejos técnicos falsos con formato de nota técnica es peor que no tener
   blog.
3. **Validar los precios**, que hoy salen con la salvedad "precio de
   referencia". Es lo mínimo, no lo correcto: son las decisiones de plata más
   grandes del catálogo.

### No bloquea

- Validar el resto del contenido placeholder (tabla por archivo en
  `apps/landing/CLAUDE.md`).
- Perfiles reales de Instagram y YouTube; hoy son el dominio pelado y quedan
  fuera de `sameAs`.
- Coordenadas del local. La dirección está confirmada; el punto del mapa, no.
- Política de privacidad.
- Medir Lighthouse (SEO-06).
- Corregir el "desde 2019" de `sections/Numbers.tsx` y la línea de tiempo de
  `/nosotros`: el año confirmado es **2021**, y es lo que publica el JSON-LD.
- Las páginas interiores conservan estructura vieja; funcionan y son coherentes,
  pero no están al nivel de la home.

**Ya no está pendiente:** la OG image existe y se genera en build
(`app/opengraph-image.tsx`), y las fotos ya se optimizaron en origen.
