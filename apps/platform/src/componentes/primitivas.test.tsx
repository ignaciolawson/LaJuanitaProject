import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { Boton } from './Boton'
import { CabeceraDePagina } from './CabeceraDePagina'
import { EstadoVacio } from './EstadoVacio'
import { Etiqueta } from './Etiqueta'
import { AvisoSoloLectura } from './SoloLectura'
import {
  CASILLA_CON_TEXTO,
  CASILLA_EN_LINEA,
  CONTROL_DE_FILTRO,
  CONTROL_DE_FORMULARIO,
} from './controles'
import { DeslizableAlCostado } from './DeslizableAlCostado'
import { Celda, Fila, FilaVacia, Tabla } from './Tabla'

/**
 * Las primitivas de la pasada de rediseño (0.3).
 *
 * Lo que se prueba acá no es que dibujen: es **lo que cada una vino a
 * impedir**. Las cuatro tienen la misma forma de fallar —seguir funcionando
 * mientras dejan de decir lo que tenían que decir— y ninguna tiraría error al
 * romperse.
 */

function usuario(rol: UsuarioActual['rol']): UsuarioActual {
  return {
    id: 1,
    nombre: 'Prueba',
    apellido: 'Prueba',
    email: 'prueba@lajuanita.local',
    telefono: null,
    rol,
    fotoPerfil: null,
    esAlumno: false,
    esProfesor: false,
    debeCambiarPassword: false,
  }
}

function montarComo(rol: UsuarioActual['rol'], nodo: React.ReactNode) {
  const contexto: ContextoAuth = {
    sesion: { estado: 'autenticado', usuario: usuario(rol) },
    iniciarSesion: async () => {},
    registrarse: async () => {},
    cerrarSesion: () => {},
    refrescarUsuario: async () => {},
  }
  return render(<AuthContext value={contexto}>{nodo}</AuthContext>)
}

describe('Tabla', () => {
  /**
   * **Una tabla ancha tiene que hacer scroll adentro suyo.** Sin el
   * `overflow-x-auto`, el scroll horizontal se va al body y rompe la pantalla
   * entera, no sólo la tabla — y se descubre recién en la pantalla con más
   * columnas.
   */
  it('la tabla scrollea adentro suyo y no arrastra a la página', () => {
    const { container } = render(
      <Tabla columnas={['Quién', 'Debe']}>
        <tr>
          <Celda>Sofía</Celda>
          <Celda numerica>$ 45.000</Celda>
        </tr>
      </Tabla>,
    )

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull()
  })

  /**
   * **Una columna de plata alineada a la izquierda no se puede comparar con
   * la fila de abajo**, que es para lo único que se mira una columna de plata.
   * `tabular-nums` y la alineación van juntas siempre.
   */
  it('una celda numérica alinea a la derecha y usa cifras de ancho fijo', () => {
    render(
      <Tabla columnas={[{ etiqueta: 'Debe', alineacion: 'derecha' }]}>
        <tr>
          <Celda numerica>$ 45.000</Celda>
        </tr>
      </Tabla>,
    )

    const celda = screen.getByText('$ 45.000')
    expect(celda.className).toContain('text-right')
    expect(celda.className).toContain('t-cifra')
    expect(screen.getByRole('columnheader', { name: 'Debe' }).className).toContain('text-right')
  })

  /**
   * **Una tabla vacía conserva sus encabezados.** Sin ellos no se distingue
   * "no hay filas" de "filtré de más" ni de "no cargó".
   */
  it('la fila de vacío no se lleva puestos los encabezados', () => {
    render(
      <Tabla columnas={['Quién', 'Debe']}>
        <FilaVacia columnas={2}>Nadie debe nada.</FilaVacia>
      </Tabla>,
    )

    expect(screen.getByRole('columnheader', { name: 'Quién' })).toBeDefined()
    expect(screen.getByText('Nadie debe nada.')).toBeDefined()
  })

  /**
   * **En el teléfono la tabla es una pila de tarjetas, y cada celda dice su
   * encabezado** (P107, §26 · Etapa 1). Apilada sin rótulo, una fila es una lista
   * de valores sueltos —"Grupo 86 / $470 / TRANSFERENCIA"— donde el tercero no se
   * sabe qué es.
   *
   * ⚠️ jsdom no aplica media queries, así que esto **no prueba que se vea bien**:
   * prueba que el rótulo esté, que salga de `columnas` —una definición, no
   * noventa— y que en escritorio se oculte en vez de duplicar al `<th>`.
   */
  it('cada celda lleva el encabezado de su columna, sacado de columnas', () => {
    render(
      <Tabla columnas={['Quién', 'Debe']}>
        <Fila>
          <Celda>Sofía</Celda>
          <Celda numerica>$ 45.000</Celda>
        </Fila>
      </Tabla>,
    )

    const celda = screen.getByText('Sofía').closest('td')!
    const rotulo = within(celda).getByText('Quién')
    expect(rotulo).toBeDefined()
    // Se oculta en escritorio: ahí el que nombra la columna es el `<th>`, y dos
    // veces el mismo texto es ruido para quien lee con lector de pantalla.
    expect(rotulo.className).toContain('lg:hidden')

    const plata = screen.getByText('$ 45.000').closest('td')!
    expect(within(plata).getByText('Debe')).toBeDefined()
  })

  /**
   * ⚠️ **Si las celdas no son tantas como las columnas, no se rotula ninguna.**
   * Las etiquetas van por posición, así que una celda de menos las corre y la
   * tarjeta pasa a decir *"Debe: Sofía"* con total aplomo, sin que nada falle.
   * **Una etiqueta equivocada es peor que ninguna** — el mismo criterio por el
   * que un contador que no llegó no se dibuja como cero.
   */
  it('con menos celdas que columnas no rotula nada, en vez de rotular mal', () => {
    render(
      <Tabla columnas={['Quién', 'Debe', 'Desde']}>
        <Fila>
          <Celda>Sofía</Celda>
          <Celda numerica>$ 45.000</Celda>
        </Fila>
      </Tabla>,
    )

    const celda = screen.getByText('Sofía').closest('td')!
    expect(within(celda).queryByText('Quién')).toBeNull()
    // Y sobre todo: no dice "Debe" arriba del nombre.
    expect(within(celda).queryByText('Debe')).toBeNull()
  })

  /**
   * La columna sin encabezado —la de los botones— no lleva rótulo: *"Acciones:
   * [Anular]"* no le dice nada a nadie, y además ocuparía media tarjeta.
   */
  it('la columna sin encabezado no inventa un rótulo', () => {
    render(
      <Tabla columnas={['Quién', '']}>
        <Fila>
          <Celda>Sofía</Celda>
          <Celda>
            <button type="button">Anular</button>
          </Celda>
        </Fila>
      </Tabla>,
    )

    const acciones = screen.getByRole('button', { name: 'Anular' }).closest('td')!
    expect(acciones.className).toContain('max-lg:block')
    expect(acciones.className).not.toContain('max-lg:flex')
  })
})

