import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 80,
    strictPort: true,
    // Disable host check for Docker environment
    // This is safe because we're behind nginx proxy
    hmr: {
      clientPort: 80,
    },
    // Allow requests from all origins in Docker
    cors: true,
    // Important: Don't check Host header in Docker environment
    // Vite will accept requests from any host
  },
  preview: {
    host: '0.0.0.0',
    port: 80,
    strictPort: true,
    cors: true,
  }
})
