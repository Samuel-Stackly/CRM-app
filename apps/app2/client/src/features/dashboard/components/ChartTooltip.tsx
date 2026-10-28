interface TooltipEntry {
  name?: string
  value?: number
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipEntry[]
  label?: string
  prefix?: string
}

/**
 * Tooltip shared by every chart on the page.
 *
 * Recharts' default is a white box with inline styles, which ignores the theme
 * and goes unreadable in dark mode. This one is built from tokens like
 * everything else. The props are optional because Recharts injects them.
 */
export function ChartTooltip({ active, payload, label, prefix = '' }: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-control bg-ink px-3 py-2 text-xs text-surface shadow-lg">
      {label && <p className="mb-1 opacity-60">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="font-medium tabular-nums">
          {entry.name ? `${entry.name}: ` : ''}
          {prefix}
          {entry.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}
