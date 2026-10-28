import { useNavigate } from 'react-router-dom'

import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { DealBoardColumn } from '../api'
import { formatCurrency, formatDate } from '../format'
import styles from './DealBoard.module.css'

interface DealBoardProps {
  columns: DealBoardColumn[]
  loading: boolean
}

/**
 * Pipeline board grouped by stage.
 *
 * The API always returns all five columns, including empty ones, so the board
 * never silently drops a stage.
 */
export function DealBoard({ columns, loading }: DealBoardProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className={styles.board}>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className={styles.column}>
            <SkeletonRows rows={3} height={64} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={styles.board}>
      {columns.map((column) => (
        <section key={column.stage} className={styles.column}>
          <header className={styles.columnHead}>
            <span className={styles.stageName}>{column.stage}</span>
            <span className={styles.count}>{column.count}</span>
          </header>
          <p className={styles.total}>{formatCurrency(column.totalValue)}</p>

          {column.deals.length === 0 ? (
            <p className={styles.empty}>No deals</p>
          ) : (
            column.deals.map((deal) => (
              <button
                key={deal.id}
                type="button"
                className={styles.card}
                onClick={() => void navigate(`/deals/${deal.id}`)}
              >
                <span className={styles.cardTitle}>{deal.title}</span>
                <span className={styles.cardMeta}>
                  <span>{deal.customer?.name ?? 'No customer'}</span>
                  <span className={styles.cardValue}>{formatCurrency(deal.value)}</span>
                </span>
                <span className={styles.cardMeta}>
                  <span>{formatDate(deal.expectedCloseDate)}</span>
                </span>
              </button>
            ))
          )}
        </section>
      ))}
    </div>
  )
}
