import jwt from 'jsonwebtoken'

import { env } from '../config/env.js'

/** Claims carried by the auth token. Only the user id — nothing sensitive. */
export interface AuthTokenPayload {
  sub: string
}

export function signAuthToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/**
 * Verifies a token and returns its payload, or `undefined` when the token is
 * missing, malformed, expired or signed with a different secret.
 *
 * Failures are collapsed into a single "not valid" result on purpose: the
 * caller responds with the same 401 either way, so distinguishing them would
 * only risk leaking which part failed.
 */
export function verifyAuthToken(token: string): AuthTokenPayload | undefined {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET)
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
      return undefined
    }
    return { sub: decoded.sub }
  } catch {
    return undefined
  }
}
