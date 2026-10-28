import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { createTestUser, signIn, TEST_EMAIL, TEST_PASSWORD } from '../../__tests__/helpers.js'

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials and sets an httpOnly cookie', async () => {
    await createTestUser()

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })

    expect(response.status).toBe(200)
    expect(response.body.user).toMatchObject({ email: TEST_EMAIL, name: 'ShopDesk Admin' })

    const cookies = response.get('Set-Cookie') ?? []
    expect(cookies.join(';')).toContain('HttpOnly')
  })

  it('never returns the password hash', async () => {
    await createTestUser()

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })

    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('rejects a wrong password with 401', async () => {
    await createTestUser()

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrong-password' })

    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Invalid email or password')
  })

  it('gives an unknown email the same 401 as a wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@shopdesk.dev', password: TEST_PASSWORD })

    expect(response.status).toBe(401)
    // Identical wording: a different message would confirm which emails exist.
    expect(response.body.error.message).toBe('Invalid email or password')
  })

  it('rejects a malformed body with 400 and field details', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Validation failed')
    expect(response.body.error.details).toBeInstanceOf(Array)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the signed-in user', async () => {
    const session = await signIn()

    const response = await request(app).get('/api/auth/me').set('Cookie', session.cookie)

    expect(response.status).toBe(200)
    expect(response.body.user).toMatchObject({ id: session.userId, email: TEST_EMAIL })
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('is protected: 401 without a cookie', async () => {
    const response = await request(app).get('/api/auth/me')
    expect(response.status).toBe(401)
  })

  it('rejects a forged token', async () => {
    const response = await request(app).get('/api/auth/me').set('Cookie', ['token=not-a-jwt'])
    expect(response.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const session = await signIn()

    const response = await request(app).post('/api/auth/logout').set('Cookie', session.cookie)

    expect(response.status).toBe(204)
    expect((response.get('Set-Cookie') ?? []).join(';')).toContain('token=;')
  })
})
