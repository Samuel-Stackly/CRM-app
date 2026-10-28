import { describe, expect, it } from 'vitest'

import { isAllowedOrigin } from './cors.js'

// env.setup.ts sets CLIENT_URL to http://localhost:5173
describe('CORS allowlist', () => {
  it('allows the configured origin', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true)
  })

  it('allows requests with no Origin header, such as curl or Supertest', () => {
    expect(isAllowedOrigin(undefined)).toBe(true)
  })

  it('tolerates a trailing slash, the usual copy-paste mistake in CLIENT_URL', () => {
    expect(isAllowedOrigin('http://localhost:5173/')).toBe(true)
  })

  it('rejects a different origin', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
  })

  it('rejects a lookalike origin', () => {
    expect(isAllowedOrigin('http://localhost:5174')).toBe(false)
  })
})
