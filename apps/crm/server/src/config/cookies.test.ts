import { describe, expect, it } from 'vitest'

import { buildCookiePolicy } from './cookies.js'

describe('auth cookie policy', () => {
  it('uses SameSite=None with Secure for a cross-site production deployment', () => {
    expect(buildCookiePolicy('https://crm-app-beta-three.vercel.app', true)).toEqual({
      secure: true,
      sameSite: 'none',
    })
  })

  it('still uses SameSite=None when the host forgets NODE_ENV but the client is https', () => {
    // The failure this guards: a Lax cookie is accepted at login and then never
    // sent again, so every protected route 401s with nothing in the logs.
    expect(buildCookiePolicy('https://crm-app-beta-three.vercel.app', false)).toEqual({
      secure: true,
      sameSite: 'none',
    })
  })

  it('uses Lax without Secure for local http development', () => {
    expect(buildCookiePolicy('http://localhost:5173', false)).toEqual({
      secure: false,
      sameSite: 'lax',
    })
  })

  it('honours NODE_ENV=production even behind an http client url', () => {
    expect(buildCookiePolicy('http://localhost:5173', true)).toEqual({
      secure: true,
      sameSite: 'none',
    })
  })
})
