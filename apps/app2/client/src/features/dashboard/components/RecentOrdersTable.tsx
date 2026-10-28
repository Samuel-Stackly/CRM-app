import { EmptyState } from '../../../components/ui/EmptyState'
import { StatusPill } from '../../../components/ui/StatusPill'
import { Table, type Column } from '../../../components/ui/Table'
import type { Order } from '../../../types/models'
import { STATUS_TONE } from '../../orders/orderStatus'
import { formatCurrency, formatDateTime } from '../format'

const COLUMNS: Column<Order>[] = [
  {
    key: 'customer',
    header: 'Customer',
    render: (order) => (
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-7 shrink-0 place-items-center rounded-full bg-fill text-xs font-medium text-ink-muted"
        >
          {order.customerName.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{order.customerName}</p>
          <p className="truncate text-xs text-ink-muted sm:hidden">#{order.orderNo}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'orderNo',
    header: 'Order',
    hideOnMobile: true,
    render: (order) => <span className="text-ink-muted">#{order.orderNo}</span>,
  },
  {
    key: 'placedAt',
    header: 'Date',
    hideOnMobile: true,
    render: (order) => <span className="text-ink-muted">{formatDateTime(order.createdAt)}</span>,
  },
  {
    key: 'total',
    header: 'Amount',
    numeric: true,
    hideOnMobile: true,
    render: (order) => formatCurrency(order.total),
  },
  {
    key: 'status',
    header: 'Status',
    render: (order) => <StatusPill tone={STATUS_TONE[order.status]}>{order.status}</StatusPill>,
  },
]

export function RecentOrdersTable({ orders }: { orders: Order[] }) {
  return (
    <Table
      caption="Most recent orders"
      columns={COLUMNS}
      rows={orders}
      rowKey={(order) => order.id}
      empty={
        <EmptyState
          title="No orders yet"
          description="Orders appear here as soon as your first sale comes in."
        />
      }
    />
  )
}
