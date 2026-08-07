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

## Pendiente antes de publicar (contenido, no código)

- `src/data/contact.ts`: el WhatsApp es `5491100000000` y las redes apuntan
  a las home de Instagram / Spotify / YouTube.
- `src/components/sections/Numbers.tsx`: 200+ alumnos, 12 lanzamientos y
  "desde 2019" son placeholders inventados. Confirmalos.
- `src/data/dates.ts`, `releases.ts`, `testimonials.ts`, `faq.ts` y los
  precios de `programs.ts` siguen marcados como placeholder en el repo.
- Falta OG image (`opengraph-image.tsx`) y la política de privacidad, que en
  el sitio actual estaba rota.

## Sugerencias de siguiente iteración

- Las páginas interiores recibieron una migración de tokens y tipografía,
  pero conservan su estructura vieja (`EditorialRow`, `Fader`). Funcionan y
  son coherentes, pero no tienen el nivel de la home.
- Las fotos de `public/images/` pesan 1.3–1.7 MB cada una. Next las optimiza
  al servir, pero conviene bajarlas en origen.
