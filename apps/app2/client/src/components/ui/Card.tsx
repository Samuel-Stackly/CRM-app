import type { ReactNode } from 'react'

/** Accent colours a card heading can take, matching the SnowUI export. */
export type CardAccent = 'accent' | 'purple' | 'green' | 'red' | 'teal' | 'ink'

const ACCENT_CLASS: Record<CardAccent, string> = {
  accent: 'text-accent',
  purple: 'text-accent-purple',
  green: 'text-accent-green',
  red: 'text-accent-red',
  teal: 'text-accent-teal',
  ink: 'text-ink',
}

interface CardProps {
  title?: string
  accent?: CardAccent
  action?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * The surface every dashboard panel sits on.
 *
 * SnowUI gives each panel a coloured heading — blue for device traffic, green
 * for location, red for product, teal for the table — which is why the accent
 * is a prop rather than a fixed style.
 */
export function Card({ title, accent = 'ink', action, children, className = '' }: CardProps) {
  return (
    <section
      className={`rounded-card bg-surface p-6 ${className}`}
    >
      {(title || action) && (
        <header className="mb-5 flex items-center justify-between gap-4">
          {title && (
            <h2 className={`text-sm font-semibold ${ACCENT_CLASS[accent]}`}>{title}</h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
