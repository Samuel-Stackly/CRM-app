import { useCallback, useState } from 'react'

import { Card } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { ErrorState } from '../../../components/ui/ErrorState'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { useUrlFilters } from '../../../hooks/useUrlFilters'
import { ApiError } from '../../../services/http'
import type { Order, OrderStatus } from '../../../types/models'
import { ordersApi } from '../api'
import { OrderTable } from '../components/OrderTable'
import { OrderToolbar } from '../components/OrderToolbar'

/** The axes this list filters on. Constant so the hook's memo stays stable. */
const FILTER_KEYS = ['status'] as const

export function OrdersPage() {
  const toast = useToast()
  const { values, page, setFilters, setPage, reset, activeCount } = useUrlFilters(FILTER_KEYS)

  const [updatingId, setUpdatingId] = useState<string>()

  const fetcher = useCallback(
    (signal: AbortSignal) => ordersApi.list({ status: values.status, page }, signal),
    [values.status, page],
  )

  const { status, data, error, reload } = useAsync(fetcher)

  // The server returns the updated order, so the row is patched from the
  // response rather than refetching the page — the list does not jump and a
  // status change stays visible even when it no longer matches the filter.
  const [patched, setPatched] = useState<Record<string, Order>>({})

  async function handleStatusChange(order: Order, next: OrderStatus) {
    setUpdatingId(order.id)
    try {
      const response = await ordersApi.updateStatus(order.id, next)
      setPatched((current) => ({ ...current, [order.id]: response.order }))
      toast.success(`Order #${order.orderNo} marked ${next}`)
    } catch (caught) {
      toast.error(
        caught instanceof ApiError ? caught.message : 'Could not update this order.',
      )
    } finally {
      setUpdatingId(undefined)
    }
  }

  const orders = (data?.data ?? []).map((order) => patched[order.id] ?? order)
  const isFiltered = activeCount > 0

  return (
    <div className="flex flex-col gap-5 py-2">
      <h1 className="text-xl font-semibold tracking-tight">Orders</h1>

      <OrderToolbar
        status={values.status}
        onStatusChange={(next) => {
          // A new query replaces the list, so previously patched rows no longer
          // apply and keeping them would shadow the server's answer.
          setPatched({})
          setFilters({ status: next })
        }}
        onClear={() => {
          setPatched({})
          reset()
        }}
        activeCount={activeCount}
      />

      <Card>
        {status === 'loading' && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-11" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <ErrorState
            message={error?.message ?? 'Could not load your orders.'}
            onRetry={reload}
          />
        )}

        {status === 'success' && orders.length === 0 && (
          <EmptyState
            title={isFiltered ? 'No matching orders' : 'No orders yet'}
            description={
              isFiltered
                ? 'Try a different status.'
                : 'Orders appear here as soon as your first sale comes in.'
            }
          />
        )}

        {status === 'success' && orders.length > 0 && (
          <>
            <OrderTable
              orders={orders}
              updatingId={updatingId}
              onStatusChange={handleStatusChange}
            />
            {data && (
              <Pagination
                meta={data.pagination}
                onPageChange={(next) => {
                  setPatched({})
                  setPage(next)
                }}
              />
            )}
          </>
        )}
      </Card>
    </div>
  )
}
