import { Icon } from './Icon'

/**
 * The two tile treatments in the export.
 *
 * The four tiles alternate: an accent gradient and a neutral one, both running
 * top-left to bottom-right. Which tile gets which is positional in the design,
 * so the variant is a prop rather than something derived from the metric.
 */
export type StatTileVariant = 'accent' | 'neutral'

interface StatTileProps {
  label: string
  value: string
  /** Percentage change against the previous period, e.g. 11.01 or -0.03. */
  change: number
  variant?: StatTileVariant
}

const SURFACE: Record<StatTileVariant, string> = {
  accent: 'bg-linear-to-br from-tile-accent-from to-tile-accent-to',
  neutral: 'bg-linear-to-br from-tile-neutral-from to-tile-neutral-to',
}

export function StatTile({ label, value, change, variant = 'accent' }: StatTileProps) {
  const rising = change >= 0
  const formatted = `${rising ? '+' : ''}${change.toFixed(2)}%`

  return (
    <article className="relative overflow-hidden rounded-card p-5 text-tile-neutral-ink">
      <span aria-hidden="true" className={`absolute inset-0 ${SURFACE[variant]}`} />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium">{label}</h3>
          <Icon
            name={rising ? 'trendUp' : 'trendDown'}
            className="size-4 shrink-0 opacity-80"
          />
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          {/* The sign is already in the text, so the colour is decoration and
              the figure stays readable without it. */}
          <p className="text-xs opacity-80">{formatted}</p>
        </div>
      </div>
    </article>
  )
}
