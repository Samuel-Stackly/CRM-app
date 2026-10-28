import { Icon, type IconName } from '../../../components/icons/Icon'
import { Card } from '../../../components/ui/Card'
import { Skeleton } from '../../../components/ui/Skeleton'
import styles from './StatCard.module.css'

interface StatCardProps {
  label: string
  value: number | undefined
  icon: IconName
  tone: 'mint' | 'salmon'
  loading?: boolean
}

export function StatCard({ label, value, icon, tone, loading = false }: StatCardProps) {
  const isZero = value === 0

  return (
    <Card className={styles.card}>
      <div>
        <p className={styles.label}>{label}</p>
        {loading ? (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <Skeleton height={44} width="80px" />
          </div>
        ) : (
          <p className={styles.value}>{value ?? 0}</p>
        )}
      </div>

      <span
        className={`${styles.circle} ${isZero && !loading ? styles.zero : styles[tone]}`}
        aria-hidden="true"
      >
        <Icon name={icon} size={30} />
      </span>
    </Card>
  )
}
