import request from 'supertest'
import { expect } from 'vitest'

import { app } from '../app.js'

export interface TestUser {
  cookie: string[]
  id: string
  email: string
}

/** Registers a user and returns their session cookie. */
export async function createUser(email = 'ada@example.com'): Promise<TestUser> {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password: 'correct-horse' })

  expect(response.status).toBe(201)

  return {
    cookie: response.get('Set-Cookie') ?? [],
    id: response.body.user.id as string,
    email,
  }
}

/** Registers two separate accounts, for cross-user isolation tests. */
export async function createTwoUsers(): Promise<[TestUser, TestUser]> {
  return [await createUser('userA@example.com'), await createUser('userB@example.com')]
}

export async function createCustomer(
  user: TestUser,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await request(app)
    .post('/api/customers')
    .set('Cookie', user.cookie)
    .send({ name: 'Deanna Annis', ...overrides })

  expect(response.status).toBe(201)
  return response.body as Record<string, unknown>
}

export async function createDeal(
  user: TestUser,
  customerId: string,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await request(app)
    .post('/api/deals')
    .set('Cookie', user.cookie)
    .send({ title: 'Office fit-out', value: 6000, customer: customerId, ...overrides })

  expect(response.status).toBe(201)
  return response.body as Record<string, unknown>
}

/** Due dates relative to now, for overdue tests. */
export const daysFromNow = (days: number): string =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

export async function createTask(
  user: TestUser,
  overrides: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await request(app)
    .post('/api/tasks')
    .set('Cookie', user.cookie)
    .send({ title: 'Send revised quote', dueDate: daysFromNow(3), ...overrides })

  expect(response.status).toBe(201)
  return response.body as Record<string, unknown>
}
