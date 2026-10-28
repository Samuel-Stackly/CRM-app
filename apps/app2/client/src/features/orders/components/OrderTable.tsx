import { StatusPill } from '../../../components/ui/StatusPill'
import { Table, type Column } from '../../../components/ui/Table'
import type { Order, OrderStatus } from '../../../types/models'
import { formatCurrency, formatDateTime } from '../../dashboard/format'
import { STATUS_TONE } from '../orderStatus'
import { OrderStatusSelect } from './OrderStatusSelect'

interface OrderTableProps {
  orders: Order[]
  /** The order whose status update is in flight, if any. */
  updatingId?: string
  onStatusChange: (order: Order, status: OrderStatus) => void
}

/** "3 items" plus the names, so the detail is available without a detail page. */
function describeItems(order: Order): { count: string; names: string } {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  return {
    count: `${count} ${count === 1 ? 'item' : 'items'}`,
    names: order.items.map((item) => `${item.quantity}x ${item.name}`).join(', '),
  }
}

export function OrderTable({ orders, updatingId, onStatusChange }: OrderTableProps) {
  const columns: Column<Order>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (order) => {
        const items = describeItems(order)
        return (
          <div className="min-w-0">
            <p className="truncate font-medium">#{order.orderNo}</p>
            {/* Below sm the dedicated columns are hidden, so the essentials
                collapse into this cell rather than disappearing. */}
            <p className="truncate text-xs text-ink-muted sm:hidden">
              {order.customerName} · {formatCurrency(order.total)}
            </p>
            <p className="truncate text-xs text-ink-muted sm:hidden" title={items.names}>
              {items.count}
            </p>
          </div>
        )
      },
    },
    {
      key: 'customer',
      header: 'Customer',
      hideOnMobile: true,
      render: (order) => (
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-fill text-xs font-medium text-ink-muted"
          >
            {order.customerName.charAt(0)}
          </span>
          <span className="truncate">{order.customerName}</span>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      hideOnMobile: true,
      render: (order) => {
        const items = describeItems(order)
        return (
          <span className="text-ink-muted" title={items.names}>
            {items.count}
          </span>
        )
      },
    },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (order) => (
        <span className="text-ink-muted">{formatDateTime(order.createdAt)}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      numeric: true,
      hideOnMobile: true,
      render: (order) => formatCurrency(order.total),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => (
        <div className="flex items-center justify-end gap-2 sm:justify-start">
          {/* The pill carries the colour the design uses; the select is how the
              status is changed. Below sm the two together overflow the column,
              and the select already shows the status as text, so the pill is
              the one that gives way. */}
          <span className="hidden sm:inline-flex">
            <StatusPill tone={STATUS_TONE[order.status]}>{order.status}</StatusPill>
          </span>
          <OrderStatusSelect
            order={order}
            busy={updatingId === order.id}
            onChange={(status) => onStatusChange(order, status)}
          />
        </div>
      ),
    },
  ]

  return (
    <Table caption="Orders" columns={columns} rows={orders} rowKey={(order) => order.id} />
  )
}
