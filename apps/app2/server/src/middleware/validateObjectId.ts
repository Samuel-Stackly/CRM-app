import type { NextFunction, Request, Response } from 'express'
import { isValidObjectId } from 'mongoose'

import { ApiError } from '../utils/ApiError.js'

/**
 * Rejects a malformed id parameter with 404 rather than 400.
 *
 * A 400 would distinguish "that id is well-formed but not yours" from "that id
 * is not an id at all". Returning 404 for both keeps every not-yours, not-real
 * and not-well-formed case indistinguishable.
 */
export function validateObjectId(param = 'id', resource = 'Resource') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[param]

    if (typeof value !== 'string' || !isValidObjectId(value)) {
      next(ApiError.notFound(`${resource} not found`))
      return
    }

    next()
  }
}
