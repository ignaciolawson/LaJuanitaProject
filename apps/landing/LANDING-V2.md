# Landing V2 — notas de handoff

Rama: `feat/landing-v2`. Build de producción verificado (10 rutas, TS + ESLint limpios).

## Dirección de diseño

El sistema sale del logo real, no de una plantilla: el abanico calado y el
wordmark arqueado tipo parche de espalda. De ahí salen tres decisiones:

- **Tres tintas y nada más.** Hueso (`#e8e1d4`), tinta (`#0a0a0b`) y el rojo
  de la marca (`#e52328`). El rojo se usa con cuentagotas en toda la página
  para que en el footer, donde ocupa superficie grande, pegue.
- **Contraste tipográfico como carácter.** Archivo variable con el eje de
  ancho: titulares ultra-expandidos (`.t-display`, wdth 125%) contra
  etiquetas condensadas y mono minúscula. Instrument Serif itálica como
  único acento "humano". Ese salto de escala es la mitad del diseño.
- **El abanico como motivo, no como imagen.** Redibujado en SVG con cada
  varilla como nodo propio, así se abre, se cierra y se dibuja con el scroll.

## Arquitectura de movimiento

```
lib/gsap.ts              plugins + eases propias (juanita / swipe / snap)
lib/velocity.ts          velocidad de scroll compartida
components/motion/       SmoothScroll, ThemeScroller, Preloader, Cursor,
                         SplitReveal, Magnetic, VelocityMarquee, ScrollFx
components/brand/        Fan (abanico SVG), ArcText (wordmark arqueado)
components/sections/     Hero, Manifesto, ProgramsRail, Numbers, Teachers,
                         Releases, Voices, Cta
```

**ThemeScroller** es la pieza menos obvia y la que más se nota: cada
`<section data-theme="ink|bone">` hace que el fondo del **documento entero**
interpole — nav, cursor y footer incluidos. La secuencia de secciones
(cabina → luz → cabina) es parte del diseño, no sólo del contenido.

## Trampas que ya están resueltas (no las re-rompas)

1. **`position: sticky` no funciona dentro de ScrollSmoother.** El wrapper
   tiene `overflow:hidden` + transform, así que sticky se ancla al wrapper,
   que nunca scrollea. La pila de releases usa `pin` + `pinSpacing:false`.
2. **Tailwind v4 escribe `translate`; GSAP escribe `transform`.** Las dos se
   aplican. Un `translate-y-[110%]` de clase sobrevive aunque GSAP lleve el
   elemento a `yPercent: 0`. Los estados iniciales del hero van en CSS.
3. **`overflow-x: hidden` en body** lo convierte en contenedor de scroll y
   rompe smoother + sticky. Está en `clip`.
4. **GSAP no interpola `color-mix()` ni `backdrop-filter: blur()`.** El fondo
   del navbar es una capa aparte a la que se le anima la opacidad.
5. **Con ScrollSmoother, `body.style.overflow` no bloquea el scroll.** El
   menú móvil pausa el smoother.
6. **Todo lo `position: fixed`** (nav, cursor, grano, preloader) va FUERA de
   `#smooth-content`.
7. **`axes: ["wdth"]`** es obligatorio en el `next/font` de Archivo. Sin eso
   Next baja sólo el eje de peso y `font-stretch` no hace nada.

## Formularios: todo visual, nada conectado

Hay cuatro formularios y **ninguno envía nada a ningún lado**:

| Formulario | Dónde | Qué falta |
| --- | --- | --- |
| Solicitud de programa | `/programas/convertite-en-dj`, `/programas/produccion-musical` | endpoint + mail al equipo |
| Reserva de cabina | `/servicios#reservar` | endpoint + disponibilidad real de sala |
| Inicio de sesión | `/ingresar` | auth, sesión, campus |
| Consulta de equipos | `/equipos#consultar` | endpoint + mail al shop |
| Contacto | `/contacto` | ya existía, sigue sin conectar |

Los tres nuevos muestran un aviso explícito de "todavía no se envía" en vez
de fingir éxito. Cuando exista el backend, el único punto a tocar es el
`onSubmit` de `components/forms/Fields.tsx` (`FormShell`) y de
`components/forms/LoginForm.tsx`.

La reserva muestra un **precio estimado** calculado sobre el precio por hora
de `data/services.ts`. Está etiquetado como referencia a propósito: prometer
un total exacto sin validar disponibilidad sería mentirle a quien reserva.

## Estructura de programas

