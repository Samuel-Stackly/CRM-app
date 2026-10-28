import { http } from '../../services/http'
import type { Customer, Deal, DealStage, Paginated, Task } from '../../types/models'

export interface DashboardMetrics {
  totalCustomers: number
  openPipelineValue: number
  dealsWonThisMonth: number
  tasksDueToday: number
  overdueTasks: number
}

export interface PipelineStageSummary {
  stage: DealStage
  count: number
  totalValue: number
}

export interface DashboardSummary {
  metrics: DashboardMetrics
  pipelineByStage: PipelineStageSummary[]
  generatedAt: string
}

export const dashboardApi = {
  /** Aggregated metrics and the pipeline breakdown, in one request. */
  summary: (signal?: AbortSignal) => http.get<DashboardSummary>('/dashboard', { signal }),

  /** Newest deals, for the Recent Deals card. */
  recentDeals: (signal?: AbortSignal) =>
    http.get<Paginated<Deal>>('/deals?limit=4&sort=-createdAt', { signal }),

  /**
   * Deals ordered by expected close date, for the Next Appointment card.
   * A handful are requested so the soonest still-future one can be picked.
   */
  upcomingDeals: (signal?: AbortSignal) =>
    http.get<Paginated<Deal>>('/deals?limit=10&sort=expectedCloseDate', { signal }),

  /** Outstanding tasks, soonest first, for the Tasks To Do card. */
  openTasks: (signal?: AbortSignal) =>
    http.get<Paginated<Task>>('/tasks?done=false&limit=6&sort=dueDate', { signal }),

  /** Newest customers, for the right-rail list. */
  recentCustomers: (signal?: AbortSignal) =>
    http.get<Paginated<Customer>>('/customers?limit=3&sort=-createdAt', { signal }),
}
