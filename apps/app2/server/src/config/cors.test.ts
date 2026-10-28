import { describe, expect, it } from 'vitest'

import { isOriginAllowed } from './cors.js'

const allowed = new Set(['http://localhost:5174'])

describe('isOriginAllowed', () => {
  describe('with the allowlist enforced', () => {
    const options = { allowAll: false, allowed }

    it('accepts the configured origin', () => {
      expect(isOriginAllowed('http://localhost:5174', options)).toBe(true)
    })

    it('accepts it with a trailing slash', () => {
      expect(isOriginAllowed('http://localhost:5174/', options)).toBe(true)
    })

    it('rejects a different port on the same host', () => {
      // The case that caused repeated CORS failures locally: a Vite dev server
      // that drifted off its configured port is a different origin.
      expect(isOriginAllowed('http://localhost:5175', options)).toBe(false)
    })

    it('rejects an unrelated origin', () => {
      expect(isOriginAllowed('https://evil.example.com', options)).toBe(false)
    })
  })

  describe('with CORS_ALLOW_ALL enabled', () => {
    const options = { allowAll: true, allowed }

    it('accepts any origin, including one not on the list', () => {
      expect(isOriginAllowed('http://localhost:5175', options)).toBe(true)
      expect(isOriginAllowed('https://evil.example.com', options)).toBe(true)
    })
  })

  it('accepts a request with no Origin header in either mode', () => {
    // curl and Supertest send none; so does a same-origin browser request.
    expect(isOriginAllowed(undefined, { allowAll: false, allowed })).toBe(true)
    expect(isOriginAllowed(undefined, { allowAll: true, allowed })).toBe(true)
  })
})
