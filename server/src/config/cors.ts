import type { CorsOptions } from 'cors'
import type { NextFunction, Request, Response } from 'express'

import { env } from './env.js'
import { ApiError } from '../utils/ApiError.js'

/**
 * Normalises an origin for comparison.
 *
 * An Origin header never carries a trailing slash, but `CLIENT_URL` is usually
 * copied from a browser address bar and often does. Without this, the exact
 * match fails and every browser request is rejected with a 403.
 */
function normaliseOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase()
}

/**
 * Exact-origin allowlist. A wildcard origin is invalid for credentialed
 * requests, and the auth cookie makes every authenticated call credentialed.
 *
 * `CLIENT_URL` may list several origins separated by commas, which is how a
 * Vercel preview deployment is allowed alongside production.
 */
const allowlist = new Set<string>(
  env.CLIENT_URL.split(',').map(normaliseOrigin).filter(Boolean),
)

export function isAllowedOrigin(origin: string | undefined): boolean {
  // Same-origin and non-browser clients (curl, Supertest) send no Origin header.
  if (!origin) return true
  return allowlist.has(normaliseOrigin(origin))
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Resolving with `false` omits the CORS headers. Passing an Error here
    // would surface as a 500; the assignment requires a deliberate 403.
    callback(null, isAllowedOrigin(origin))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}

/**
 * Rejects disallowed origins with 403.
 *
 * The cors middleware alone only withholds headers and lets the request through,
 * so the response would otherwise be a normal 200 that the browser merely hides.
 * This runs after cors() so preflight requests are already answered.
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
