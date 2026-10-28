/**
 * Operational error carrying an HTTP status.
 *
 * Thrown deliberately by application code and translated into a response by the
 * central error handler. Anything that is NOT an ApiError is treated as an
 * unexpected fault and reported as a generic 500.
 */
export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
    Error.captureStackTrace?.(this, ApiError)
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details)
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message)
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message)
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message)
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message)
  }
}