describe('el área tocable (P108, §26 · Etapa 2)', () => {
  /**
   * **Con el dedo hace falta un blanco de 44px, y ninguno de los controles
   * llegaba.** Medido antes de tocar nada: `normal` daba 40px, `chico` 28 y
   * **`enlace` unos 16** — y `enlace` es *Cobrar*, *Editar*, *Anular*, la acción
   * de casi toda fila del sistema. Con 16px no se erra a veces: se erra.
   *
   * ⚠️ jsdom no mide cajas, así que esto **no comprueba los 44px**: comprueba
   * que los tres pidan la altura y que **desde `lg` la devuelvan**, que es la
   * mitad que se puede deshacer sin que nada falle. Lo otro lo mide un dedo.
   */
  it('las tres variantes piden 44px con el dedo y vuelven a lo suyo desde lg', () => {
    render(
      <div>
        <Boton>Guardar</Boton>
        <Boton variante="secundario">Cancelar</Boton>
        <Boton variante="enlace">Cobrar</Boton>
      </div>,
    )

    for (const nombre of ['Guardar', 'Cancelar', 'Cobrar']) {
      const clases = screen.getByRole('button', { name: nombre }).className
      expect(clases).toContain('min-h-11')
      // Sin esto, el botón de escritorio crecería 4px en las 36 pantallas.
      expect(clases).toContain('lg:min-h-0')
    }
  })

  /**
   * El mismo piso para lo que se escribe. El de filtro va apretado a propósito
   * en escritorio —son tres o cuatro en una fila— y esa es justamente la razón
   * de que la altura sea condicional y no fija.
   */
  it('los campos también, y el de filtro sigue apretado en escritorio', () => {
    expect(CONTROL_DE_FORMULARIO).toContain('min-h-11')
    expect(CONTROL_DE_FORMULARIO).toContain('lg:min-h-0')
    expect(CONTROL_DE_FILTRO).toContain('min-h-11')
    expect(CONTROL_DE_FILTRO).toContain('py-1.5')
  })

  /**
   * La casilla, que es lo que la Etapa 2 dejó anotado y la 3 cierra.
   *
   * ⚠️ **La altura es del `<label>` y no del cuadradito**, y esa es la mitad
   * que se deshace sin que nada falle: agrandar el `<input>` se ve, sacarle la
   * altura a la etiqueta no se ve — la casilla sigue andando, sólo que de vuelta
   * con una franja de 20px para apuntarle con el dedo.
   */
  it('la casilla pide los 44px en su etiqueta, en las dos alineaciones', () => {
    for (const casilla of [CASILLA_EN_LINEA, CASILLA_CON_TEXTO]) {
      expect(casilla).toContain('min-h-11')
      expect(casilla).toContain('lg:min-h-0')
    }

    // Y no son intercambiables: la de varios renglones tiene que dejar el
    // cuadradito arriba, con la primera línea.
    expect(CASILLA_EN_LINEA).toContain('items-center')
    expect(CASILLA_CON_TEXTO).toContain('items-start')
  })
})

