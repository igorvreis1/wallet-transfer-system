import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // aceita conexões de fora do container
    port: 5173,
    strictPort: true,
    watch: {
      usePolling: true, // necessário para detectar alterações em arquivos vindos do Windows
    },
  },
})
