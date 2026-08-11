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
/blog                 índice de notas
/blog/[slug]          nota (SSG, un slug por entrada de data/posts.ts)
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
lib/gsap.ts           plugins, eases propias (juanita / swipe / snap),
                      prefersReduced() / isTouch() / isLite()
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
contenido.

**El tema va por bloques, no por sección.** La versión original alternaba
`ink`/`bone` sección por sección y el documento entero se daba vuelta seis
veces en la home, cinco en `/servicios` y cuatro en `/nosotros`: leído de
corrido eso no es un cambio de luz, es un estrobo. Hoy cada página tiene
**dos o tres inversiones**, agrupadas en bloques largos:

| Página | Secuencia |
| --- | --- |
| `/` | ink ×4 → bone ×3 (Números→Servicios) → ink ×5 |
| `/servicios` | ink → bone ×4 (los servicios) → ink |
| `/programas/[slug]` | ink ×2 → bone ×3 → ink ×2 |
| `/blog` | ink ×2 → bone (la grilla) → ink |
| `/blog/[slug]` | ink ×2 → bone (el cuerpo) → ink ×2 |
| `/nosotros` | ink → bone ×2 → ink ×2 |

**La tinta domina, y el bloque de papel va al medio.** Dos es el piso de
inversiones: para volver a tinta hacen falta una ida y una vuelta. Si hay
que bajar más el efecto, se acorta el bloque de papel — no se agregan
cortes.

Ojo con `ProgramsRail`: está anclada a pantalla completa con scroll
horizontal, así que ocupa mucho más recorrido del que sugiere ser "una
sección" en esta tabla. Mandarla a `bone` sola alcanza para dar vuelta la
proporción de blanco/negro de toda la home.

Al agregar una sección, no elijas su tema aislado: mirá en qué bloque cae y
seguilo. Sumar un `data-theme` que parte un bloque al medio devuelve el
estrobo aunque la sección sola se vea bien. La variedad dentro de un bloque
se resuelve con maquetación (el zig-zag de `/servicios`), no invirtiendo.

Toda página nueva necesita al menos un `data-theme`, o el tema queda colgado
del último color de la página anterior.

---

## Móvil y tablet

Repaso completo el 2026-08-10, después de que el cliente abriera la landing
desde el teléfono. Lo que sigue es lo que cambió y por qué; casi nada es
cosmético.

### La regla que ordena todo esto

**El corte de rendimiento va por `(hover: none) and (pointer: coarse)`, no
por ancho.** Un iPad Pro en horizontal mide 1366px y es táctil; una notebook
de 1280px no lo es. Lo que decide si un efecto conviene es si hay un dedo o
un mouse — y cuánta GPU hay atrás—, no cuántos píxeles entran. Los helpers
están en `lib/gsap.ts`: `isTouch()` y `isLite()` (táctil **o** menos
movimiento pedido). Los cortes de **maquetación** sí van por breakpoint.

### Qué se apaga en táctil

| Qué | Dónde | Por qué |
| --- | --- | --- |
| ScrollSmoother entero | `motion/SmoothScroll` | Ver abajo — es el cambio más grande |
| `ScrollFx` (aberración cromática) | `motion/ScrollFx` | Ticker permanente + `text-shadow` sobre texto de 48px |
| Medidor VU | `sections/Numbers` | 28 `transform` por frame compitiendo con el scroll |
| Abanico de profesores | `sections/Teachers` | Rompía la maqueta, ver abajo |
| Riel horizontal de programas | `sections/ProgramsRail` | Secuestrar el scroll con el dedo |
| `.scan` (scanlines) | `globals.css` | Moaré contra la grilla del panel |
| `mix-blend-mode` del grano | `globals.css` | Blend a pantalla completa en cada frame |
| Interacción del mapa | `app/contacto` | Se robaba el gesto de scroll |
| Intro del preloader | `motion/Preloader` | Corre a `timeScale(1.45)`, no se apaga |

**ScrollSmoother no se crea en táctil.** Ya venía con `smoothTouch: 0`, o sea
que en un teléfono no agregaba nada de inercia, pero seguía costando todo:
`normalizeScroll: true` interceptaba el touch y pasaba a mover la página
desde JavaScript (el scroll nativo corre en el hilo del compositor y sigue al
dedo aunque el JS esté ocupado; movido desde JS, cada trabajo de más es un
tirón), y el wrapper en `position: fixed` con el contenido transformado
impedía que se colapse la barra de direcciones. Lo único que se pierde es el
parallax por `data-speed`, que son dos elementos decorativos del Manifiesto.

