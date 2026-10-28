import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { User } from '../../models/User.js'
import { signIn, TEST_EMAIL, TEST_PASSWORD, type TestSession } from '../../__tests__/helpers.js'

let session: TestSession

const NEW_PASSWORD = 'BrandNewPass1'

beforeEach(async () => {
  session = await signIn()
})

/** Reads the stored hash, which is `select: false` by default. */
async function storedHash(userId: string): Promise<string> {
  const user = await User.findById(userId).select('+passwordHash')
  return user!.passwordHash
}

describe('PUT /api/users/me', () => {
  it('requires a session', async () => {
    const response = await request(app).put('/api/users/me').send({ name: 'New Name' })
    expect(response.status).toBe(401)
  })

  it('rejects an empty body', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({})

    expect(response.status).toBe(400)
  })

  it('cannot change another account by passing an id', async () => {
    const other = await User.create({
      name: 'Other Person',
      email: 'other@shopdesk.dev',
      passwordHash: 'placeholder-not-a-real-hash',
    })

    await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ id: other.id, name: 'Hijacked' })

    // The id in the body is ignored: the token decides whose profile is edited.
    const untouched = await User.findById(other.id)
    expect(untouched?.name).toBe('Other Person')
  })
})

describe('name-only updates', () => {
  it('succeeds without a current password', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ name: 'Updated Admin' })

    expect(response.status).toBe(200)
    expect(response.body.user.name).toBe('Updated Admin')
  })

  it('leaves the password untouched', async () => {
    const before = await storedHash(session.userId)

    await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ name: 'Updated Admin' })

    expect(await storedHash(session.userId)).toBe(before)

    // The original password still signs in.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
    expect(login.status).toBe(200)
  })

  it('rejects an empty name', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ name: '   ' })

    expect(response.status).toBe(400)
  })
})

describe('password change — re-authentication', () => {
  it('succeeds with the correct current password', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: TEST_PASSWORD, password: NEW_PASSWORD })

    expect(response.status).toBe(200)

    const hash = await storedHash(session.userId)
    expect(hash.startsWith('$2')).toBe(true)
    expect(hash).not.toBe(NEW_PASSWORD)

    // The new password works and the old one no longer does.
    const withNew = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: NEW_PASSWORD })
    expect(withNew.status).toBe(200)

    const withOld = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
    expect(withOld.status).toBe(401)
  })

  it('rejects an incorrect current password with 401 and a safe message', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: 'not-my-password', password: NEW_PASSWORD })

    expect(response.status).toBe(401)
    expect(response.body.error.message).toBe('Current password is incorrect')
  })

  it('leaves the password unchanged when the current one is wrong', async () => {
    const before = await storedHash(session.userId)

    await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: 'not-my-password', password: NEW_PASSWORD })

    expect(await storedHash(session.userId)).toBe(before)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD })
    expect(login.status).toBe(200)
  })

  it('rejects a missing current password with 400 on that field', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ password: NEW_PASSWORD })

    expect(response.status).toBe(400)
    const details = JSON.stringify(response.body.error.details)
    expect(details).toContain('currentPassword')
    expect(details).toContain('Current password is required')
  })

  it('rejects an empty-string current password', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: '', password: NEW_PASSWORD })

    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body.error.details)).toContain('currentPassword')
  })

  it('never leaves the session able to change a password it cannot prove', async () => {
    // A hijacked cookie is enough to read the profile but not to take it over.
    const read = await request(app).get('/api/auth/me').set('Cookie', session.cookie)
    expect(read.status).toBe(200)

    const takeover = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: 'guessing', password: 'AttackerPass1' })
    expect(takeover.status).toBe(401)
  })

  it('still enforces the new-password policy', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: TEST_PASSWORD, password: 'short' })

    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body.error.details)).toContain('at least 8')
  })

  it('changes the name and the password together', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({
        name: 'Renamed Admin',
        currentPassword: TEST_PASSWORD,
        password: NEW_PASSWORD,
      })

    expect(response.status).toBe(200)
    expect(response.body.user.name).toBe('Renamed Admin')

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: NEW_PASSWORD })
    expect(login.status).toBe(200)
  })
})

describe('response safety', () => {
  it('never returns a password hash on a name update', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ name: 'Updated Admin' })

    expect(JSON.stringify(response.body)).not.toContain('passwordHash')
    expect(response.body.user.passwordHash).toBeUndefined()
  })

  it('never returns a password or hash on a password change', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: TEST_PASSWORD, password: NEW_PASSWORD })

    const body = JSON.stringify(response.body)
    expect(body).not.toContain('passwordHash')
    expect(body).not.toContain('$2b$')
    expect(body).not.toContain(NEW_PASSWORD)
    expect(body).not.toContain(TEST_PASSWORD)
  })

  it('does not echo the submitted passwords in a validation error', async () => {
    const response = await request(app)
      .put('/api/users/me')
      .set('Cookie', session.cookie)
      .send({ currentPassword: 'wrong-secret-value', password: 'short' })

    expect(JSON.stringify(response.body)).not.toContain('wrong-secret-value')
  })
})
