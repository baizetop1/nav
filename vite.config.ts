import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/nav/', // 强制使用绝对路径，这通常在GitHub Pages上最稳妥
  build: {
    target: 'es2015',
    outDir: 'dist',
  }
})
