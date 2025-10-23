import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 80,
    // Allow requests from all hosts in Docker environment
    // This is safe because we're behind nginx proxy
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 80,
    strictPort: true,
  }
})
