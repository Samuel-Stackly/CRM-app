import type { PaginationMeta } from '../../types/models'

import styles from './Pagination.module.css'

interface PaginationProps {
  pagination: PaginationMeta
  onChange: (page: number) => void
}

/**
 * Page controls for a list screen.
 *
 * The design uses a "Load More" pill, which appends and cannot be restored from
 * a single `page` value on refresh. The brief requires server-side pagination
 * whose state survives a reload, so the designed pill shape is kept while the
 * behaviour is prev/next against the URL. See docs/API.md §8.1.
 */
export function Pagination({ pagination, onChange }: PaginationProps) {
  const { page, totalPages, hasNextPage, hasPrevPage } = pagination

  if (totalPages <= 1) return null

  return (
    <nav className={styles.bar} aria-label="Pagination">
      <button
        type="button"
        className={styles.pill}
        onClick={() => onChange(page - 1)}
        disabled={!hasPrevPage}
      >
        Previous
      </button>

      <span className={styles.status} aria-live="polite">
        Page {page} of {totalPages}
      </span>

      <button
        type="button"
        className={styles.pill}
        onClick={() => onChange(page + 1)}
        disabled={!hasNextPage}
      >
        Next
      </button>
    </nav>
  )
}
