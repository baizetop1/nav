import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { navigationPublicAssets } from './scripts/navigation-public-assets.mjs'

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), navigationPublicAssets()],
  // Keep local game development available, but publish it independently.
  publicDir: command === 'build' ? false : 'public',
  server: {
    // APK packaging and browser reports are outputs, not live application sources.
    watch: { ignored: ['**/android/.build/**', '**/artifacts/**'] },
  },
  base: '/nav/', // 强制使用绝对路径，这通常在GitHub Pages上最稳妥
  build: {
    target: 'es2015',
    outDir: 'dist',
  }
}))
