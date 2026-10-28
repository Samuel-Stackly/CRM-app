import type { NextFunction, Request, Response } from 'express'
import type { ZodType } from 'zod'

type RequestPart = 'body' | 'query' | 'params'

/**
 * Builds a middleware that parses one part of the request with a Zod schema.
 *
 * The parsed result replaces the raw value, so controllers receive data that is
 * already validated, trimmed and correctly typed. A failure throws ZodError,
 * which the central error handler renders as a 400 with field-level details.
 */
export function validate(schema: ZodType, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part])

    if (!result.success) {
      next(result.error)
      return
    }

    // req.query and req.params are getter-only in Express 5, so assigning
    // directly throws. Redefining the property is the supported way to swap in
    // the parsed value.
    Object.defineProperty(req, part, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    })

    next()
  }
}
