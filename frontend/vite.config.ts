import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'https://api.stat-vision.xyz',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
})