**`ScrollTrigger.config({ ignoreMobileResize: true })`** en `lib/gsap.ts`. Sin
eso, cada vez que la barra de direcciones aparece o desaparece cambia el alto
del viewport, ScrollTrigger lo toma como un resize y recalcula todos los
triggers **en medio del gesto**. Es la causa número uno de que un sitio con
scroll animado se sienta roto en el celular y perfecto en el escritorio.

### Bugs de maquetación que estaban

1. **El botón "Iniciar sesión" del navbar se veía en todos los teléfonos**
   aunque la clase dijera `hidden`. Es el problema de capas descrito en la
   trampa 17 — el más caro de los que había, porque afectaba a cualquier
   utilidad de Tailwind puesta sobre un `.btn`.
2. **Las fichas de profesores salían torcidas y recortadas.** El abanico
   corre cada ficha a un costado y la rota; eso se lee como abanico sólo con
   las tres en fila (`lg:flex-nowrap`). Apiladas en columna quedaban tres
   tarjetas chuecas, y la desplazada se comía contra el `overflow-hidden` de
   la sección. Hoy abajo de 1024px entran derechas y de a una.
3. **El mapa de `/contacto` se comía el scroll.** Un iframe de Google Maps se
   queda con el arrastre: quien scrolleaba con el dedo sobre esa franja de
   320px movía el mapa, no la página. En táctil el mapa quedó sin interacción
   (sigue siendo un plano legible) más un botón que abre la app de mapas.
4. **Las botoneras de los formularios en tres columnas.** Con etiquetas como
   "Sí, ya toco/produzco" en 390px de pantalla quedaban ~80px por opción y el
   texto se partía en cinco renglones. Ahora la grilla tiene columnas propias
   para móvil (`ChoiceGrid` + `.choice-grid`), y las etiquetas largas van a
   una sola columna.
5. **La pila del sello se anclaba desde 768px.** Un teléfono acostado entra
   por ancho pero tiene 390px de alto: la ficha se anclaba y le quedaba la
   mitad afuera. Hoy pide `(min-width: 1024px) and (min-height: 700px)`.
6. **La cortina del menú móvil** tenía `justify-center` y `overflow-y-auto`
   juntos — ver trampa 17 bis en la lista de trampas.

### Táctil: legibilidad y toque

- **`.t-mono` y `.label` arrancan en 11px, no en 10px.** El tope sigue en
  12px, así que en escritorio no cambia nada. A 10px, en mayúscula y con
  0.16em de interletrado, sobre un teléfono al sol, la mono dejaba de leerse
  — y ahí van las fechas, los precios y las etiquetas de los formularios.
- **`min-height: 46px` en `.btn` y `.choice-option` con `(pointer: coarse)`.**
  El botón medía ~34px, abajo del mínimo de ~44px que necesita un dedo.
- **Todo `:hover` escrito a mano va dentro de `@media (hover: hover)`.** En un
  teléfono no hay hover pero el navegador emula uno pegajoso: el del último
  elemento tocado. Sin el corte, tocar un botón lo dejaba relleno de rojo para
  siempre. (Las variantes `hover:` de Tailwind ya vienen envueltas de fábrica;
  esto es sólo para el CSS propio.)
- **`:active` en `.btn` y `.duotone`**, porque sin hover no había ninguna
  respuesta al toque — y la reacción natural de quien no ve respuesta es
  volver a apretar.

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
   **Pero un estado inicial en CSS con transform porcentual tampoco alcanza
   solo**: GSAP no lee el `110%`, lee la matriz ya calculada, la descompone
   en píxeles y la guarda en `y`, dejando `yPercent` en 0. Un tween a
   `yPercent: 0` entonces no mueve nada — el titular del hero se quedó abajo
   de su máscara justamente por eso. Si el CSS declara el estado inicial en
   porcentaje, replicalo con un `gsap.set(el, { yPercent: 110, y: 0 })` antes
   del timeline para que GSAP arranque en las mismas unidades en las que va a
   animar.
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
9. **Scroll horizontal secuestrado sólo en escritorio de verdad.** El riel de
   programas pide `(min-width: 1024px) and (hover: hover)`; abajo es lista
   vertical. El `hover` no es un detalle: con rueda de mouse el gesto es
   indirecto y el desplazamiento lateral se lee como una consecuencia, pero
   con el dedo uno arrastra para ARRIBA y la pantalla se mueve para el
   COSTADO — en una tablet el secuestro es peor que en un teléfono, no mejor.
   Ver también la trampa 19.
