import type { NextFunction, Request, Response } from 'express'

import { AUTH_COOKIE_NAME } from '../config/cookies.js'
import { ApiError } from '../utils/ApiError.js'
import { verifyAuthToken } from '../utils/jwt.js'

/**
 * Authenticates the request from the auth cookie.
 *
 * Establishes *who* the caller is and nothing more. Authorization — whether a
 * given record belongs to them — is enforced inside each service query by
 * filtering on `owner`, which cannot be forgotten the way a second middleware
 * could.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token: unknown = req.cookies?.[AUTH_COOKIE_NAME]

  if (typeof token !== 'string' || token.length === 0) {
    next(ApiError.unauthorized())
    return
  }

  const payload = verifyAuthToken(token)

  if (!payload) {
    next(ApiError.unauthorized())
    return
  }

  req.user = { id: payload.sub }
  next()
}
