import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/upload': 'http://localhost:8000',
      '/status': 'http://localhost:8000',
      '/download': 'http://localhost:8000',
      '/download-all': 'http://localhost:8000',
      '/api': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
    },
  },
})
