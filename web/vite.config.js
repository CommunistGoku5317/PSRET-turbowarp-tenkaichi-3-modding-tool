import { defineConfig } from 'vite'

const repositoryBase = '/PSRET-turbowarp-tenkaichi-3-modding-tool/'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? repositoryBase : './',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0'
  }
})