De cuatro programas a tres. "DJ Inicial" y "DJ Avanzado" eran el mismo
camino partido en dos, y obligaban a la persona a autodiagnosticarse el
nivel antes de entender qué se enseña. Ahora:

- **Convertite en DJ** — página de detalle + formulario de solicitud
- **Producción Musical Electrónica** — página de detalle + formulario
- **Mix & Mastering** — página de detalle + CTA de consulta (es a medida y
  con cupo de sala; pedir los mismos datos que en un programa con fecha de
  arranque no tendría sentido)

El nivel se resuelve dentro de la solicitud, con la pregunta de experiencia
previa: cero / algo por mi cuenta / ya toco.

## La Juanita Shop (`/equipos`)

Cuatro categorías tomadas del posteo real: controladores, monitores de
estudio, auriculares y accesorios.

**No hay marcas, modelos ni precios, y es deliberado.** Publicar "Pioneer
DDJ-FLX4" es un compromiso de venta: si no está en stock, alguien llega al
local a buscarlo. Cada categoría describe el rango y el criterio, y la
conversión es la consulta — que además es como vende el negocio según su
propio posteo ("te asesoramos según tu nivel, presupuesto y objetivos").

Cuando exista catálogo con stock, `/equipos` es el lugar natural para una
grilla de productos con precio, y el formulario pasa a segundo plano.

La banda roja de "DJ SHOP" está calcada de la placa de Instagram: es el
único lugar del sistema donde el rojo ocupa una franja entera, lo que la
convierte en la señal de "acá se vende" frente al resto del sitio.

## Pendiente antes de publicar (contenido, no código)

- `src/data/contact.ts`: el WhatsApp es `5491100000000` y las redes apuntan
  a las home de Instagram / Spotify / YouTube.
- `src/components/sections/Numbers.tsx`: 200+ alumnos, 12 lanzamientos y
  "desde 2019" son placeholders inventados. Confirmalos.
- `src/data/services.ts`: precios ($18.000/h cabina, $65.000/h grabación) y
  todo el "qué incluye" son inventados. Es lo primero a corregir, porque son
  los números que alguien va a usar para decidir.
- `src/data/programs.ts`: los textos largos (qué es, por qué acá, para
  quién, temario) están escritos con la voz del negocio pero son inventados.
- `src/data/gear.ts`: los textos de cada categoría son inventados. Lo que
  entra en cada una ("controladores de dos canales", "monitores 5\" a 8\"")
  hay que validarlo contra el stock real.
- `src/app/nosotros/page.tsx`: la línea de tiempo (2019 sello → 2021 estudio
  → 2023 academia) es inventada. Las fechas reales las tenés vos.
- `src/data/dates.ts`, `releases.ts`, `testimonials.ts`, `faq.ts` y los
  precios de `programs.ts` siguen marcados como placeholder en el repo.
- Falta OG image (`opengraph-image.tsx`) y la política de privacidad, que en
  el sitio actual estaba rota.

## Bugs corregidos en esta iteración

- **Texto desbordando las tarjetas del riel de programas.** El panel fijaba
  alto en `52vh` y el contenido no cedía. Ahora la imagen es la que se
  comprime (`flex-1` + `min-h-0`), la descripción va con `line-clamp-3` y el
  pie queda anclado con `mt-auto`.
- **Títulos cortados.** Con `line-height: 0.86` la caja de línea es más baja
  que los glifos, así que las máscaras de SplitText comían las tildes de las
  mayúsculas (NÚMEROS) y las colas de la "y". Se agranda la caja con padding
  y se descuenta con margen negativo en la máscara.
- **Hero poco legible.** El párrafo y la barra inferior usaban
  `--page-muted` (56%), que funciona sobre fondo plano pero no compitiendo
  con una foto. Subidos a 88% / 65%, foto de fondo más apagada y gradiente
  más sólido. Se agrega `.btn--strong` para botones sobre imagen.
- **Titulares gigantes comiendo el hero.** `h-xl` bajó de 210px a 168px:
  tres líneas más copy más barra no entraban en 100svh a 900px de alto.

## Sugerencias de siguiente iteración

- Las páginas interiores recibieron una migración de tokens y tipografía,
  pero conservan su estructura vieja (`EditorialRow`, `Fader`). Funcionan y
  son coherentes, pero no tienen el nivel de la home.
- Las fotos de `public/images/` pesan 1.3–1.7 MB cada una. Next las optimiza
  al servir, pero conviene bajarlas en origen.
