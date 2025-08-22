import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
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
