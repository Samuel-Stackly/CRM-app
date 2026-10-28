import { useCallback } from 'react'

import { useAsync } from '../../hooks/useAsync'
import type { Customer, Deal, Task } from '../../types/models'
import { dashboardApi, type DashboardSummary } from './api'

export interface DashboardData {
  summary: DashboardSummary
  recentDeals: Deal[]
  /** Soonest deal whose expected close date is still ahead, if any. */
  nextAppointment: Deal | undefined
  openTasks: Task[]
  recentCustomers: Customer[]
  /** Derived from the stage breakdown — the API exposes no separate total. */
  totalDeals: number
}

/**
 * Loads everything the dashboard renders, in parallel.
 *
 * The metrics come from the aggregation endpoint; the three lists come from the
 * existing list endpoints. Nothing is fabricated and nothing is computed from
 * placeholder data.
 */
export function useDashboard() {
  // Memoised so useAsync treats it as one query; an inline function would be a
  // new fetcher on every render and request in a loop.
  const fetcher = useCallback(async (signal: AbortSignal): Promise<DashboardData> => {
    const [summary, recentDeals, upcomingDeals, openTasks, recentCustomers] = await Promise.all([
      dashboardApi.summary(signal),
      dashboardApi.recentDeals(signal),
      dashboardApi.upcomingDeals(signal),
      dashboardApi.openTasks(signal),
      dashboardApi.recentCustomers(signal),
    ])

    const now = Date.now()

    return {
      summary,
      recentDeals: recentDeals.data,
      // The deals endpoint has no "future only" filter, so the soonest upcoming
      // one is picked from the earliest-dated page.
      nextAppointment: upcomingDeals.data.find(
        (deal) => deal.expectedCloseDate !== null && Date.parse(deal.expectedCloseDate) >= now,
      ),
      openTasks: openTasks.data,
      recentCustomers: recentCustomers.data,
      totalDeals: summary.pipelineByStage.reduce((sum, stage) => sum + stage.count, 0),
    }
  }, [])

  return useAsync<DashboardData>(fetcher)
}
