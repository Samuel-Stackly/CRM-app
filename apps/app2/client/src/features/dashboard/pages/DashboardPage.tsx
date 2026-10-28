import { useCallback } from 'react'

import { Card } from '../../../components/ui/Card'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Skeleton } from '../../../components/ui/Skeleton'
import { StatTile } from '../../../components/ui/StatTile'
import { useAsync } from '../../../hooks/useAsync'
import type { Stats } from '../../../types/models'
import { dashboardApi } from '../api'
import { OrdersChart } from '../components/OrdersChart'
import { RecentOrdersTable } from '../components/RecentOrdersTable'
import { RevenueChart } from '../components/RevenueChart'
import { formatCount, formatCurrencyCompact } from '../format'

/**
 * Percentage change across the fourteen-day window.
 *
 * The API reports totals, not deltas, so the trend is derived here by comparing
 * the last seven days with the seven before them. Returns 0 when the earlier
 * half is empty — there is no meaningful percentage change from nothing, and
 * reporting an infinite rise would be worse than reporting none.
 */
function trend(points: { revenue: number; orders: number }[], key: 'revenue' | 'orders'): number {
  if (points.length < 2) return 0

  const middle = Math.floor(points.length / 2)
  const earlier = points.slice(0, middle).reduce((sum, point) => sum + point[key], 0)
  const later = points.slice(middle).reduce((sum, point) => sum + point[key], 0)

  if (earlier === 0) return 0
  return ((later - earlier) / earlier) * 100
}

function LoadingTiles() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-28 rounded-card" />
      ))}
    </div>
  )
}

function Overview({ stats }: { stats: Stats }) {
  const daily = stats.dailyOrders ?? []

  return (
    <>
      <section
        aria-label="Key metrics"
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatTile
          label="Revenue"
          value={formatCurrencyCompact(stats.revenue)}
          change={trend(daily, 'revenue')}
          variant="accent"
        />
        <StatTile
          label="Orders"
          value={formatCount(stats.totalOrders)}
          change={trend(daily, 'orders')}
          variant="neutral"
        />
        <StatTile
          label="Products"
          value={formatCount(stats.totalProducts)}
          change={0}
          variant="accent"
        />
        <StatTile
          label="Low Stock"
          value={formatCount(stats.lowStockCount)}
          change={0}
          variant="neutral"
        />
      </section>

      <Card title="Revenue Trend" accent="purple">
        <RevenueChart data={daily} />
      </Card>

      <Card title="Orders per Day" accent="accent">
        <OrdersChart data={daily} />
      </Card>

      <Card title="Recent Orders" accent="teal">
        <RecentOrdersTable orders={stats.recentOrders ?? []} />
      </Card>
    </>
  )
}

export function DashboardPage() {
  const fetcher = useCallback((signal: AbortSignal) => dashboardApi.stats(signal), [])
  const { status, data, error, reload } = useAsync(fetcher)

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold tracking-tight">Overview</h1>

      {status === 'loading' && (
        <>
          <LoadingTiles />
          <Card>
            <Skeleton className="h-64" />
          </Card>
        </>
      )}

      {status === 'error' && (
        <Card>
          <ErrorState
            message={error?.message ?? 'Could not load your store figures.'}
            onRetry={reload}
          />
        </Card>
      )}

      {status === 'success' && data && <Overview stats={data} />}
    </div>
  )
}
