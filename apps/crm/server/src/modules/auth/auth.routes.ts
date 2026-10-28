import { Router } from 'express'

import { authRateLimiter } from '../../middleware/rateLimit.js'
import { requireAuth } from '../../middleware/requireAuth.js'
import { validate } from '../../middleware/validate.js'
import { login, logout, me, register } from './auth.controller.js'
import { loginSchema, registerSchema } from './auth.schemas.js'

export const authRouter: Router = Router()

// The limiter covers the whole router, so any future credential route (such as
// a password reset) is throttled by default rather than by remembering to add it.
authRouter.use(authRateLimiter)

authRouter.post('/register', validate(registerSchema), register)
authRouter.post('/login', validate(loginSchema), login)
authRouter.post('/logout', logout)
authRouter.get('/me', requireAuth, me)
