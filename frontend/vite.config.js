import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/builder/',
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3380',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../public/builder',
    emptyOutDir: true,
  },
})
