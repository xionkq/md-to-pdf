import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/md-to-pdf/' : '/',
  // TODO: remove this
  server: {
    proxy: {
      '/proxy': {
        target: 'https://markdown.com.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy/, ''),
      },
    },
  },
})
