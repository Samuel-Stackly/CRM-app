import type { NextFunction, Request, Response } from 'express'

import { AUTH_COOKIE_NAME, authCookieOptions, clearAuthCookieOptions } from '../../config/cookies.js'
import { signAuthToken } from '../../utils/jwt.js'
import type { LoginInput } from './auth.schemas.js'
import * as service from './auth.service.js'

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await service.login(req.body as LoginInput)

    // The token goes in an httpOnly cookie and is never part of the body, so
    // no JavaScript on the page can read it.
    res.cookie(AUTH_COOKIE_NAME, signAuthToken(user.id), authCookieOptions)
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await service.getCurrentUser(req.user!.id)
    res.status(200).json({ user })
  } catch (error) {
    next(error)
  }
}

/**
 * Ends the session.
 *
 * Not in the assignment's endpoint list, but the cookie is httpOnly: without
 * this the client has no way to clear it, and "sign out" would leave a valid
 * token in the browser.
 */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions)
  res.status(204).end()
}
