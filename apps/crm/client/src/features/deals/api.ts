import { http } from '../../services/http'
import type { Customer, Deal, DealStage, Paginated, Task } from '../../types/models'

export interface DealListParams {
  stage?: string
  customer?: string
  search?: string
  sort?: string
  page?: number
  limit?: number
}

export interface DealPayload {
  title: string
  value: number
  stage: DealStage
  expectedCloseDate?: string
  customer: string
}

export interface DealBoardColumn {
  stage: DealStage
  count: number
  totalValue: number
  deals: Deal[]
}

export interface StageOption {
  value: DealStage
  label: string
  open: boolean
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 0) continue
    query.set(key, String(value))
  }

  const serialised = query.toString()
  return serialised ? `?${serialised}` : ''
}

export const dealsApi = {
  /** The five stages, so the client never hardcodes stage strings. */
  stages: (signal?: AbortSignal) => http.get<{ stages: StageOption[] }>('/deals/stages', { signal }),

  list: (params: DealListParams, signal?: AbortSignal) =>
    http.get<Paginated<Deal>>(
      `/deals${toQuery({
        stage: params.stage,
        customer: params.customer,
        search: params.search,
        sort: params.sort,
        page: params.page && params.page > 1 ? params.page : undefined,
        limit: params.limit,
      })}`,
      { signal },
    ),

  /** Pipeline board: every stage as its own column, with totals. */
  board: (params: Pick<DealListParams, 'customer' | 'search' | 'sort'>, signal?: AbortSignal) =>
    http.get<{ stages: DealBoardColumn[] }>(
      `/deals${toQuery({ ...params, groupBy: 'stage' })}`,
      { signal },
    ),

  get: (id: string, signal?: AbortSignal) => http.get<Deal>(`/deals/${id}`, { signal }),

  create: (payload: DealPayload) => http.post<Deal>('/deals', payload),

  update: (id: string, payload: Partial<DealPayload>) =>
    http.patch<Deal>(`/deals/${id}`, payload),

  remove: (id: string) => http.delete<void>(`/deals/${id}`),

  /** Customers for the picker — the real list endpoint, searchable. */
  customers: (search: string, signal?: AbortSignal) =>
    http.get<Paginated<Customer>>(`/customers${toQuery({ search, limit: 20 })}`, { signal }),

  /**
   * Tasks linked to this deal.
   *
   * The design's right rail shows an Activity Log, but the assignment defines
   * no activity entity and the API exposes none. Related tasks are the nearest
   * real equivalent. See the note in docs/DESIGN_SPEC.md §8.6 (C7).
   */
  tasks: (dealId: string, signal?: AbortSignal) =>
    http.get<Paginated<Task>>(`/tasks${toQuery({ deal: dealId, sort: 'dueDate', limit: 5 })}`, {
      signal,
    }),
}
