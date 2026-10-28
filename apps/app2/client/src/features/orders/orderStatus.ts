import type { StatusTone } from '../../components/ui/StatusPill'
import type { OrderStatus } from '../../types/models'

/**
 * Maps the API's four order statuses onto the design's chip treatments.
 *
 * Shared by the orders table and the dashboard's recent-orders card so one
 * status cannot be drawn two different colours in two places.
 */
export const STATUS_TONE: Record<OrderStatus, StatusTone> = {
  Pending: 'pending',
  Shipped: 'progress',
  Delivered: 'complete',
  Cancelled: 'rejected',
}
