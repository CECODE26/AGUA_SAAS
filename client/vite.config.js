import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    // changeOrigin: false deja pasar el Host original (como nginx en producción):
    // el servidor reconoce la distribuidora por el subdominio, p. ej. norte.localhost:5173
    proxy: {
      '/api':     { target: 'http://localhost:3001', changeOrigin: false },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: false },
    }
  }
})
