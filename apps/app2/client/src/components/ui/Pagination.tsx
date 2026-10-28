import { Button } from './Button'
import { Icon } from './Icon'

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

interface PaginationProps {
  meta: PaginationMeta
  onPageChange: (page: number) => void
}

/**
 * Page control for server-side pagination.
 *
 * Takes the server's own metadata rather than recomputing page counts from a
 * total, so the control and the query can never disagree about how many pages
 * there are. Renders nothing for a single page — a lone "1 of 1" is noise.
 */
export function Pagination({ meta, onPageChange }: PaginationProps) {
  if (meta.totalPages <= 1) return null

  const first = (meta.page - 1) * meta.limit + 1
  const last = Math.min(meta.page * meta.limit, meta.total)

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-4"
    >
      <p className="text-xs text-ink-muted">
        {first}–{last} of {meta.total}
      </p>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          disabled={!meta.hasPrevPage}
          onClick={() => onPageChange(meta.page - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" className="size-4" />
        </Button>

        <span className="text-xs text-ink-muted" aria-current="page">
          Page {meta.page} of {meta.totalPages}
        </span>

        <Button
          size="sm"
          variant="ghost"
          disabled={!meta.hasNextPage}
          onClick={() => onPageChange(meta.page + 1)}
          aria-label="Next page"
        >
          <Icon name="chevronRight" className="size-4" />
        </Button>
      </div>
    </nav>
  )
}