10. **Los nombres de variable de `next/font` van por familia, no por rol.**
    `layout.tsx` declara `--font-archivo` / `--font-instrument` /
    `--font-space-mono`, y `globals.css` mapea rol → familia en
    `@theme inline` (`--font-display: var(--font-archivo)`). Si le ponés a
    `next/font` el mismo nombre que el rol, quedan dos declaraciones de
    `--font-display` sobre el mismo `<html>` —la clase de next/font y la que
    Tailwind emite en `:root`— con idéntica especificidad; gana la de
    `:root` por orden, ahí vale `var(--font-display)`, se cicla sola y la
    variable se invalida. **Todo el sitio cae a `system-ui` y el build pasa
    en verde.** Como `system-ui` no tiene eje de ancho, `font-stretch` deja
    de hacer efecto y con eso se va la mitad del diseño. Para verificar que
    están vivas, buscá `font-stretch: 62% 125%` en el CSS compilado.
11. **El preloader tiene que sacar el abanico antes de subir el telón.** Si
    la marca no tiene tween de salida propio, el telón revela la página y el
    abanico queda flotando encima todo el barrido, hasta que el
    `display: none` final lo borra de golpe.
12. **Ningún `href="#algo"` puede saltar de forma nativa.** El wrapper del
    smoother es `position: fixed; overflow: hidden; height: 100%`, así que es
    el ancestro scrolleable más cercano de todo el contenido — y
    `overflow: hidden` no frena el scroll programático con el que el
    navegador "trae el elemento a la vista". El salto corre al wrapper, el
    smoother sigue trasladando el contenido según `window.scrollY` (que no se
    movió) y la página queda desfasada para siempre: se ve corrida y ningún
    ScrollTrigger vuelve a dispararse. `SmoothScroll` intercepta los clicks en
    captura, resuelve el hash al navegar y deja un guard que devuelve el
    wrapper a 0. Vale para las anclas de página (`#programas`), para las de
    otra ruta (`/servicios#reservar`) y para los `href="#"` de placeholder.
13. **Para llevar el scroll a algún lado, tweeneá `smoother.scrollTop`.** No
    `smoother.scrollTo(target, true)`: con `normalizeScroll: true` esa rama
    escribe el scroll nativo directo y el normalizador —que es quien maneja
    la rueda— no se entera. La ventana queda en el destino, el contenido
    congelado donde estaba, y no se destraba hasta el próximo gesto real de
    scroll. Se ve idéntico al bug de arriba.
14. **Las máscaras de línea recortan SÓLO en vertical.** `overflow: hidden`
    recorta los dos ejes, y el titular de `PageHero` va en `max-w-4xl`
    (896px): apenas la tipografía crece, "PRODUCCIÓN" pide 972px y
    "CONOCERNOS" 992px, y la máscara les comía la última letra. `visible` +
    `clip` es el único par que el CSS no fuerza a `auto`, así que es la forma
    de liberar un eje sin crear un contenedor de scroll. SplitText escribe
    `overflow: clip` inline en la máscara, así que ahí hace falta
    `!important`.
15. **`ch` y `em` se miden contra la fuente del elemento que los declara, no
    contra la del texto que se ve.** El `<h1>` del hero tiene el tamaño en los
    `<span>` de adentro (`t-display h-xl`, 165px) y él mismo hereda los 16px
    del body: su `max-w-[16ch]` daba **147px**, encajonaba las tres líneas,
    hacía envolver "De Pilar" y estiraba el titular a 828px de alto,
    empujando el párrafo y los botones abajo del pliegue. Antes de poner una
    medida en `ch`/`em`, fijate en qué elemento estás poniendo el tamaño de
    fuente.
