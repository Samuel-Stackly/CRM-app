import { http } from '../../services/http'
import type { Order, OrderStatus, Paginated } from '../../types/models'

/** The server's own default page size for this endpoint. */
export const ORDERS_PER_PAGE = 10

export interface OrderListQuery {
  status?: string
  page?: number
}

interface OrderResponse {
  order: Order
}

function toQueryString(query: OrderListQuery): string {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  const serialised = params.toString()
  return serialised ? `?${serialised}` : ''
}

export const ordersApi = {
  list: (query: OrderListQuery, signal?: AbortSignal) =>
    http.get<Paginated<Order>>(`/orders${toQueryString(query)}`, { signal }),

  /** PATCH /orders/:id/status with { status }, answering { order }. */
  updateStatus: (id: string, status: OrderStatus) =>
    http.patch<OrderResponse>(`/orders/${id}/status`, { status }),
}
