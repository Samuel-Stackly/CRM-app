import { Router, type NextFunction, type Request, type Response } from 'express'

import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { updateProfileSchema, type UpdateProfileInput } from './user.schemas.js'
import { updateProfile } from './user.service.js'

export const userRouter: Router = Router()

userRouter.use(requireAuth)

userRouter.put(
  '/me',
  validate(updateProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await updateProfile(req.user!.id, req.body as UpdateProfileInput)
      res.status(200).json({ user })
    } catch (error) {
      next(error)
    }
  },
)
