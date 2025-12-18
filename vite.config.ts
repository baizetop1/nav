import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，适配任意仓库名称(nav, nav-gh-pages等)
  build: {
    target: 'es2015', // 降级构建目标，兼容旧版浏览器 (解决 Unexpected token ? 报错)
    outDir: 'dist',
  }
})
