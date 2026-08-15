import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

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
