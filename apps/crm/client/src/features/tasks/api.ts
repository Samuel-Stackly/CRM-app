import { http } from '../../services/http'
import type { Customer, Deal, Paginated, Task, TaskPriority } from '../../types/models'

export interface TaskListParams {
  done?: string
  priority?: string
  overdue?: string
  customer?: string
  deal?: string
  search?: string
  sort?: string
  page?: number
}

export interface TaskPayload {
  title: string
  description?: string
  dueDate: string
  priority: TaskPriority
  done?: boolean
  /** null clears an existing link; undefined leaves it untouched. */
  customer?: string | null
  deal?: string | null
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    query.set(key, String(value))
  }

  const serialised = query.toString()
  return serialised ? `?${serialised}` : ''
}

export const tasksApi = {
  list: (params: TaskListParams, signal?: AbortSignal) =>
    http.get<Paginated<Task>>(
      `/tasks${toQuery({
        done: params.done,
        priority: params.priority,
        overdue: params.overdue,
        customer: params.customer,
        deal: params.deal,
        search: params.search,
        sort: params.sort,
        page: params.page && params.page > 1 ? params.page : undefined,
      })}`,
      { signal },
    ),

  create: (payload: TaskPayload) => http.post<Task>('/tasks', payload),

  update: (id: string, payload: Partial<TaskPayload>) =>
    http.patch<Task>(`/tasks/${id}`, payload),

  remove: (id: string) => http.delete<void>(`/tasks/${id}`),

  /** Real options for the link selectors — never a hardcoded list. */
  customers: (signal?: AbortSignal) =>
    http.get<Paginated<Customer>>('/customers?limit=100&sort=name', { signal }),

  deals: (signal?: AbortSignal) =>
    http.get<Paginated<Deal>>('/deals?limit=100&sort=-createdAt', { signal }),
}
