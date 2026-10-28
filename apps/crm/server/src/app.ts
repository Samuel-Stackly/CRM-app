import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'

import { corsOptions, rejectDisallowedOrigin } from './config/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { customerRouter } from './modules/customers/customer.routes.js'
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js'
import { dealRouter } from './modules/deals/deal.routes.js'
import { taskRouter } from './modules/tasks/task.routes.js'
import { healthRouter } from './routes/health.routes.js'

/**
 * Express application.
 *
 * Exported without calling `listen()` so tests can mount it with Supertest
 * without binding a port. The listener lives in `server.ts`.
 */
export function createApp(): Express {
  const app = express()

  // Render and Vercel sit behind a proxy; without this, req.secure and the
  // client IP used for rate limiting are both wrong.
  app.set('trust proxy', 1)
  app.disable('x-powered-by')

  // --- Security and cross-origin ------------------------------------------
  app.use(helmet())
  app.use(cors(corsOptions))
  app.use(rejectDisallowedOrigin)

  // --- Request parsing -----------------------------------------------------
  // The limit is deliberate: no endpoint in this API accepts a large payload.
  app.use(express.json({ limit: '10kb' }))
  app.use(express.urlencoded({ extended: true, limit: '10kb' }))
  app.use(cookieParser())

  // --- Routes --------------------------------------------------------------
  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/customers', customerRouter)
  app.use('/api/deals', dealRouter)
  app.use('/api/tasks', taskRouter)
  app.use('/api/dashboard', dashboardRouter)

  // --- Terminal handlers ---------------------------------------------------
  // Order matters: unmatched routes become a 404 error, which the error handler
  // then renders. The error handler must be registered last.
  app.use(notFound)
  app.use(errorHandler)

  return app
}

export const app: Express = createApp()
