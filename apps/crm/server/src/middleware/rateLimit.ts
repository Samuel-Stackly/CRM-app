import rateLimit from 'express-rate-limit'

import { isTest } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Throttles the authentication endpoints.
 *
 * Disabled under NODE_ENV=test so that a suite exercising login repeatedly does
 * not trip the limiter and produce misleading failures.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  // Route through the central error handler so the body matches every other
  // error response instead of express-rate-limit's default text.
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many requests, please try again later'))
  },
})
