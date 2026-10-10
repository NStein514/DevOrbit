import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { configFromEnv, createApi } from './server/app.ts'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  return {
    plugins: [
      react(),
      {
        name: 'devorbit-github-api',
        configureServer(server) {
          const api = createApi(configFromEnv(env))
          server.middlewares.use('/api/github', api)
          server.httpServer?.once('close', () => api.close())
        },
        configurePreviewServer(server) {
          const api = createApi(configFromEnv(env))
          server.middlewares.use('/api/github', api)
          server.httpServer?.once('close', () => api.close())
        },
      },
    ],
  }
})
