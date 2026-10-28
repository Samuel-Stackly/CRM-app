import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, http, setUnauthorizedHandler } from './http'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.restoreAllMocks()
  setUnauthorizedHandler(undefined)
})

describe('http', () => {
  it('sends credentials so the auth cookie travels cross-origin', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(200, { status: 'ok' }))

    await http.get('/health')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'GET',
      credentials: 'include',
    })
  })

  it('throws ApiError carrying the status and server message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(404, { error: { message: 'Not found' } }),
    )

    await expect(http.get('/products/missing')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      message: 'Not found',
    })
  })

  it('exposes validation details as field errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(400, {
        error: {
          message: 'Validation failed',
          details: [{ path: 'name', message: 'Name is required' }],
        },
      }),
    )

    const error = await http.post('/products', {}).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).fieldErrors).toEqual({ name: 'Name is required' })
  })

  it('notifies the unauthorized handler once on a 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, { error: { message: 'Unauthorized' } }),
    )
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(http.get('/orders')).rejects.toBeInstanceOf(ApiError)

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not notify when the caller opts out', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(401, { error: { message: 'Unauthorized' } }),
    )
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)

    await expect(
      http.get('/auth/me', { skipUnauthorizedHandler: true }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports a network failure as a status-0 ApiError', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(http.get('/health')).rejects.toMatchObject({ status: 0 })
  })
})
