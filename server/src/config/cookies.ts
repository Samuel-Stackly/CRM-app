import type { CookieOptions } from 'express'

import { isProduction } from './env.js'

/** Name of the authentication cookie. The JWT lives here and nowhere else. */
export const AUTH_COOKIE_NAME = 'token'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Attributes for the auth cookie.
 *
 * The frontend (Vercel) and API (Render) are separate origins, so in production
 * the cookie is cross-site: `sameSite: 'none'` is required or the browser will
 * not send it, and `sameSite: 'none'` is only honoured together with `secure`.
 * Locally both sides are http://localhost, where `secure` would prevent the
 * cookie being stored at all — hence the split.
 */
export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: SEVEN_DAYS_MS,
}

/**
 * Attributes used when clearing the cookie.
 *
 * A browser only removes a cookie when the clearing attributes match those it
 * was set with. `maxAge` is omitted because `clearCookie` sets its own expiry;
 * leaving it in would re-assert a lifetime on the deletion.
 */
export const clearAuthCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
}
