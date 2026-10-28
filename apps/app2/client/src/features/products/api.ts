import { http } from '../../services/http'
import type { Paginated, Product, ProductCategory } from '../../types/models'

/** Fixed by the API contract. */
export const PRODUCTS_PER_PAGE = 10

export interface ProductListQuery {
  search?: string
  category?: string
  page?: number
}

export interface ProductPayload {
  name: string
  category: ProductCategory
  price: number
  stock: number
  imageUrl?: string
}

interface ProductResponse {
  product: Product
}

function toQueryString(query: ProductListQuery): string {
  const params = new URLSearchParams()
  if (query.search) params.set('search', query.search)
  if (query.category) params.set('category', query.category)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  const serialised = params.toString()
  return serialised ? `?${serialised}` : ''
}

export const productsApi = {
  list: (query: ProductListQuery, signal?: AbortSignal) =>
    http.get<Paginated<Product>>(`/products${toQueryString(query)}`, { signal }),

  create: (payload: ProductPayload) => http.post<ProductResponse>('/products', payload),

  // PUT, not PATCH: the API replaces the whole resource, so the form always
  // sends every field.
  update: (id: string, payload: ProductPayload) =>
    http.put<ProductResponse>(`/products/${id}`, payload),

  remove: (id: string) => http.delete<void>(`/products/${id}`),
}
