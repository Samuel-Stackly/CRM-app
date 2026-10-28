import type { DealStage } from '../../../types/models'

import styles from './StageChip.module.css'

const TONE: Partial<Record<DealStage, string>> = {
  Won: styles.won,
  Lost: styles.lost,
}

export function StageChip({ stage }: { stage: DealStage }) {
  return <span className={`${styles.chip} ${TONE[stage] ?? ''}`}>{stage}</span>
}
