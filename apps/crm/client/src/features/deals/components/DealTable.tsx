import { useNavigate } from 'react-router-dom'

import { Icon } from '../../../components/icons/Icon'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { Deal } from '../../../types/models'
import { formatCurrency, formatDate } from '../format'
import { StageChip } from './StageChip'
import styles from './DealTable.module.css'

interface DealTableProps {
  deals: Deal[]
  loading: boolean
  onEdit: (deal: Deal) => void
  onDelete: (deal: Deal) => void
}

export function DealTable({ deals, loading, onEdit, onDelete }: DealTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.state}>
          <SkeletonRows rows={6} height={56} />
        </div>
      </div>
    )
  }

  if (deals.length === 0) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.state}>
          <EmptyState icon="briefcase" message="No deals found." />
        </div>
      </div>
    )
  }

  const open = (id: string) => void navigate(`/deals/${id}`)

  return (
    <div className={styles.wrapper}>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <thead className={styles.head}>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Customer</th>
              <th scope="col">Expected Close</th>
              <th scope="col">Value</th>
              <th scope="col">Stage</th>
              <th scope="col">
                <span className="srOnly">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id} className={styles.row} onClick={() => open(deal.id)}>
                <td className={styles.title}>{deal.title}</td>
                <td>{deal.customer?.name ?? '—'}</td>
                <td>{formatDate(deal.expectedCloseDate)}</td>
                <td className={styles.value}>{formatCurrency(deal.value)}</td>
                <td>
                  <StageChip stage={deal.stage} />
                </td>
                <td>
                  <div
                    className={styles.actions}
                    onClick={(event) => event.stopPropagation()}
                    role="presentation"
                  >
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onEdit(deal)}
                      aria-label={`Edit ${deal.title}`}
                    >
                      <Icon name="pencil" size={18} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconButton} ${styles.danger}`}
                      onClick={() => onDelete(deal)}
                      aria-label={`Delete ${deal.title}`}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.cards}>
        {deals.map((deal) => (
          <button key={deal.id} type="button" className={styles.card} onClick={() => open(deal.id)}>
            <span className={styles.cardMain}>
              <span className={styles.title}>{deal.title}</span>
              <span className={styles.cardMeta}>
                {deal.customer?.name ?? '—'} · {formatCurrency(deal.value)}
              </span>
            </span>
            <StageChip stage={deal.stage} />
          </button>
        ))}
      </div>
    </div>
  )
}
