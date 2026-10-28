import request from 'supertest'
import { expect } from 'vitest'

import { app } from '../app.js'
import { Product, type ProductCategory } from '../models/Product.js'
import { User } from '../models/User.js'
import { hashPassword } from '../modules/auth/auth.service.js'

export const TEST_EMAIL = 'admin@shopdesk.dev'
export const TEST_PASSWORD = 'Admin@123'

export interface TestSession {
  cookie: string[]
  userId: string
}

/** Creates the demo account directly, bypassing the (absent) register endpoint. */
export async function createTestUser(
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
): Promise<string> {
  const user = await User.create({
    name: 'ShopDesk Admin',
    email,
    passwordHash: await hashPassword(password),
  })
  return user.id as string
}

/** Creates the account and logs in, returning the session cookie. */
export async function signIn(
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
): Promise<TestSession> {
  const userId = await createTestUser(email, password)

  const response = await request(app).post('/api/auth/login').send({ email, password })
  expect(response.status).toBe(200)

  return { cookie: response.get('Set-Cookie') ?? [], userId }
}

export const sampleProduct: {
  name: string
  category: ProductCategory
  price: number
  stock: number
} = {
  name: 'Studio Headphones',
  category: 'Electronics',
  price: 249.99,
  stock: 12,
}

export async function createProduct(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const product = await Product.create({ ...sampleProduct, ...overrides })
  return product.id as string
}
