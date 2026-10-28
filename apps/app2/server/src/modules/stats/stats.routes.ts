import { Router, type NextFunction, type Request, type Response } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { getStats } from './stats.service.js'

export const statsRouter: Router = Router()

statsRouter.use(requireAuth)

statsRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json(await getStats())
  } catch (error) {
    next(error)
  }
})
