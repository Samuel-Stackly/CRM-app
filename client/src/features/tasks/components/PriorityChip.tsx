import type { TaskPriority } from '../../../types/models'

import styles from './PriorityChip.module.css'

const TONE: Record<TaskPriority, string> = {
  low: '',
  medium: styles.medium ?? '',
  high: styles.high ?? '',
}

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return <span className={`${styles.chip} ${TONE[priority]}`}>{priority}</span>
}
