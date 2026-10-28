import type { Request, Response } from 'express'

import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  clearAuthCookieOptions,
} from '../../config/cookies.js'
import { ApiError } from '../../utils/ApiError.js'
import type { LoginInput, RegisterInput } from './auth.schemas.js'
import { getUserById, loginUser, registerUser } from './auth.service.js'

/**
 * The token is written to the cookie and never to the response body — putting
 * it in JSON would hand it to client-side JavaScript and defeat `httpOnly`.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { user, token } = await registerUser(req.body as RegisterInput)

  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions)
  res.status(201).json({ user })
}

export async function login(req: Request, res: Response): Promise<void> {
  const { user, token } = await loginUser(req.body as LoginInput)

  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions)
  res.status(200).json({ user })
}

/** Idempotent: clearing a cookie that is not there is still a success. */
export function logout(_req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions)
  res.status(204).send()
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw ApiError.unauthorized()
  }

  const user = await getUserById(req.user.id)
  res.status(200).json({ user })
}
