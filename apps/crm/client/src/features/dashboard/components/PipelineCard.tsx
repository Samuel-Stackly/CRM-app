import { Card, CardHeader } from '../../../components/ui/Card'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SkeletonRows } from '../../../components/ui/Skeleton'
import type { PipelineStageSummary } from '../api'
import { formatCurrency } from '../format'
import styles from './PipelineCard.module.css'

interface PipelineCardProps {
  stages: PipelineStageSummary[]
  openPipelineValue: number
  loading: boolean
}

const TONE: Partial<Record<string, string>> = {
  Won: styles.won,
  Lost: styles.lost,
}

/**
 * Pipeline value by stage — the one chart the assignment requires.
 *
 * Bars are scaled against the largest stage so the shape is readable; every
 * stage is rendered even at zero, because the API always returns all five.
 */
export function PipelineCard({ stages, openPipelineValue, loading }: PipelineCardProps) {
  const largest = Math.max(...stages.map((stage) => stage.totalValue), 0)
  const hasAnyDeals = stages.some((stage) => stage.count > 0)

  return (
    <Card>
      <CardHeader title="Pipeline Value by Stage" />

      {loading ? (
        <SkeletonRows rows={5} height={28} />
      ) : !hasAnyDeals ? (
        <EmptyState icon="briefcase" message="No deals in progress." />
      ) : (
        <>
          <div className={styles.list}>
            {stages.map((stage) => (
              <div key={stage.stage} className={styles.row}>
                <div>
                  <p className={styles.stage}>{stage.stage}</p>
                  <p className={styles.count}>
                    {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                  </p>
                </div>

                <div
                  className={styles.track}
                  role="meter"
                  aria-label={`${stage.stage} pipeline value`}
                  aria-valuenow={stage.totalValue}
                  aria-valuemin={0}
                  aria-valuemax={largest}
                >
                  <div
                    className={`${styles.bar} ${TONE[stage.stage] ?? ''}`}
                    style={{
                      width: largest === 0 ? '0%' : `${(stage.totalValue / largest) * 100}%`,
                    }}
                  />
                </div>

                <p className={styles.amount}>{formatCurrency(stage.totalValue)}</p>
              </div>
            ))}
          </div>

          <div className={styles.summary}>
            <span className={styles.count}>Open pipeline value</span>
            <span className={styles.summaryValue}>{formatCurrency(openPipelineValue)}</span>
          </div>
        </>
      )}
    </Card>
  )
}
