import { Router } from 'express'

import { authRateLimiter } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import * as controller from './auth.controller.js'
import { loginSchema } from './auth.schemas.js'

export const authRouter: Router = Router()

// Login is the one unauthenticated endpoint in the API, which makes it the one
// worth throttling against credential stuffing.
authRouter.post('/login', authRateLimiter, validate(loginSchema), controller.login)
authRouter.post('/logout', controller.logout)
authRouter.get('/me', requireAuth, controller.me)
