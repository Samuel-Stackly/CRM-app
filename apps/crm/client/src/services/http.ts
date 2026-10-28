/**
 * The single place every API request goes through.
 *
 * Authentication is an httpOnly cookie, so there is no token to attach and
 * nothing to read: the browser sends it because of `credentials: 'include'`.
 * The token is never readable by JavaScript and is never placed in
 * localStorage or sessionStorage.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

/** Field-level message from a validation failure. */
export interface ApiFieldError {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  /** Validation issues keyed by field, for inline form errors. */
  get fieldErrors(): Record<string, string> {
    if (!Array.isArray(this.details)) return {}

    const entries: Record<string, string> = {}
    for (const detail of this.details as ApiFieldError[]) {
      if (detail?.path && !entries[detail.path]) {
        entries[detail.path] = detail.message
      }
    }
    return entries
  }
}

/**
 * Notified whenever a request returns 401.
 *
 * Session expiry is handled in one place rather than by every caller; the auth
 * provider subscribes and sends the user back to login.
 */
type UnauthorizedHandler = () => void
let onUnauthorized: UnauthorizedHandler | undefined

export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
  onUnauthorized = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  /** Set for the session-restore call, which expects 401 and must not redirect. */
  skipUnauthorizedHandler?: boolean
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return undefined
  }

  try {
    return (await response.json()) as unknown
  } catch {
    // A malformed body should not mask the status code.
    return undefined
  }
}

function extractError(payload: unknown): { message?: string; details?: unknown } {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: { message?: string; details?: unknown } }).error
    return { message: error?.message, details: error?.details }
  }
  return {}
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, skipUnauthorizedHandler } = options

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // Sends and receives the auth cookie cross-origin. The default is
      // 'same-origin', which silently omits it and yields a confusing 401.
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    // fetch only rejects on a network-level failure.
    throw new ApiError(0, 'Unable to reach the server. Check your connection.')
  }

  const payload = await parseBody(response)

  if (!response.ok) {
    if (response.status === 401 && !skipUnauthorizedHandler) {
      onUnauthorized?.()
    }

    const { message, details } = extractError(payload)
    throw new ApiError(response.status, message ?? 'Something went wrong', details)
  }

  return payload as T
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
