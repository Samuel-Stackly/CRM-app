import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { createProduct, sampleProduct, signIn, type TestSession } from '../../__tests__/helpers.js'

let session: TestSession

beforeEach(async () => {
  session = await signIn()
})

describe('product authentication', () => {
  it('requires a session on every route', async () => {
    const id = await createProduct()

    const responses = await Promise.all([
      request(app).get('/api/products'),
      request(app).post('/api/products').send(sampleProduct),
      request(app).put(`/api/products/${id}`).send(sampleProduct),
      request(app).delete(`/api/products/${id}`),
    ])

    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401])
  })
})

describe('POST /api/products validation', () => {
  it('creates a valid product', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send(sampleProduct)

    expect(response.status).toBe(201)
    expect(response.body.product).toMatchObject({ name: sampleProduct.name, price: 249.99 })
    expect(response.body.product.id).toBeTruthy()
  })

  it('rejects a price of zero', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ ...sampleProduct, price: 0 })

    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body.error.details)).toContain('greater than zero')
  })

  it('rejects a negative price', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ ...sampleProduct, price: -5 })

    expect(response.status).toBe(400)
  })

  it('rejects a negative stock', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ ...sampleProduct, stock: -1 })

    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body.error.details)).toContain('negative')
  })

  it('rejects a fractional stock', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ ...sampleProduct, stock: 2.5 })

    expect(response.status).toBe(400)
    expect(JSON.stringify(response.body.error.details)).toContain('whole number')
  })

  it('rejects a missing name and an unknown category', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ price: 10, stock: 1, category: 'Spaceships' })

    expect(response.status).toBe(400)
    const details = JSON.stringify(response.body.error.details)
    expect(details).toContain('name')
    expect(details).toContain('category')
  })
})

describe('GET /api/products filtering', () => {
  beforeEach(async () => {
    await createProduct({ name: 'Studio Headphones', category: 'Electronics' })
    await createProduct({ name: 'Desk Microphone', category: 'Electronics' })
    await createProduct({ name: 'Merino Crew Jumper', category: 'Apparel' })
  })

  it('searches by name, case-insensitively', async () => {
    const response = await request(app)
      .get('/api/products?search=microphone')
      .set('Cookie', session.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].name).toBe('Desk Microphone')
  })

  it('treats search input as text, not as a regular expression', async () => {
    const response = await request(app)
      .get('/api/products?search=.%2A')
      .set('Cookie', session.cookie)

    // ".*" would match everything if it were compiled as a pattern.
    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(0)
  })

  it('filters by category', async () => {
    const response = await request(app)
      .get('/api/products?category=Apparel')
      .set('Cookie', session.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].category).toBe('Apparel')
  })

  it('rejects an unknown category', async () => {
    const response = await request(app)
      .get('/api/products?category=Spaceships')
      .set('Cookie', session.cookie)

    expect(response.status).toBe(400)
  })

  it('paginates at ten per page', async () => {
    // 3 exist already; add 9 more for 12 in total.
    for (let index = 0; index < 9; index += 1) {
      await createProduct({ name: `Filler ${index}` })
    }

    const first = await request(app).get('/api/products').set('Cookie', session.cookie)
    expect(first.body.data).toHaveLength(10)
    expect(first.body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      total: 12,
      totalPages: 2,
      hasNextPage: true,
      hasPrevPage: false,
    })

    const second = await request(app).get('/api/products?page=2').set('Cookie', session.cookie)
    expect(second.body.data).toHaveLength(2)
    expect(second.body.pagination).toMatchObject({ hasNextPage: false, hasPrevPage: true })
  })
})

describe('PUT and DELETE /api/products/:id', () => {
  it('replaces a product', async () => {
    const id = await createProduct()

    const response = await request(app)
      .put(`/api/products/${id}`)
      .set('Cookie', session.cookie)
      .send({ ...sampleProduct, name: 'Renamed', price: 10, stock: 0 })

    expect(response.status).toBe(200)
    expect(response.body.product).toMatchObject({ id, name: 'Renamed', price: 10, stock: 0 })
  })

  it('validates the body on replace', async () => {
    const id = await createProduct()

    const response = await request(app)
      .put(`/api/products/${id}`)
      .set('Cookie', session.cookie)
      .send({ ...sampleProduct, price: 0 })

    expect(response.status).toBe(400)
  })

  it('returns 404 for a well-formed but unknown id', async () => {
    const response = await request(app)
      .put('/api/products/64b7f1f1f1f1f1f1f1f1f1f1')
      .set('Cookie', session.cookie)
      .send(sampleProduct)

    expect(response.status).toBe(404)
  })

  it('returns 404 for a malformed id rather than 400', async () => {
    const response = await request(app)
      .delete('/api/products/not-an-id')
      .set('Cookie', session.cookie)

    expect(response.status).toBe(404)
  })

  it('deletes a product', async () => {
    const id = await createProduct()

    const remove = await request(app)
      .delete(`/api/products/${id}`)
      .set('Cookie', session.cookie)
    expect(remove.status).toBe(204)

    const list = await request(app).get('/api/products').set('Cookie', session.cookie)
    expect(list.body.data).toHaveLength(0)
  })
})
