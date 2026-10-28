/**
 * Client-side mirrors of the API's response shapes.
 *
 * Hand-written rather than shared from the server package: the two apps are
 * deliberately independent (no cross-app imports), so this file is the single
 * place to update if a contract changes. Dates arrive as ISO strings because
 * they have been through JSON.
 */

export const PRODUCT_CATEGORIES = ['Apparel', 'Electronics', 'Home', 'Outdoors'] as const
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number]

export const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
}

export interface Product {
  id: string
  name: string
  category: ProductCategory
  price: number
  stock: number
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  productId: string | null
  name: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  orderNo: string
  customerName: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/** Every list endpoint returns this envelope. */
export interface Paginated<T> {
  data: T[]
  pagination: PaginationMeta
}

export interface DailyOrderPoint {
  /** ISO date, YYYY-MM-DD, in UTC. */
  date: string
  orders: number
  revenue: number
}

export interface Stats {
  totalProducts: number
  totalOrders: number
  /** Sum of `total` across non-cancelled orders. */
  revenue: number
  lowStockCount: number
  dailyOrders: DailyOrderPoint[]
  recentOrders: Order[]
}
