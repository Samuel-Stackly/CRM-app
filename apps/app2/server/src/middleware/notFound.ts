import type { NextFunction, Request, Response } from 'express'

import { ApiError } from '../utils/ApiError.js'

/**
 * Turns an unmatched route into a 404 error.
 *
 * Handing it to `next` rather than responding directly keeps every response
 * body — success and failure alike — shaped by a single place.
 */
export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.notFound())
}
