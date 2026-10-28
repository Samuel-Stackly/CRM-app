import styles from './Skeleton.module.css'

/** Placeholder block sized to the content it stands in for. */
export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: string }) {
  return <span className={styles.skeleton} style={{ height, width, display: 'block' }} />
}

/** Several rows, for a list that is still loading. */
export function SkeletonRows({ rows = 3, height = 40 }: { rows?: number; height?: number }) {
  return (
    <div className={styles.stack} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={height} />
      ))}
    </div>
  )
}
