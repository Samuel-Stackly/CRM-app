import { useNavigate } from 'react-router-dom'

import { Avatar } from '../../../components/ui/Avatar'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Skeleton } from '../../../components/ui/Skeleton'
import type { Deal } from '../../../types/models'
import { formatCurrency, formatDateTime } from '../format'
import styles from './NextAppointmentCard.module.css'

interface NextAppointmentCardProps {
  deal: Deal | undefined
  loading: boolean
}

/**
 * The design's "Next Appointment" card.
 *
 * There is no appointment entity in the assignment's data model, so this shows
 * the soonest deal still ahead of its expected close date — the closest real
 * equivalent, and consistent with the supplied empty state offering "Add Deal?".
 */
export function NextAppointmentCard({ deal, loading }: NextAppointmentCardProps) {
  const navigate = useNavigate()

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <h2 className={styles.title}>Next Appointment</h2>
        <span className={styles.dot} aria-hidden="true" />
      </header>

      {loading ? (
        <div className={styles.body}>
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      ) : !deal ? (
        <EmptyState
          icon="calendar"
          message="No upcoming appointments."
          onPrimary
          action={
            <Button className={styles.cta} onClick={() => void navigate('/deals')}>
              Add Deal?
            </Button>
          }
        />
      ) : (
        <div className={styles.body}>
          <div className={styles.identity}>
            <Avatar name={deal.customer?.name ?? deal.title} size={44} />
            <div>
              <p className={styles.name}>{deal.title}</p>
              <p className={styles.sub}>{deal.customer?.name ?? 'No customer'}</p>
            </div>
          </div>

          <div>
            <p className={styles.label}>Expected Close Date</p>
            <p className={styles.strong}>{formatDateTime(deal.expectedCloseDate)}</p>
          </div>

          <div className={styles.stats}>
            <div>
              <p className={styles.label}>Stage</p>
              <p className={styles.strong}>{deal.stage}</p>
            </div>
            <div>
              <p className={styles.label}>Company</p>
              <p className={styles.strong}>{deal.customer?.company ?? '—'}</p>
            </div>
          </div>

          <div className={styles.footer}>
            <div>
              <p className={styles.label}>Value</p>
              <p className={styles.strong}>{formatCurrency(deal.value)}</p>
            </div>
            <Button
              className={styles.cta}
              onClick={() => void navigate(`/deals/${deal.id}`)}
            >
              See Detail
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
