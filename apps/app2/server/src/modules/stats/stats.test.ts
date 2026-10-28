import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'

import { app } from '../../app.js'
import { Order, type OrderStatus } from '../../models/Order.js'
import { Product } from '../../models/Product.js'
import { signIn, type TestSession } from '../../__tests__/helpers.js'

let session: TestSession

function daysAgo(days: number): Date {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - days)
  date.setUTCHours(12, 0, 0, 0)
  return date
}

async function order(
  total: number,
  status: OrderStatus,
  placedAt = daysAgo(0),
): Promise<void> {
  const document = new Order({
    orderNo: `SD-${Math.floor(Math.random() * 1_000_000)}`,
    customerName: 'Natali Craig',
    items: [{ name: 'Item', quantity: 1, price: total }],
    total,
    status,
  })
  // Backdated so the fourteen-day window can be exercised; timestamps:false
  // stops Mongoose overwriting these with "now" on save.
  document.createdAt = placedAt
  document.updatedAt = placedAt
  await document.save({ timestamps: false })
}

beforeEach(async () => {
  session = await signIn()
})

describe('GET /api/stats', () => {
  it('requires a session', async () => {
    const response = await request(app).get('/api/stats')
    expect(response.status).toBe(401)
  })

  it('excludes cancelled orders from revenue but still counts them as orders', async () => {
    await order(100, 'Delivered')
    await order(50, 'Pending')
    await order(25, 'Shipped')
    await order(999, 'Cancelled')

    const response = await request(app).get('/api/stats').set('Cookie', session.cookie)

    expect(response.status).toBe(200)
    expect(response.body.revenue).toBe(175)
    expect(response.body.totalOrders).toBe(4)
  })

  it('counts low stock at or below the threshold', async () => {
    await Product.create({ name: 'Low', category: 'Home', price: 10, stock: 10 })
    await Product.create({ name: 'Lower', category: 'Home', price: 10, stock: 0 })
    await Product.create({ name: 'Plenty', category: 'Home', price: 10, stock: 11 })

    const response = await request(app).get('/api/stats').set('Cookie', session.cookie)

    expect(response.body.totalProducts).toBe(3)
    expect(response.body.lowStockCount).toBe(2)
  })

  it('returns a zero-filled fourteen-day chart in ascending date order', async () => {
    await order(40, 'Delivered', daysAgo(0))
    await order(60, 'Delivered', daysAgo(3))

    const response = await request(app).get('/api/stats').set('Cookie', session.cookie)
    const chart = response.body.dailyOrders as { date: string; orders: number; revenue: number }[]

    expect(chart).toHaveLength(14)
    const dates = chart.map((point) => point.date)
    expect([...dates].sort()).toEqual(dates)

    expect(chart.at(-1)).toMatchObject({ orders: 1, revenue: 40 })
    expect(chart.at(-4)).toMatchObject({ orders: 1, revenue: 60 })
    // Days with no orders are present at zero rather than absent.
    expect(chart.at(-2)).toMatchObject({ orders: 0, revenue: 0 })
  })

  it('keeps a cancelled order out of that day revenue but in its order count', async () => {
    await order(500, 'Cancelled', daysAgo(1))

    const response = await request(app).get('/api/stats').set('Cookie', session.cookie)
    const chart = response.body.dailyOrders as { orders: number; revenue: number }[]

    expect(chart.at(-2)).toMatchObject({ orders: 1, revenue: 0 })
  })

  it('returns at most the five most recent orders, newest first', async () => {
    for (let index = 0; index < 7; index += 1) {
      await order(10 + index, 'Delivered', daysAgo(index))
    }

    const response = await request(app).get('/api/stats').set('Cookie', session.cookie)
    const recent = response.body.recentOrders as { createdAt: string }[]

    expect(recent).toHaveLength(5)
    const times = recent.map((item) => new Date(item.createdAt).getTime())
    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it('reports zeroes on an empty store rather than failing', async () => {
    const response = await request(app).get('/api/stats').set('Cookie', session.cookie)

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      totalProducts: 0,
      totalOrders: 0,
      revenue: 0,
      lowStockCount: 0,
    })
    expect(response.body.recentOrders).toEqual([])
    expect(response.body.dailyOrders).toHaveLength(14)
  })
})
