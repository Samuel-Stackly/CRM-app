import { Link } from 'react-router-dom'

import { Avatar } from '../../../components/ui/Avatar'
import { Card, CardHeader } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { Deal } from '../../../types/models'
import { formatCurrency, formatDate } from '../format'
import styles from './RecentDealsCard.module.css'

interface RecentDealsCardProps {
  deals: Deal[]
  loading: boolean
}

export function RecentDealsCard({ deals, loading }: RecentDealsCardProps) {
  return (
    <Card>
      <CardHeader title="Recent Deals" action={<Link to="/deals">View All</Link>} />

      {loading ? (
        <SkeletonRows rows={4} height={52} />
      ) : deals.length === 0 ? (
        <EmptyState icon="briefcase" message="No deals found." layout="inline" />
      ) : (
        <div className={styles.list}>
          {deals.map((deal) => (
            <article key={deal.id} className={styles.row}>
              <Avatar name={deal.customer?.name ?? deal.title} />
              <div className={styles.main}>
                <p className={styles.title}>{deal.title}</p>
                <p className={styles.sub}>{deal.customer?.name ?? 'No customer'}</p>
              </div>
              <div className={styles.meta}>
                <p className={styles.value}>{formatCurrency(deal.value)}</p>
                <p className={styles.sub}>{formatDate(deal.expectedCloseDate)}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}
