import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080'
const WS_BACKEND_URL = BACKEND_URL.replace(/^http/, 'ws')

export default defineConfig({
  plugins: [react()],
  define: {
    __BACKEND_URL__: JSON.stringify(BACKEND_URL),
    __WS_BACKEND_URL__: JSON.stringify(WS_BACKEND_URL),
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
