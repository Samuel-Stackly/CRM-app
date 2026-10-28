import { Order, REVENUE_STATUSES, toPublicOrder, type PublicOrder } from '../../models/Order.js'
import { LOW_STOCK_THRESHOLD, Product } from '../../models/Product.js'

/** Days of history in the orders chart. */
export const CHART_DAYS = 14

export interface DailyOrderPoint {
  /** ISO date, YYYY-MM-DD, in UTC. */
  date: string
  orders: number
  revenue: number
}

export interface Stats {
  totalProducts: number
  totalOrders: number
  /** Sum of `total` across non-cancelled orders. See REVENUE_STATUSES. */
  revenue: number
  lowStockCount: number
  dailyOrders: DailyOrderPoint[]
  recentOrders: PublicOrder[]
}

/** Midnight UTC, `daysAgo` days back. UTC so the buckets do not shift with the host's zone. */
function startOfUtcDay(daysAgo: number): Date {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - daysAgo)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Builds the dashboard figures.
 *
 * Every count is computed in the database rather than by loading documents and
 * counting in Node — the collections grow without bound and the page would get
 * slower with every order. The five queries run concurrently because none
 * depends on another's result.
 */
export async function getStats(): Promise<Stats> {
  const windowStart = startOfUtcDay(CHART_DAYS - 1)

  const [totalProducts, totalOrders, revenueRows, lowStockCount, dailyRows, recentOrders] =
    await Promise.all([
      Product.countDocuments({}),
      Order.countDocuments({}),

      Order.aggregate<{ revenue: number }>([
        { $match: { status: { $in: REVENUE_STATUSES } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),

      Product.countDocuments({ stock: { $lte: LOW_STOCK_THRESHOLD } }),

      Order.aggregate<{ _id: string; orders: number; revenue: number }>([
        { $match: { createdAt: { $gte: windowStart } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
            orders: { $sum: 1 },
            // A cancelled order still counts as an order placed that day, but
            // contributes nothing to that day's revenue.
            revenue: {
              $sum: {
                $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$total', 0],
              },
            },
          },
        },
      ]),

      Order.find({}).sort({ createdAt: -1 }).limit(5),
    ])

  const byDate = new Map(dailyRows.map((row) => [row._id, row]))

  // Zero-filled so the chart always has CHART_DAYS points: a day with no orders
  // must render as a gap at zero, not be missing from the axis.
  const dailyOrders: DailyOrderPoint[] = Array.from({ length: CHART_DAYS }, (_, index) => {
    const date = toIsoDate(startOfUtcDay(CHART_DAYS - 1 - index))
    const row = byDate.get(date)
    return {
      date,
      orders: row?.orders ?? 0,
      revenue: Math.round((row?.revenue ?? 0) * 100) / 100,
    }
  })

  return {
    totalProducts,
    totalOrders,
    revenue: Math.round((revenueRows[0]?.revenue ?? 0) * 100) / 100,
    lowStockCount,
    dailyOrders,
    recentOrders: recentOrders.map(toPublicOrder),
  }
}
