import { http } from '../../services/http'
import type { Customer, CustomerStatus, Deal, Paginated } from '../../types/models'

export interface CustomerListParams {
  search?: string
  status?: string
  sort?: string
  page?: number
  limit?: number
}

export interface CustomerPayload {
  name: string
  company?: string
  email?: string
  phone?: string
  status?: CustomerStatus
  notes?: string
}

function toQuery(params: CustomerListParams): string {
  const query = new URLSearchParams()

  if (params.search) query.set('search', params.search)
  if (params.status) query.set('status', params.status)
  if (params.sort) query.set('sort', params.sort)
  if (params.page && params.page > 1) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))

  const serialised = query.toString()
  return serialised ? `?${serialised}` : ''
}

export const customersApi = {
  list: (params: CustomerListParams, signal?: AbortSignal) =>
    http.get<Paginated<Customer>>(`/customers${toQuery(params)}`, { signal }),

  get: (id: string, signal?: AbortSignal) =>
    http.get<{ customer: Customer }>(`/customers/${id}`, { signal }),

  create: (payload: CustomerPayload) => http.post<Customer>('/customers', payload),

  update: (id: string, payload: Partial<CustomerPayload>) =>
    http.patch<Customer>(`/customers/${id}`, payload),

  remove: (id: string) => http.delete<void>(`/customers/${id}`),

  /**
   * This customer's deals, for the detail screen's right rail.
   *
   * Fetched from the deals endpoint rather than nested in the customer
   * response, which does not carry them yet.
   */
  deals: (customerId: string, signal?: AbortSignal) =>
    http.get<Paginated<Deal>>(`/deals?customer=${customerId}&limit=3&sort=-createdAt`, {
      signal,
    }),
}