16. **Con `autoSplit`, la animación va DENTRO de `onSplit` y se devuelve.**
    SplitText vuelve a partir el texto solo (resize, carga de fuentes) y tira
    los nodos viejos. Una animación armada afuera queda apuntando a nodos que
    ya no están en el DOM: las líneas nuevas se quedan en su estado natural y
    el revelado no se ve nunca más. Devolviéndola desde `onSplit`, SplitText
    la mata, la rearma sobre los nodos nuevos y le conserva el progreso.
17. **`justify-center` + `overflow-y-auto` en el mismo elemento recorta lo de
    arriba y no deja scrollear hasta ahí.** Cuando el contenido es más alto
    que la caja, `justify-content: center` lo desborda para los dos lados, y
    un contenedor de scroll no llega al desborde superior (el scroll no puede
    ser negativo). La cortina del menú móvil tenía las dos cosas: con nueve
    ítems ya no entra en un teléfono. El centrado va con `m-auto` en un
    wrapper del contenido — el margen automático se colapsa cuando no sobra
    espacio, así que centra si entra y arranca arriba si no.
18. **El CSS propio SIN capa le gana a todas las utilidades de Tailwind.** En
    v4 las utilidades se emiten dentro de `@layer utilities`, y por la regla
    de capas en cascada lo que no está en ninguna capa gana siempre — sin
    importar orden ni especificidad, que acá además empataban (una clase
    contra una clase). `.btn`, escrita suelta, le ganaba a cualquier utilidad
    puesta al lado: el botón de "Iniciar sesión" del navbar declara
    `class="btn hidden sm:inline-flex"` y **se veía en todos los teléfonos**,
    porque el `display: inline-flex` de `.btn` pisaba al `display: none` de
    `.hidden`. Lo mismo pasaba con `position: relative` contra `absolute` y
    con `background` contra cualquier `bg-*`. Por eso el bloque de
    COMPONENTES de `globals.css` (`.btn`, `.link-u`, `.rule`, `.choice-*`)
    vive dentro de `@layer components`. Si agregás una clase de componente,
    va adentro de esa capa. Las utilidades tipográficas (`.t-display`,
    `.h-xl`, `.label`) quedan afuera a propósito: ahí la fuerza extra se
    quiere y no hay utilidad de Tailwind compitiendo por esas propiedades.
19. **La condición del riel de programas está en DOS lugares y tienen que
    decir lo mismo.** El `matchMedia` de `sections/ProgramsRail.tsx` decide si
    el tween horizontal corre; la variante `rail:` de `globals.css`
    (`@custom-variant rail`) decide si la maqueta arma la fila. La maqueta
    pone las tres tarjetas en un `w-max` más ancho que la pantalla y quien las
    trae a la vista es el tween: si el CSS arma la fila y el JS no la anima,
    las tarjetas 2 y 3 quedan fuera del `overflow-hidden` de la sección —
    invisibles y sin forma de llegar. Cualquier cambio en una va en las dos.

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

**Ya no muestran ningún aviso de que no se envían** — se sacó por decisión
explícita del cliente el 2026-08-09. O sea que hoy el formulario contesta
"listo, recibimos tu solicitud" y la solicitud no llega a nadie.

Consecuencia operativa, mientras siga así: **la landing sirve para
mostrarla, no para publicarla de cara al público.** Si se publica antes de
conectar el `onSubmit`, cada persona que complete un formulario queda
esperando una respuesta que no existe. No lo resuelvas volviendo a poner el
aviso (ya se decidió que no va): lo que cierra el agujero es conectar el
envío. Sin backend todavía, la salida más corta es armar un `wa.me`
prellenado con los datos del form.

`/ingresar` es la excepción: ahí quedó un mensaje de derivación a
`/contacto`, porque el botón sin ninguna respuesta era peor y un "contraseña
incorrecta" inventado manda a resetear una cuenta que no existe.

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
| `data/posts.ts` | Las seis notas del blog, enteras. Firmadas con nombres de profesores que no las escribieron — ver abajo |
| `data/releases.ts`, `dates.ts`, `teachers.ts`, `faq.ts` | Placeholder heredado |
| `data/contact.ts` | WhatsApp `5491100000000` es falso. Spotify e Instagram ya son reales |
| `sections/Numbers.tsx` | 200+ alumnos, 12 lanzamientos, "desde 2019" |
| `app/nosotros/page.tsx` | La línea de tiempo (2019 → 2021 → 2023) |

