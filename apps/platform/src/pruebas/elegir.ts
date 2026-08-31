import { screen, waitFor } from '@testing-library/react'

/**
 * Elegir una opción de un `<select>`, esperando a que la opción exista.
 *
 * **`findByLabelText` no alcanza, y esa es toda la razón de que este archivo
 * exista.** Espera a que aparezca el `<select>`, que en estas pantallas se
 * renderiza vacío desde el primer frame y recién se llena cuando vuelve el
 * catálogo. O sea que el elemento está y la opción no, y ahí
 * `userEvent.selectOptions` **no reintenta**: tira `Value "6" not found in
 * options` de una. Ningún techo de tiempo lo arregla, porque no hay ninguna
 * espera que agrandar — es la diferencia con §9.6, que sí era de techos.
 *
 * Con la máquina descargada el catálogo llega antes que el primer clic y no se
 * nota nunca. Bajo carga se cae, y se cae en pantallas distintas cada vez, que
 * es lo que lo hacía parecer un fantasma: se reprodujo con `--maxWorkers=16` en
 * `ReservarPagina`, `SubirMaterialPagina` y `VentasPagina`, y también sobre el
 * árbol sin tocar — no lo trajo el rediseño.
 *
 * Los tres casos que se colgaban 20 s eran el mismo problema con otra cara: al
 * no poder elegir, el formulario nunca se completaba y el caso moría contra el
 * `testTimeout`.
 */
export async function elegir(
  user: { selectOptions: (elemento: HTMLElement, valor: string) => Promise<unknown> },
  etiqueta: string | RegExp,
  valor: string,
) {
  const select = await screen.findByLabelText(etiqueta)

  await waitFor(() => {
    if (!select.querySelector(`option[value="${valor}"]`)) {
      throw new Error(
        `El select "${String(etiqueta)}" todavía no tiene la opción "${valor}". ` +
          'Suele ser el catálogo que no volvió.',
      )
    }
  })

  await user.selectOptions(select, valor)
}
