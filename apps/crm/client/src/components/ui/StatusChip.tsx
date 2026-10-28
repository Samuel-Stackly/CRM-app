import type { CustomerStatus } from '../../types/models'

import styles from './StatusChip.module.css'

const TONE: Record<CustomerStatus, string> = {
  lead: '',
  active: styles.active ?? '',
  inactive: styles.inactive ?? '',
}

export function StatusChip({ status }: { status: CustomerStatus }) {
  return <span className={`${styles.chip} ${TONE[status]}`}>{status}</span>
}
