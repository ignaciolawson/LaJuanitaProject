import { configure } from '@testing-library/dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Cuánto espera un `findBy*` antes de rendirse. **El default es 1000 ms y no
 * alcanza**, y eso es lo que hacía flaky a la suite (`mejoras.md` §9.6).
 *
 * Diez pantallas de listado cargan con `setTimeout(cargar, 250)` para no pedirle
 * a la API en cada tecla. Entonces cada caso que monta un listado espera 250 ms
 * de debounce + el render + la promesa mockeada, contra un techo de 1000. **Con
 * la máquina descargada sobra; con la máquina ocupada, no.** Medido: repetir la
 * suite ocho veces en una máquina libre da 8 verdes en 59–91 s; con `mvn test`
 * corriendo encima y los workers al doble, cuatro de cinco corridas fallan — y
 * la falla típica es `EgresosPagina` no encontrando su botón "Anular" a los
 * 1272 ms.
 *
 * **Subir el techo no debilita ningún caso**: el test sigue preguntando por el
 * mismo texto visible, que es lo que prueba una decisión de producto. Lo que
 * `docs/sistema-gestion-plan.md` §6f prohíbe es lo otro — esquivar con
 * `data-testid` o aflojar la aserción — y eso no pasa acá.
 *
 * ⚠️ **Tiene que quedar bien por debajo del `testTimeout`** (20 s, en
 * `vite.config.ts`). Si lo igualara, un elemento que no aparece nunca se comería
 * el timeout del caso y el reporte diría *"Test timed out"* en vez de *"Unable to
 * find role=button name=Anular"* con el DOM impreso al lado, que es la mitad del
 * valor de estos tests cuando el rediseño empiece a romperlos a propósito.
 */
configure({ asyncUtilTimeout: 5000 })

/**
 * Preparación común de los tests del front.
 *
 * Con `globals: false` el Testing Library no limpia solo entre casos, y dos
 * tests que renderizan la misma pantalla se pisan: el segundo encuentra los
 * nodos que dejó el primero y las consultas por texto empiezan a fallar por
 * "found multiple elements".
 */
afterEach(() => {
  cleanup()
  localStorage.clear()
})
