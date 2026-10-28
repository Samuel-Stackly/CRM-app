import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

import { isProduction, isTest } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'

interface ErrorBody {
  error: {
    message: string
    details?: unknown
  }
}

interface NormalisedError {
  status: number
  message: string
  details?: unknown
}

/** Shape of a Mongoose CastError, matched structurally so this file needs no mongoose import. */
function isCastError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { name?: unknown }).name === 'CastError'
  )
}

/** Shape of a MongoDB duplicate-key error. */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 11000
  )
}

/**
 * Shape of an `http-errors` instance, which body-parser throws for malformed
 * JSON and oversized payloads. These already carry a safe client-facing status
 * and message; without this branch a bad JSON body would surface as a 500.
 */
function asHttpError(err: unknown): NormalisedError | undefined {
  if (typeof err !== 'object' || err === null) return undefined

  const candidate = err as {
    status?: unknown
    statusCode?: unknown
    expose?: unknown
    message?: unknown
  }
  const status = typeof candidate.status === 'number' ? candidate.status : candidate.statusCode

  if (candidate.expose !== true || typeof status !== 'number') return undefined
  if (status < 400 || status > 499) return undefined

  const message =
    typeof candidate.message === 'string' && candidate.message.length > 0
      ? candidate.message
      : 'Bad request'

  return { status, message }
}

function normalise(err: unknown): NormalisedError {
  if (err instanceof ApiError) {
    return { status: err.status, message: err.message, details: err.details }
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      message: 'Validation failed',
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    }
  }

  // A malformed ObjectId is reported as 404, not 400, so that "not real" and
  // "not well-formed" remain indistinguishable to a caller.
  if (isCastError(err)) {
    return { status: 404, message: 'Not found' }
  }

  if (isDuplicateKeyError(err)) {
    return { status: 409, message: 'Resource already exists' }
  }

  const httpError = asHttpError(err)
  if (httpError) {
    return httpError
  }

  return { status: 500, message: 'Internal server error' }
}

/**
 * Central error handler. Must keep all four parameters: Express identifies
 * error middleware by arity, and dropping `next` silently disables it.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err)
    return
  }

  const { status, message, details } = normalise(err)

  // Unexpected faults are logged in full; handled ones are not worth the noise.
  // Request bodies are never logged, so passwords and tokens cannot leak here.
  if (status >= 500 && !isTest) {
    console.error('[error]', err)
  }

  const body: ErrorBody = { error: { message } }
  if (details !== undefined) {
    body.error.details = details
  }

  // Stack traces are useful locally and must never reach a production client.
  if (!isProduction && status >= 500 && err instanceof Error) {
    body.error.details = { stack: err.stack }
  }

  res.status(status).json(body)
}
