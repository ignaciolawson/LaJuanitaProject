@AGENTS.md

# CLAUDE.md — `apps/landing`

Guía para trabajar sobre la landing pública. El `CLAUDE.md` de la raíz cubre
el monorepo entero; este archivo es sólo esta app.

> **Leé esto antes de tocar estilos o animaciones.** El sistema visual está
> construido sobre decisiones que no se deducen mirando el código, y hay
> varias trampas de integración ya resueltas que es muy fácil re-romper.

---

## Qué es

Landing pública de La Juanita Studio: academia de DJ y producción, estudio
de mix & mastering, sello discográfico, alquiler de cabina y venta de
equipamiento. Next.js (App Router) + Tailwind v4 + GSAP. Todo estático.

**No hay backend.** Ningún formulario envía nada — ver [Formularios](#formularios-todo-visual).

## Rutas

```
/                     home
/programas            índice de los tres programas
/programas/[slug]     detalle + solicitud (SSG, 3 slugs)
/servicios            alquiler de cabina y grabación + reserva
/equipos              La Juanita Shop + consulta
/sello                La Juanita Records
/profesores
/nosotros
/faq
/contacto
/ingresar             login del campus (maqueta, sin auth)
```

---

## Dirección de diseño

El sistema sale del logo real —el abanico calado y el wordmark arqueado tipo
parche de espalda—, no de una plantilla. Tres decisiones sostienen todo:

**Tres tintas y nada más.** Hueso `#e8e1d4`, tinta `#0a0a0b`, rojo de marca
`#e52328`. El rojo se usa con cuentagotas en todo el sitio para que rinda en
los dos lugares donde ocupa superficie grande: la banda de "DJ Shop" y el
wordmark del footer. Si metés rojo en todos lados, esos dos momentos dejan
de funcionar.

**Contraste tipográfico como carácter.** Archivo variable con eje de ancho
(wdth 62–125): titulares ultra-expandidos (`.t-display`, 125%) contra
etiquetas condensadas y mono minúscula. Instrument Serif itálica como único
acento humano. Ese salto de escala es la mitad del diseño — si lo aplanás,
vuelve a parecer una plantilla.

**El abanico como motivo, no como imagen.** Redibujado en SVG
(`components/brand/Fan.tsx`) con cada varilla como nodo propio, para que se
abra, se cierre y se dibuje con el scroll.

### Utilidades tipográficas (`globals.css`)

| Clase | Para qué |
| --- | --- |
| `.t-display` | Titulares grandes. Expandida 125%, `line-height: 0.86` |
| `.t-display-tight` | Subtítulos y nombres. Condensada 78% |
| `.t-serif` | Instrument Serif itálica, acento |
| `.t-mono` | Space Mono, metadatos y etiquetas |
| `.t-body` | Texto corrido |
| `.h-xl` `.h-lg` `.h-md` `.h-sm` | Escalas de tamaño con `clamp()` |
| `.label` | Etiqueta roja con guion (reemplaza al "eyebrow" típico) |
| `.btn` `.btn--solid` `.btn--strong` | Botón parche. `--strong` para fondos con foto |

---

## Arquitectura de movimiento

```
lib/gsap.ts           plugins + eases propias (juanita / swipe / snap)
lib/velocity.ts       velocidad de scroll compartida
components/motion/    SmoothScroll, ThemeScroller, Preloader, Cursor,
                      SplitReveal, Magnetic, VelocityMarquee, ScrollFx
components/brand/     Fan (abanico SVG), ArcText (wordmark arqueado)
components/sections/  Hero, Manifesto, ProgramsRail, Numbers, Teachers,
                      Services, Gear, Releases, Cta
```

**ThemeScroller** es la pieza menos obvia y la que más se nota. Cada
`<section data-theme="ink|bone">` hace que el fondo del **documento entero**
interpole — nav, cursor y footer incluidos. La secuencia de secciones
(cabina oscura → luz de día → cabina) es parte del diseño, no sólo del
contenido. Al agregar una sección, elegí el tema mirando el ritmo y no la
sección aislada: cuatro `ink` seguidos aplanan la página.

Toda página nueva necesita al menos un `data-theme`, o el tema queda colgado
del último color de la página anterior.

---

## Trampas resueltas — no las re-rompas

1. **`position: sticky` no funciona dentro de ScrollSmoother.** El wrapper
   tiene `overflow: hidden` + transform, así que sticky se ancla al wrapper,
   que nunca scrollea. Para apilar usá `pin` + `pinSpacing: false` (ver
   `sections/Releases.tsx`).
2. **Tailwind v4 escribe la propiedad `translate`; GSAP escribe
   `transform`.** Las dos se aplican a la vez. Un `translate-y-[110%]` de
   clase sobrevive aunque GSAP lleve el elemento a `yPercent: 0`, y queda
   corrido para siempre. Los estados iniciales van en CSS, no en clases.
3. **`overflow-x: hidden` en `body`** lo convierte en contenedor de scroll y
   rompe smoother y sticky. Está en `clip` a propósito.
4. **GSAP no interpola `color-mix()` ni `backdrop-filter: blur()`.** Los
   trata como strings opacos y hace un salto seco. El fondo del navbar es
   una capa aparte a la que se le anima la opacidad.
5. **Con ScrollSmoother, `body.style.overflow` no bloquea nada.** Para
   frenar el scroll hay que pausar el smoother (`ScrollSmoother.get()`).
6. **Todo lo `position: fixed`** (nav, cursor, grano, preloader) va FUERA de
   `#smooth-content`. Dentro de un transform, `fixed` se ancla al padre.
7. **`axes: ["wdth"]`** es obligatorio en el `next/font` de Archivo. Sin eso
   Next baja sólo el eje de peso y `font-stretch` no hace nada.
8. **`line-height: 0.86` corta glifos.** La caja de línea es más baja que
   las tildes de mayúscula (NÚMEROS) y las colas de la "y", y cualquier
   `overflow: hidden` encima se las come. Se compensa con padding en la
   línea y margen negativo en la máscara (`.reveal-line` /
   `.reveal-line-mask`).
9. **Scroll horizontal secuestrado sólo en escritorio.** El riel de
   programas se ancla desde 1024px; abajo es lista vertical. Secuestrar el
   scroll en un teléfono es un problema de accesibilidad.

---

## Formularios: todo visual

**Ninguno envía nada a ningún lado.**

| Formulario | Dónde | Qué falta |
| --- | --- | --- |
| Solicitud de programa | `/programas/convertite-en-dj`, `/programas/produccion-musical` | endpoint + aviso al equipo |
| Reserva de cabina | `/servicios#reservar` | endpoint + disponibilidad real de sala |
| Consulta de equipos | `/equipos#consultar` | endpoint + aviso al shop |
| Inicio de sesión | `/ingresar` | auth, sesión, campus |
| Contacto | `/contacto` | preexistente, sigue sin conectar |

Muestran un aviso explícito de "todavía no se envía" en vez de fingir éxito.
**Mantené ese aviso mientras no haya backend**: hacer parecer que funciona
deja a alguien esperando una respuesta que nunca llega.

Punto de conexión cuando exista la API: el `onSubmit` de `FormShell` en
`components/forms/Fields.tsx`, y `components/forms/LoginForm.tsx`.

La reserva calcula un **precio estimado** sobre el precio por hora de
`data/services.ts`, etiquetado como referencia. No lo presentes como total
cerrado sin validar disponibilidad.

---

## Contenido: qué es real y qué es placeholder

Casi todo el texto largo está escrito con la voz del negocio, pero es
**inventado**. Antes de publicar hay que validar:

| Archivo | Qué está inventado |
| --- | --- |
| `data/services.ts` | Precios ($18.000/h cabina, $65.000/h grabación) y el "qué incluye" |
| `data/gear.ts` | Qué entra en cada categoría |
| `data/programs.ts` | Textos largos: qué es, por qué acá, para quién, temario, precios |
| `data/releases.ts`, `dates.ts`, `teachers.ts`, `faq.ts` | Placeholder heredado |
| `data/contact.ts` | WhatsApp `5491100000000` es falso. Spotify e Instagram ya son reales |
| `sections/Numbers.tsx` | 200+ alumnos, 12 lanzamientos, "desde 2019" |
| `app/nosotros/page.tsx` | La línea de tiempo (2019 → 2021 → 2023) |

**Sobre `data/gear.ts`:** no hay marcas ni modelos, y es deliberado.
Publicar un modelo concreto es un compromiso de venta — si no está en stock,
alguien llega al local a buscarlo. Cuando exista catálogo real, `/equipos`
es el lugar para una grilla con precios y el formulario pasa a segundo plano.

---

## Convenciones

- Los componentes de sección son `"use client"` cuando animan; las páginas
  son server components y pasan datos.
- Animaciones siempre dentro de `useGSAP` con `scope`, y con salida
  temprana por `prefersReduced()`.
- Los datos viven en `src/data/*.ts`, nunca hardcodeados en el JSX.
- `components/motion/` es infraestructura reutilizable;
  `components/sections/` es contenido de la home.

## Verificar antes de entregar

```bash
npm run build:landing            # desde la raíz
cd apps/landing && npm run lint
```

`next/font` necesita salida a `fonts.googleapis.com` en tiempo de build.

## Falta

- OG image (`opengraph-image.tsx`) y política de privacidad.
- Las páginas interiores (`/sello`, `/profesores`, `/faq`, `/contacto`)
  recibieron migración de tokens y tipografía, pero conservan estructura
  vieja (`EditorialRow`). Son coherentes, no están al nivel de la home.
- Las fotos de `public/images/estudio/` pesan 1.3–1.7 MB en origen.
