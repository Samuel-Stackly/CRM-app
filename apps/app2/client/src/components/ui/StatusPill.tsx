/**
 * Status chip.
 *
 * The export shows five states on the table — In Progress, Complete, Pending,
 * Approved, Rejected — each a coloured label on a 10%-alpha wash of the same
 * hue. ShopDesk reuses the five treatments for order states.
 */
export type StatusTone = 'progress' | 'complete' | 'pending' | 'approved' | 'rejected'

const TONE: Record<StatusTone, string> = {
  progress: 'text-accent-purple bg-accent-purple/10',
  complete: 'text-accent-green bg-accent-green/10',
  pending: 'text-accent bg-accent/10',
  approved: 'text-accent-orange bg-accent-orange/10',
  rejected: 'text-ink-muted bg-fill',
}

interface StatusPillProps {
  tone: StatusTone
  children: string
}

export function StatusPill({ tone, children }: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  )
}
