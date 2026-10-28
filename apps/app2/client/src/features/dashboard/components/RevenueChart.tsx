import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DailyOrderPoint } from '../../../types/models'
import { formatCompact, formatDayLabel } from '../format'
import { ChartTooltip } from './ChartTooltip'

interface RevenueChartProps {
  data: DailyOrderPoint[]
}

const AXIS = {
  stroke: 'var(--color-ink-muted)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

/**
 * Daily revenue over the API's fourteen-day window.
 *
 * Colours are passed as `var(--color-*)` rather than literals: SVG resolves CSS
 * custom properties, so the chart re-themes with the page without a re-render.
 * Entry animation is off — it is rAF-driven, which left shapes unrendered under
 * headless verification, and it re-ran on every data refresh.
 */
export function RevenueChart({ data }: RevenueChartProps) {
  const points = data.map((point) => ({ ...point, label: formatDayLabel(point.date) }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent-purple)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-accent-purple)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis dataKey="label" {...AXIS} minTickGap={16} />
          <YAxis
            {...AXIS}
            width={56}
            tickFormatter={formatCompact}
          />
          <Tooltip
            content={<ChartTooltip prefix="$" />}
            cursor={{ stroke: 'var(--color-line-strong)' }}
          />

          <Area
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="var(--color-accent-purple)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