describe('DeslizableAlCostado (§26 · Etapa 3)', () => {
  /**
   * **Lo que se prueba acá es que la pantalla diga que hay más para el costado.**
   * Los dos deslizables que quedan —la grilla semanal y la de ocupación— ya
   * scrolleaban bien antes de esto: lo que no hacían era avisarlo, y un scroll
   * anidado sin barra visible dentro de una página que ya scrollea en vertical
   * se lee como *"la pantalla está cortada"*.
   *
   * ⚠️ jsdom no aplica media queries ni mide cajas, así que esto **no comprueba
   * que la aclaración se oculte** en escritorio ni que el contenido desborde en
   * un teléfono: comprueba que la aclaración exista, que diga qué hay del otro
   * lado y que pida ocultarse en el breakpoint de ESE deslizable. Lo demás lo
   * mide un dispositivo.
   */
  it('avisa que se desliza y dice qué hay del otro lado', () => {
    render(
      <DeslizableAlCostado hasta="lg" que="la semana entera">
        <div>la grilla</div>
      </DeslizableAlCostado>,
    )

    expect(screen.getByText(/Deslizá al costado para ver la semana entera/)).toBeTruthy()
  })

  /**
   * ⚠️ **Cada deslizable desborda a un ancho distinto, y una aclaración que
   * aparece donde no hay nada que arrastrar es tan mala como la que falta.** La
   * grilla semanal pide 768px y la de ocupación 512: con un solo breakpoint,
   * una de las dos miente. Es la misma familia de error que el rótulo de una
   * tarjeta corrido un lugar — nada falla y la pantalla dice algo que no es.
   */
  it('cada uno se oculta en SU breakpoint, no en uno compartido', () => {
    render(
      <DeslizableAlCostado hasta="lg" que="la semana entera">
        <div />
      </DeslizableAlCostado>,
    )
    expect(screen.getByText(/la semana entera/).className).toContain('lg:hidden')

    render(
      <DeslizableAlCostado hasta="sm" que="el día entero">
        <div />
      </DeslizableAlCostado>,
    )
    const ocupacion = screen.getByText(/el día entero/).className
    expect(ocupacion).toContain('sm:hidden')
    // Y no el del otro: un `lg:hidden` acá dejaría el cartel puesto de 640 a
    // 1024, donde la grilla de ocupación ya entra entera.
    expect(ocupacion).not.toContain('lg:hidden')
  })

  /**
   * ⚠️ **Una región que scrollea tiene que poder recibir el foco**, o con el
   * teclado no hay forma de llegar a la mitad derecha de la semana (WCAG 2.1.1).
   * Es la misma razón por la que el hueco del calendario es un `<button>` y no
   * un `onClick` sobre la celda.
   */
  it('la región que scrollea se puede alcanzar con el teclado y dice qué es', () => {
    render(
      <DeslizableAlCostado hasta="lg" que="la semana entera">
        <div>la grilla</div>
      </DeslizableAlCostado>,
    )

    const region = screen.getByRole('region', { name: /Deslizá al costado/ })
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(region.className).toContain('overflow-x-auto')
  })
})

