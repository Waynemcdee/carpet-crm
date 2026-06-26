import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5005,
    proxy: {
      '/api': 'http://localhost:5004',
      '/quote': 'http://localhost:5004',
      '/uploads': 'http://localhost:5004'
    }
  }
})