**Sobre `data/gear.ts`:** no hay marcas ni modelos, y es deliberado.
Publicar un modelo concreto es un compromiso de venta — si no está en stock,
alguien llega al local a buscarlo. Cuando exista catálogo real, `/equipos`
es el lugar para una grilla con precios y el formulario pasa a segundo plano.

---

## Blog

Agregado el 2026-08-10, último bloque de contenido de la landing. Es la
sección para que el equipo publique novedades de la escena, notas técnicas
(el formato "Top 5 efectos para tus sets") y anuncios de la casa.

```
data/posts.ts               notas + tipos + helpers (fecha, minutos, relacionadas)
components/blog/PostBody    renderiza el array de bloques
components/blog/PostCard    tarjeta, compartida por índice / relacionadas / home
components/sections/Journal las tres últimas notas, en la home
app/blog/                   índice + detalle
```

**El cuerpo de una nota es un array de bloques tipados, no un string de
markdown.** Es la forma del Portable Text de Sanity a propósito: cuando el
contenido pase al CMS, se reemplaza `data/posts.ts` por un fetch y se mapea
`_type` → `type`; `PostBody` no se toca. Con markdown habría que sumar
parser + sanitización y encima se pierden los bloques que no son texto —
justamente el embed de video, que es el formato que el equipo quiere
publicar.

Los tipos de bloque son `text`, `heading`, `list`, `ranked` (la lista
numerada con título y detalle), `quote`, `image` y `embed`.

**El embed con `id` vacío no renderiza iframe**, muestra una placa que dice
"pendiente de carga". Las notas de ejemplo no tienen videos reales y un
iframe apuntando a un ID inventado se ve como un reproductor de YouTube
diciendo "el video no está disponible": eso parece un sitio roto, no un
sitio sin terminar.

**El destacado del índice es siempre `POSTS[0]`**, o sea la nota más
reciente. No hay flag `featured` que alguien tenga que acordarse de mover.

**Las fechas se formatean con `timeZone: "UTC"`** (`formatPostDate`).
`new Date("2026-08-05")` se parsea como medianoche UTC y formateado en la
zona de Buenos Aires (UTC−3) cae el día anterior: sin eso, toda nota se
publica un día antes de su fecha.

### Antes de publicar

1. **Las seis notas son inventadas y están firmadas por Ghezz, Najles y
   Chapa Castelo.** Publicar consejos técnicos con la firma de alguien que
   no los escribió es peor que tener el blog vacío. O las reescribe el
   equipo, o se borran.
2. **Un blog es un compromiso de publicar.** La última nota de hace ocho
   meses se lee como "esto está abandonado" — y encima la home lo muestra,
   porque `Journal` toma las tres últimas. Si el cliente no va a publicar,
   la sección conviene sacarla, no dejarla quieta.

### Cuando entre el CMS

El punto de decisión es `generateStaticParams` en `app/blog/[slug]/page.tsx`:
hoy los slugs salen del array en build. Con el contenido en Sanity va a
consultar la API y **hace falta revalidación** (ISR o webhook de deploy), o
una nota publicada no aparece hasta el próximo deploy. El resto del sitio
puede seguir siendo estático.

No hay filtro por categoría todavía: con seis notas es un control que nunca
cambia nada. La categoría ya está en el dato; cuando el volumen lo
justifique, el lugar es `/blog/categoria/[slug]`.

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

## Rendimiento

