import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vitest/config'

/**
 * Content-Security-Policy del panel, inyectada en el HTML del build (SEC-07).
 *
 * Va como `<meta>` y no como cabecera porque hoy nadie sirve esto: el panel es
 * un montón de archivos estáticos y el reverse proxy que los va a servir se
 * decide con el hosting, en octubre. La meta cubre lo que se puede cubrir sin
 * servidor; **`frame-ancestors` y HSTS se ignoran en `<meta>` y tienen que ir
 * en el proxy** — está anotado en la sección de deploy de `docs/operacion.md`,
 * que es donde se va a escribir esa configuración.
 *
 * Solo en `build`. En desarrollo Vite inyecta scripts inline (el preámbulo de
 * React Refresh) y con `script-src 'self'` el panel no arranca: una CSP fija en
 * `index.html` rompería `npm run dev` sin decir por qué.
 *
 * `script-src` NO lleva `'unsafe-inline'` — el build de Vite deja los scripts
 * en archivos aparte, así que acá sí se puede lo que en la landing no. Los
 * estilos sí: son los `style={{…}}` de React.
 */
function cspEnElBuild(): Plugin {
  const politica = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    // El panel habla con su propia API a través del proxy, o sea mismo origen.
    "connect-src 'self'",
  ].join('; ')

  return {
    name: 'lajuanita-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        // Después del charset y no antes: la declaración de codificación tiene
        // que entrar en los primeros 1024 bytes del documento, y la política
        // ocupa 250.
        html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${politica}" />`,
        ),
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), cspEnElBuild()],
  server: {
    proxy: {
      // El front pide siempre rutas relativas (`/api/...`) y en desarrollo
      // este proxy las manda al Spring Boot. En producción hace lo mismo el
      // reverse proxy del servidor.
      //
      // Consecuencia buscada: el navegador ve un único origen y CORS no entra
      // en juego. El bean de CORS del backend queda igual, como red de
      // seguridad para el día que el front y la API vivan en dominios
      // distintos -- pero hoy, en desarrollo, NO se ejerce. Si algún día se
      // separan los dominios, hay que probarlo antes de confiar en él.
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    // Los tests corren en jsdom porque casi todo lo que vale la pena probar acá
    // toca el DOM o `localStorage`. Ninguno necesita backend: los que hablan con
    // la API mockean `fetch`.
    environment: 'jsdom',
    // `cleanup()` del Testing Library después de cada caso, sin escribirlo en
    // cada archivo. Sin esto, dos tests que renderizan lo mismo se pisan y el
    // segundo encuentra los nodos del primero.
    globals: false,
    restoreMocks: true,
    /**
     * El default son 5 s y **se quedaban cortos bajo carga** (`mejoras.md` §9.6):
     * un caso que completa un formulario con `userEvent` tarda más de lo que
     * parece cuando la máquina está ocupada, y la suite fallaba 1 de cada 10
     * corridas sin que nadie pudiera capturar cuál. Con `mvn test` corriendo
     * encima, `SubirMaterialPagina` e `InscripcionesPagina` cortaban a los 5000 ms
     * exactos.
     *
     * No esconde nada: un test que de verdad se cuelga sigue fallando, solo que
     * 15 s más tarde. Lo que se evita es leer en rojo algo que anda — que es lo
     * que hace inservible una suite justo cuando el rediseño empiece a romper
     * casos a propósito y haya que distinguir cuáles.
     */
    testTimeout: 20_000,
    setupFiles: ['./src/pruebas/preparar.ts'],
  },
})
