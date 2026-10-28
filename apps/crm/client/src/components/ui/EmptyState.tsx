import type { ReactNode } from 'react'

import { Icon, type IconName } from '../icons/Icon'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  icon: IconName
  message: string
  /** `center` fills the card; `inline` sits on one line, as the rails do. */
  layout?: 'center' | 'inline'
  /** Only the appointment card carries a call to action in the design. */
  action?: ReactNode
  onPrimary?: boolean
}

export function EmptyState({
  icon,
  message,
  layout = 'center',
  action,
  onPrimary = false,
}: EmptyStateProps) {
  const classes = [
    styles.empty,
    layout === 'center' ? styles.center : styles.inline,
    onPrimary ? styles.onPrimary : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <Icon name={icon} size={layout === 'center' ? 22 : 18} />
      <p>{message}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  )
}
