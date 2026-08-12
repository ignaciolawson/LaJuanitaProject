import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
