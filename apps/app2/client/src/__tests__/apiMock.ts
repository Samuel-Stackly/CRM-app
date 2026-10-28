import { vi } from 'vitest'

/** A JSON response shaped like the API's. */
export function json(status: number, body: unknown): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: status === 204 ? undefined : { 'Content-Type': 'application/json' },
  })
}

export interface RouteHandler {
  (url: string, init?: RequestInit): Response | Promise<Response>
}

/**
 * Installs a fetch stub that dispatches on "METHOD /path".
 *
 * Matching on the method and a path fragment keeps each test's expectations
 * readable, and an unmatched call fails loudly rather than returning undefined
 * and surfacing as a confusing parse error.
 */
export function mockApi(routes: Record<string, RouteHandler>) {
  const calls: { method: string; url: string; body?: unknown }[] = []

  const stub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined
    calls.push({ method, url, body })

    for (const [pattern, handler] of Object.entries(routes)) {
      const [patternMethod, patternPath] = pattern.split(' ')
      if (patternMethod === method && url.includes(patternPath!)) {
        return handler(url, init)
      }
    }

    throw new Error(`Unhandled request: ${method} ${url}`)
  })

  vi.stubGlobal('fetch', stub)
  return { calls, stub }
}

export const UNAUTHORIZED = () => json(401, { error: { message: 'Unauthorized' } })
