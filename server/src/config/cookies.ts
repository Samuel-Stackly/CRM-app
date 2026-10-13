import type { CookieOptions } from 'express'

import { env, isProduction } from './env.js'

/** Name of the authentication cookie. The JWT lives here and nowhere else. */
export const AUTH_COOKIE_NAME = 'token'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export interface CookiePolicy {
  secure: boolean
  sameSite: 'none' | 'lax'
}

/**
 * Decides the cross-site attributes for the auth cookie.
 *
 * The frontend and API are deployed to different registrable domains, so the
 * cookie is sent cross-site: `sameSite: 'none'` is required or the browser will
 * silently withhold it, and `none` is only honoured together with `secure`.
 * Locally both sides are http://localhost, where `secure` would stop the cookie
 * being stored at all.
 *
 * The decision is taken from the client's scheme as well as NODE_ENV. Relying
 * on NODE_ENV alone means a host that forgets to set it produces a `Lax` cookie
 * that is accepted at login and then never sent again — a silent 401 on every
 * protected route, with nothing in the logs.
 */
export function buildCookiePolicy(clientUrl: string, production: boolean): CookiePolicy {
  const crossSite = production || clientUrl.startsWith('https://')
  return {
    secure: crossSite,
    sameSite: crossSite ? 'none' : 'lax',
  }
}

const policy = buildCookiePolicy(env.CLIENT_URL, isProduction)

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: policy.secure,
  sameSite: policy.sameSite,
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
  secure: policy.secure,
  sameSite: policy.sameSite,
  path: '/',
}
