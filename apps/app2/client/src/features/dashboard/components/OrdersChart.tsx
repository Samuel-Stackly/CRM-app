import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { DailyOrderPoint } from '../../../types/models'
import { formatDayLabel } from '../format'
import { ChartTooltip } from './ChartTooltip'

interface OrdersChartProps {
  data: DailyOrderPoint[]
}

/** Orders placed per day across the API's fourteen-day window. */
export function OrdersChart({ data }: OrdersChartProps) {
  const points = data.map((point) => ({ ...point, label: formatDayLabel(point.date) }))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="label"
            stroke="var(--color-ink-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={12}
          />
          <YAxis
            stroke="var(--color-ink-muted)"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={56}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-fill-subtle)' }} />
          <Bar
            dataKey="orders"
            name="Orders"
            fill="var(--color-accent)"
            radius={4}
            maxBarSize={28}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
