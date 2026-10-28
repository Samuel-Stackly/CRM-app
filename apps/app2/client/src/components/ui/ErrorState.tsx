import { Button } from './Button'
import { Icon } from './Icon'

interface ErrorStateProps {
  /** Defaults to a generic message; pass the server's when there is one. */
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'Something went wrong while loading this.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-accent-red/10 text-accent-red">
        <Icon name="alert" className="size-5" />
      </span>
      <p className="max-w-sm text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
