/** Shapes returned by the API. Kept in step with docs/API.md. */

export interface User {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export const CUSTOMER_STATUSES = ['lead', 'active', 'inactive'] as const
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number]

export interface Customer {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: CustomerStatus
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const DEAL_STAGES = ['Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export interface Deal {
  id: string
  title: string
  value: number
  stage: DealStage
  expectedCloseDate: string | null
  customer: { id: string; name: string; company: string | null } | null
  createdAt: string
  updatedAt: string
}

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string
  priority: TaskPriority
  done: boolean
  /** Derived by the server on every read — never sent by the client. */
  overdue: boolean
  completedAt: string | null
  customer: { id: string; name: string } | null
  deal: { id: string; name: string } | null
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

export interface Paginated<T> {
  data: T[]
  pagination: PaginationMeta
}
