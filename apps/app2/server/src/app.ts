import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './env.js'
import { healthRouter } from './routes/health.routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
  app.use(express.json())
  app.use(cookieParser())

  app.use('/api/health', healthRouter)

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not found' })
  })

  return app
}