Las decisiones específicas de teléfono y tablet están en
[Móvil y tablet](#móvil-y-tablet). Lo que sigue vale para todos lados —
cosas que ya se pagaron y conviene no volver a introducir:

- **Nada de escribir custom properties sobre `<html>` en cada frame.** Es lo
  más caro que hay: invalida el estilo del documento entero. Era el cuello de
  botella número uno del sitio — medido en la home con la CPU a 1/4, el frame
  medio pasó de **79 ms a 32 ms** sacando dos variables. Reglas que salieron
  de ahí:
  - Escribí la variable **sólo en los elementos que la leen**. `ScrollFx`
    pone `--split` en los `.chromatic` (hoy: el titular del hero), no en
    `<html>`. Antes de agregar una variable animada, fijate quién la
    consume: si es un selector, no va en la raíz.
  - Si nadie la lee desde CSS, no la escribas. `--vel` se reescribía 60 veces
    por segundo y no la usaba ninguna regla. Quien necesite la velocidad la
    toma de `lib/velocity.ts`, que no toca el DOM.
  - Compará contra el último valor escrito y cortá si no cambió (en reposo
    siempre es `0`).
- **`ThemeScroller` sale temprano si la paleta no cambia.** Es el único lugar
  donde sí hace falta escribir sobre `<html>` (el crossfade es del documento
  entero, por diseño). Pero cada sección dispara su transición al entrar, y
  la home tiene diez `data-theme` con sólo dos inversiones reales: sin el
  corte, ocho de esas eran 0.8 s interpolando tinta hacia tinta. Con el corte
  las escrituras por recorrido bajaron de ~1300 a ~110. Los interpoladores se
  arman una vez por transición, no una vez por frame.
- **Los tickers permanentes se apagan fuera de cuadro.** El medidor VU de
  `Numbers` escribe 28 `transform` por frame; corre sólo mientras su sección
  está en pantalla. Mismo criterio que el loop del marquee.
- **Nada de crear tweens por evento de puntero.** `pointermove` puede
  disparar ~1000 veces por segundo. El `Cursor` guarda su estado
  (`idle`/`link`/`label`) y sólo tweenea cuando cambia de verdad.
- **`will-change` fijo sólo donde algo anima siempre** (el track del
  marquee). Sobre los titulares del hero sostenía una capa de compositor con
  texto a 168px rasterizado y encima le sacaba el antialiasing subpíxel.
  GSAP ya promueve mientras dura el tween.
- **Sin `transition` de fondo en `body`**: el `ThemeScroller` ya interpola
  `--page-bg` frame a frame con su propia curva.
- Las fotos están recomprimidas (`public/images`: 11 MB → 2.7 MB, lado largo
  acotado a 2000px, retratos en WebP). Si sumás fotos, pasalas por el mismo
  criterio: subir un JPEG de cámara de 13 megapíxeles tira abajo la mitad de
  esto.
- **No agregues `image/avif` a `formats` en `next.config.ts`.** Ya se probó
  y se revirtió. Comprime ~20% mejor, pero el optimizador codifica cada
  combinación (archivo, ancho) la primera vez que se pide, y codificar AVIF
  es mucho más lento que WebP: en `/nosotros`, que tiene seis fotos lazy, se
  notaba directamente como imágenes que tardan en aparecer.
- **Ningún `deviceSizes` por encima de 1500.** La foto más ancha de
  `public/images` mide 1500px (las de 2000 son verticales: eso es el alto), y
  el optimizador no agranda. Todo breakpoint mayor devuelve el mismo archivo
  pero se codifica y se cachea aparte: el 2048 del default era un encode
  completo de más por cada foto a pantalla completa, con cero ganancia de
  nitidez. Queda 1920 como único escalón por encima del máximo real.
- **La primera visita paga la codificación de cada imagen.** Con la caché
  fría (`.next/cache/images` vacía) la home tarda ~7 s sumando todas las
  fotos, con picos de 1,8 s en una sola. Después queda en ~10-20 ms. En
  producción detrás de un CDN lo paga el primer visitante y listo; en
  `next dev` se paga seguido, así que si estás midiendo "va lento", medí
  contra `npm run build && npm start` antes de sacar conclusiones.
- Las fotos lazy van dentro de `RevealImage`, que pinta una placa neutra
  detrás. Sin eso, entre que la cortina se abre y el archivo baja se ve el
  fondo de la página a través del hueco.
- Si hiciera falta más: `placeholder="blur"` con imports estáticos. Requiere
  mover las fotos fuera de `public/` o convivir con que el bundler emita una
  copia hasheada aparte.

## Falta

- OG image (`opengraph-image.tsx`) y política de privacidad.
- Las páginas interiores (`/sello`, `/profesores`, `/faq`, `/contacto`)
  recibieron migración de tokens y tipografía, pero conservan estructura
  vieja (`EditorialRow`). Son coherentes, no están al nivel de la home.
- Conectar el envío de los formularios (ver arriba: hoy dicen "listo" sin
  mandar nada).
- Sin referencias en el HTML generado: `espacio/entrada-retrato.jpg` (95 KB)
  y `logo/icon.png` + `logo/wordmark.png` (161 KB). Los del logo son los
  originales de marca de los que salió el SVG del abanico — probablemente
  valga conservarlos aunque no se sirvan.