describe('EstadoVacio', () => {
  /**
   * **El texto lo pone la pantalla y no hay default.** Un "No hay datos"
   * genérico es lo que este componente viene a impedir: un profesor sin
   * alumnos y una caja sin movimientos no piden lo mismo.
   */
  it('dice lo que la pantalla le pasa, y puede sugerir qué hacer', () => {
    render(
      <EstadoVacio titulo="Todavía no hay alumnos cargados.">
        Cargá el primero desde “Nuevo alumno”.
      </EstadoVacio>,
    )

    expect(screen.getByText('Todavía no hay alumnos cargados.')).toBeDefined()
    expect(screen.getByText(/Cargá el primero/)).toBeDefined()
  })

  /** El abanico es decorativo: no lo tiene que leer un lector de pantalla. */
  it('la marca no le habla al lector de pantalla', () => {
    const { container } = render(<EstadoVacio titulo="Sin movimientos." />)

    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('Etiqueta', () => {
  /**
   * **El caso que sostiene la decisión de diseño.** Si todo estado tuviera su
   * color, el rojo del vencido dejaría de saltar — que es lo único para lo
   * que existe. Un estado normal va sin color, igual que `Semaforo` pinta "va
   * bien" con tinta común y no con verde.
   */
  it('un estado normal no usa el rojo y uno que pide atención sí', () => {
    render(
      <>
        <Etiqueta>Activa</Etiqueta>
        <Etiqueta tono="atencion">Vencido</Etiqueta>
      </>,
    )

    expect(screen.getByText('Activa').className).not.toContain('acento')
    expect(screen.getByText('Vencido').className).toContain('text-acento')
  })

  it('lo retirado de circulación se ve apagado, no rojo', () => {
    render(<Etiqueta tono="apagada">Anulado</Etiqueta>)

    const etiqueta = screen.getByText('Anulado')
    expect(etiqueta.className).toContain('text-apagado')
    expect(etiqueta.className).not.toContain('acento')
  })
})

describe('CabeceraDePagina', () => {
  /**
   * **La aclaración es parte del contrato de la pantalla.** Es donde el
   * tablero dice "al día de hoy, no del período". Si dejara de dibujarse,
   * nada falla y la pantalla pasa a mentir sobre qué está mostrando.
   */
  it('la aclaración se dibuja junto al título', () => {
    render(
      <CabeceraDePagina titulo="Cobros pendientes" aclaracion="Toda la deuda viva, no solo la del período" />,
    )

    expect(screen.getByRole('heading', { name: 'Cobros pendientes' })).toBeDefined()
    expect(screen.getByText('Toda la deuda viva, no solo la del período')).toBeDefined()
  })

  it('sin acciones no deja un hueco de botones', () => {
    render(<CabeceraDePagina titulo="Caja" />)

    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('AvisoSoloLectura', () => {
  /**
   * **El aviso es la mitad que le faltaba a `puedeOperar`.** Ese predicado
   * nació porque un socio completaba un formulario y recibía "No tenés
   * permiso"; sin este aviso, la pantalla cambia esa mentira por un silencio
   * — DIRECTIVO no encuentra los botones y no hay nada que le diga por qué.
   */
  it('un DIRECTIVO ve por qué no tiene botones', () => {
    montarComo('DIRECTIVO', <AvisoSoloLectura />)

    expect(screen.getByText(/solo lectura/)).toBeDefined()
  })

  it.each(['ADMIN', 'STAFF'] as const)('a un %s no le aparece: sí puede escribir', (rol) => {
    montarComo(rol, <AvisoSoloLectura />)

    expect(screen.queryByText(/solo lectura/)).toBeNull()
  })
})

describe('Boton (§12 · A3)', () => {
  it('⚠️ la acción principal se invierte con el tema en vez de ser tinta fija', () => {
    // Era `bg-ink text-bone` fijo. En oscuro eso es tinta sobre una tarjeta
    // #17171a: **1,11:1**. El botón principal de cada pantalla no tenía forma
    // —se leía su texto flotando en el aire—, y es la mitad de lo que Ignacio
    // describió como *"botones que no se notan bien"*.
    //
    // Se afirma sobre los tokens y no sobre un color porque el color es
    // justamente lo que depende del tema: lo que este caso cuida es que la
    // decisión sea un token y no una tinta.
    render(<Boton>Guardar</Boton>)

    const clases = screen.getByRole('button', { name: 'Guardar' }).className.split(' ')
    expect(clases).toContain('bg-accion')
    expect(clases).toContain('text-accion-texto')
    expect(clases).not.toContain('bg-ink')
  })

  it('el borde del secundario es un control, no una separación', () => {
    // El borde es toda la forma de este botón. `--linea` mide 1,3:1 y separa
    // superficies; un control pide 3:1.
    render(<Boton variante="secundario">Cancelar</Boton>)

    const clases = screen.getByRole('button', { name: 'Cancelar' }).className.split(' ')
    expect(clases).toContain('border-linea-control')
    expect(clases).not.toContain('border-linea')
  })
})
