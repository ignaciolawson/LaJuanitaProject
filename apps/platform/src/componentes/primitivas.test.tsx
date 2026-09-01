import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { UsuarioActual } from '../api/tipos'
import { AuthContext, type ContextoAuth } from '../auth/contexto'
import { Boton } from './Boton'
import { CabeceraDePagina } from './CabeceraDePagina'
import { EstadoVacio } from './EstadoVacio'
import { Etiqueta } from './Etiqueta'
import { AvisoSoloLectura } from './SoloLectura'
import { Celda, FilaVacia, Tabla } from './Tabla'

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
