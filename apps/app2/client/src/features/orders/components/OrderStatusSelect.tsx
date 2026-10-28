import { Select } from '../../../components/ui/Select'
import { ORDER_STATUSES, type Order, type OrderStatus } from '../../../types/models'

interface OrderStatusSelectProps {
  order: Order
  /** True while this order's update is in flight. */
  busy: boolean
  onChange: (status: OrderStatus) => void
}

/**
 * Inline status changer.
 *
 * Disabled while its own request is in flight, which is what stops a second
 * submission landing before the first has answered. Other rows stay usable —
 * the lock is per order, not per table.
 */
export function OrderStatusSelect({ order, busy, onChange }: OrderStatusSelectProps) {
  return (
    <Select
      label={`Status for order ${order.orderNo}`}
      hideLabel
      value={order.status}
      disabled={busy}
      aria-busy={busy || undefined}
      onChange={(event) => {
        const next = event.target.value as OrderStatus
        // A no-op change would still spend a request and flash a toast.
        if (next !== order.status) onChange(next)
      }}
      options={ORDER_STATUSES.map((status) => ({ value: status, label: status }))}
      className="w-32 sm:w-36"
    />
  )
}
