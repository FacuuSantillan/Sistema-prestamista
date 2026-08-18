import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Previene que Vite oculte errores de Rust en la consola
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // Le dice a Vite que ignore los cambios en la carpeta de Rust/Tauri
      ignored: ['**/src-tauri/**']
    }
  }
})