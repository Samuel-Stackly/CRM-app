import type { ReactNode } from 'react'

import { Icon, type IconName } from './Icon'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: IconName
  /** A primary action, such as "Add product". */
  action?: ReactNode
}

/**
 * Shown when a request succeeded and returned nothing.
 *
 * Distinct from ErrorState on purpose: "no results yet" and "we could not load
 * this" need different wording and different actions, and collapsing them
 * leaves the user unsure whether to retry or to add data.
 */
export function EmptyState({ title, description, icon = 'inbox', action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-fill text-ink-muted">
        <Icon name={icon} className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
