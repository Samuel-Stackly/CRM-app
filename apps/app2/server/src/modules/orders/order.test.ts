import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { Order } from '../../models/Order.js'
import { signIn, type TestSession } from '../../__tests__/helpers.js'

let session: TestSession

async function createOrder(overrides: Record<string, unknown> = {}): Promise<string> {
  const order = await Order.create({
    orderNo: `SD-${Math.floor(Math.random() * 1_000_000)}`,
    customerName: 'Natali Craig',
    items: [{ name: 'Studio Headphones', quantity: 1, price: 249.99 }],
    total: 249.99,
    status: 'Pending',
    ...overrides,
  })
  return order.id as string
}

beforeEach(async () => {
  session = await signIn()
})

describe('GET /api/orders', () => {
  it('requires a session', async () => {
    const response = await request(app).get('/api/orders')
    expect(response.status).toBe(401)
  })

  it('filters by status', async () => {
    await createOrder({ status: 'Pending' })
    await createOrder({ status: 'Delivered' })
    await createOrder({ status: 'Delivered' })

    const response = await request(app)
      .get('/api/orders?status=Delivered')
      .set('Cookie', session.cookie)

    expect(response.status).toBe(200)
    expect(response.body.data).toHaveLength(2)
    expect(response.body.data.every((order: { status: string }) => order.status === 'Delivered')).toBe(true)
  })

  it('rejects an unknown status filter', async () => {
    const response = await request(app)
      .get('/api/orders?status=Exploded')
      .set('Cookie', session.cookie)

    expect(response.status).toBe(400)
  })

  it('returns every order when no filter is given', async () => {
    await createOrder({ status: 'Pending' })
    await createOrder({ status: 'Cancelled' })

    const response = await request(app).get('/api/orders').set('Cookie', session.cookie)

    expect(response.body.data).toHaveLength(2)
    expect(response.body.pagination.total).toBe(2)
  })
})

describe('PATCH /api/orders/:id/status', () => {
  it('moves an order to a valid status', async () => {
    const id = await createOrder({ status: 'Pending' })

    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Cookie', session.cookie)
      .send({ status: 'Shipped' })

    expect(response.status).toBe(200)
    expect(response.body.order.status).toBe('Shipped')
  })

  it('rejects an invalid status', async () => {
    const id = await createOrder()

    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Cookie', session.cookie)
      .send({ status: 'Teleported' })

    expect(response.status).toBe(400)
    expect(response.body.error.message).toBe('Validation failed')
  })

  it('rejects a lowercase variant of a real status', async () => {
    const id = await createOrder()

    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Cookie', session.cookie)
      .send({ status: 'shipped' })

    expect(response.status).toBe(400)
  })

  it('rejects a missing status', async () => {
    const id = await createOrder()

    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .set('Cookie', session.cookie)
      .send({})

    expect(response.status).toBe(400)
  })

  it('returns 404 for an unknown order', async () => {
    const response = await request(app)
      .patch('/api/orders/64b7f1f1f1f1f1f1f1f1f1f1/status')
      .set('Cookie', session.cookie)
      .send({ status: 'Shipped' })

    expect(response.status).toBe(404)
  })

  it('requires a session', async () => {
    const id = await createOrder()

    const response = await request(app)
      .patch(`/api/orders/${id}/status`)
      .send({ status: 'Shipped' })

    expect(response.status).toBe(401)
  })
})
