import { Icon } from '../icons/Icon'
import { Button } from './Button'
import styles from './ErrorState.module.css'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.error} role="alert">
      <Icon name="alert" size={24} className={styles.icon} />
      <p className={styles.message}>{message ?? 'Something went wrong.'}</p>
      {onRetry ? (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}
