import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/ApiError.js'

/**
 * Terminal route matcher. Any request that reaches this point matched no route,
 * so it becomes a 404 travelling through the normal error pipeline rather than
 * Express's default HTML response.
 */
export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}
