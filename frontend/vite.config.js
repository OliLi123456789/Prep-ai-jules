import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend server address
        changeOrigin: true,
        // secure: false, // Uncomment if backend is not HTTPS and you encounter issues
        // rewrite: (path) => path.replace(/^\/api/, '') // If your backend doesn't expect /api prefix
      }
    }
  }
})
