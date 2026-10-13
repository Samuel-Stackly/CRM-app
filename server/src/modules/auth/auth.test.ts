import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { User } from '../../models/User.js'

const credentials = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  password: 'correct-horse',
}

/** Registers a user and returns the Set-Cookie header for reuse. */
async function registerAndGetCookie(): Promise<string[]> {
  const response = await request(app).post('/api/auth/register').send(credentials)
  expect(response.status).toBe(201)
  return response.get('Set-Cookie') ?? []
}

describe('POST /api/auth/register', () => {
  it('creates a user, sets an httpOnly cookie and never returns the hash', async () => {
    const response = await request(app).post('/api/auth/register').send(credentials)

    expect(response.status).toBe(201)
    expect(response.body.user).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })
    expect(response.body.user.id).toBeTypeOf('string')

    // The hash must not appear anywhere in the response.
    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
    expect(JSON.stringify(response.body)).not.toContain('$2b$')

    const cookies = response.get('Set-Cookie') ?? []
    const authCookie = cookies.find((cookie) => cookie.startsWith('token='))
    expect(authCookie).toBeDefined()
    expect(authCookie).toContain('HttpOnly')
    expect(authCookie).toContain('Path=/')
    // The token belongs in the cookie only, never in the JSON body.
    expect(response.body).not.toHaveProperty('token')
  })

  it('stores a bcrypt hash rather than the plain-text password', async () => {
    await request(app).post('/api/auth/register').send(credentials)

    const stored = await User.findOne({ email: credentials.email }).select('+passwordHash')
    expect(stored).not.toBeNull()
    expect(stored?.passwordHash).not.toBe(credentials.password)
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/)
  })

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(credentials)

    const response = await request(app).post('/api/auth/register').send(credentials)

    expect(response.status).toBe(409)
    expect(response.body.error.message).toBe('An account with that email already exists')
  })

  it('treats differently-cased emails as the same account', async () => {
    await request(app).post('/api/auth/register').send(credentials)

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, email: '  ADA@Example.COM  ' })

    expect(response.status).toBe(409)
  })

  it('rejects an invalid body with 400 and field details', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: '', email: 'not-an-email', password: 'short' })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Validation failed')
    const paths = response.body.error.details.map((d: { path: string }) => d.path)
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']))
  })

  it('rejects unknown keys so a client cannot set its own passwordHash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...credentials, passwordHash: 'injected' })

    expect(response.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('authenticates valid credentials and sets the cookie', async () => {
    await request(app).post('/api/auth/register').send(credentials)

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password })

    expect(response.status).toBe(200)
    expect(response.body.user.email).toBe('ada@example.com')

    const authCookie = (response.get('Set-Cookie') ?? []).find((c) => c.startsWith('token='))
    expect(authCookie).toContain('HttpOnly')
  })

  it('returns a generic 401 for a wrong password', async () => {
    await request(app).post('/api/auth/register').send(credentials)

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })

    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Invalid email or password')
    expect(response.get('Set-Cookie')).toBeUndefined()
  })

  it('returns the identical 401 for an unknown email, so accounts cannot be enumerated', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'correct-horse' })

    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Invalid email or password')
  })

  it('does not apply the registration password policy to login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'tiny' })

    // 401, not 400 — a short password is wrong, not malformed.
    expect(response.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the cookie with matching attributes', async () => {
    const response = await request(app).post('/api/auth/logout')

    expect(response.status).toBe(204)

    const cleared = (response.get('Set-Cookie') ?? []).find((c) => c.startsWith('token='))
    expect(cleared).toBeDefined()
    expect(cleared).toContain('HttpOnly')
    expect(cleared).toContain('Path=/')
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/)
  })

  it('is idempotent without a session', async () => {
    await request(app).post('/api/auth/logout').expect(204)
    await request(app).post('/api/auth/logout').expect(204)
  })
})

describe('GET /api/auth/me', () => {
  it('restores the session from the cookie', async () => {
    const cookie = await registerAndGetCookie()

    const response = await request(app).get('/api/auth/me').set('Cookie', cookie)

    expect(response.status).toBe(200)
    expect(response.body.user).toMatchObject({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    })
    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
  })

  it('returns 401 without a cookie', async () => {
    const response = await request(app).get('/api/auth/me')

    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Unauthorized')
  })

  it('returns 401 for a malformed or tampered token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['token=not-a-real-jwt'])

    expect(response.status).toBe(401)
  })

  it('returns 401 for a token signed with a different secret', async () => {
    const jwt = (await import('jsonwebtoken')).default
    const forged = jwt.sign({}, 'a-completely-different-secret', {
      subject: '6711a2b3c4d5e6f701234567',
      expiresIn: '7d',
    })

    const response = await request(app).get('/api/auth/me').set('Cookie', [`token=${forged}`])

    expect(response.status).toBe(401)
  })

  it('returns 401 when the token names a user that no longer exists', async () => {
    const cookie = await registerAndGetCookie()
    await User.deleteMany({})

    const response = await request(app).get('/api/auth/me').set('Cookie', cookie)

    expect(response.status).toBe(401)
  })

  it('rejects the session after logout', async () => {
    const cookie = await registerAndGetCookie()
    await request(app).get('/api/auth/me').set('Cookie', cookie).expect(200)

    const logout = await request(app).post('/api/auth/logout').set('Cookie', cookie)
    const cleared = logout.get('Set-Cookie') ?? []

    // The browser would now hold an empty token cookie.
    const response = await request(app).get('/api/auth/me').set('Cookie', cleared)
    expect(response.status).toBe(401)
  })
})
