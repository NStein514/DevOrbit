import express from 'express'
import { resolve } from 'node:path'
import { configFromEnv, createApi } from './app.ts'

const app = express()
const config = configFromEnv(process.env)
const api = createApi(config)
app.disable('x-powered-by')
app.use('/api/github', api)
app.use(express.static(resolve('dist')))
app.get('/{*path}', (_req, res) => res.sendFile(resolve('dist/index.html')))
const port = Number(process.env.PORT || 3000)
const server = app.listen(port, process.env.HOST || '127.0.0.1')
server.on('listening', () => console.log(`DevOrbit listening on port ${port}`))
server.on('close', () => api.close())
server.on('error', (error) => {
  console.error(`DevOrbit could not start: ${error.message}`)
  api.close()
  process.exitCode = 1
})
