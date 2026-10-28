import { Router } from 'express'

export const healthRouter: Router = Router()

/**
 * GET /api/health — liveness probe.
 *
 * Public and database-free, so it stays usable as a host health check even when
 * MongoDB is unreachable. Reports no version or environment details.
 */
healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})
