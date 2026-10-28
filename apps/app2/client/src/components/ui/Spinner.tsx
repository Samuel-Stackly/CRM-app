interface SpinnerProps {
  /** Announced to assistive technology; also the visible caption when shown. */
  label?: string
  showLabel?: boolean
}

export function Spinner({ label = 'Loading', showLabel = true }: SpinnerProps) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 text-ink-muted">
      <span
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-line-strong border-t-accent"
      />
      <span className={showLabel ? 'text-sm' : 'sr-only'}>{label}</span>
    </div>
  )
}
