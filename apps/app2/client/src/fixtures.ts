/**
 * Test fixtures.
 *
 * These exist only for automated tests — the application's runtime path has no
 * mock data in it. Shapes mirror the API's responses exactly.
 */
import type { Order, Product, Stats, User } from './types/models'

export const USER: User = {
  id: 'u1',
  name: 'ShopDesk Admin',
  email: 'admin@shopdesk.dev',
  avatarUrl: null,
}

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Studio Headphones',
    category: 'Electronics',
    price: 249.99,
    stock: 12,
    imageUrl: null,
    createdAt: '2026-06-24T10:00:00.000Z',
    updatedAt: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

export function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    orderNo: 'SD-4001',
    customerName: 'Natali Craig',
    items: [{ productId: 'p1', name: 'Studio Headphones', quantity: 1, price: 249.99 }],
    total: 249.99,
    status: 'Delivered',
    createdAt: '2026-06-24T10:00:00.000Z',
    updatedAt: '2026-06-24T10:00:00.000Z',
    ...overrides,
  }
}

export function stats(overrides: Partial<Stats> = {}): Stats {
  return {
    totalProducts: 30,
    totalOrders: 50,
    revenue: 12_345.67,
    lowStockCount: 4,
    dailyOrders: Array.from({ length: 14 }, (_, index) => ({
      date: `2026-06-${String(index + 1).padStart(2, '0')}`,
      orders: index,
      revenue: index * 100,
    })),
    recentOrders: [order()],
    ...overrides,
  }
}
