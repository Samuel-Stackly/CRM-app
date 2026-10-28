import type { Request, Response } from 'express'

import { ApiError } from '../../utils/ApiError.js'
import { getDashboard } from './dashboard.service.js'

export async function summary(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorized()
  }

  res.status(200).json(await getDashboard(req.user.id))
}
