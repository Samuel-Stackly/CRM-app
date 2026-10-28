import type { CorsOptions } from 'cors'
import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/ApiError.js'
import { env } from './env.js'

/**
 * Normalises an origin for comparison.
 *
 * An Origin header never carries a trailing slash, but CLIENT_URL is usually
 * copied from a browser address bar and often does. Without this, the exact
 * match fails and every browser request is rejected.
 */
function normaliseOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase()
}

/**
 * Exact-origin allowlist. A wildcard origin is invalid for credentialed
 * requests, and the auth cookie will make every authenticated call credentialed.
 */
const allowlist = new Set<string>(
  env.CLIENT_URL.split(',').map(normaliseOrigin).filter(Boolean),
)

/**
 * Allowlist decision, independent of configuration.
 *
 * Separated from the env-bound wrapper so both modes can be unit-tested; the
 * env is read once at import, so a test cannot otherwise flip it.
 */
export function isOriginAllowed(
  origin: string | undefined,
  options: { allowAll: boolean; allowed: ReadonlySet<string> },
): boolean {
  // Same-origin and non-browser clients (curl, Supertest) send no Origin header.
  if (!origin) return true

  // CORS_ALLOW_ALL short-circuits the allowlist. The origin is still echoed
  // back rather than answered with `*`, because a wildcard is invalid on a
  // credentialed request and the browser would reject it.
  if (options.allowAll) return true

  return options.allowed.has(normaliseOrigin(origin))
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  return isOriginAllowed(origin, { allowAll: env.CORS_ALLOW_ALL, allowed: allowlist })
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Resolving with `false` omits the CORS headers. Passing an Error here
    // would surface as a 500; a disallowed origin deserves a deliberate 403.
    callback(null, isAllowedOrigin(origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}

/**
 * Rejects disallowed origins with 403.
 *
 * The cors middleware alone only withholds headers and lets the request
 * through, so the response would otherwise be a normal 200 that the browser
 * merely hides. This runs after cors() so preflight requests are already
 * answered.
 */
export function rejectDisallowedOrigin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!isAllowedOrigin(req.headers.origin)) {
    next(ApiError.forbidden('Origin not allowed by CORS'))
    return
  }
  next()
}
