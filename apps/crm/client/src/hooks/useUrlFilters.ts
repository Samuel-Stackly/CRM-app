import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Reads and writes list filters through the URL query string.
 *
 * The URL is the single source of truth — no filter value is mirrored in local
 * state — which is what makes a refresh, a copied link and the browser back
 * button all reproduce the same view.
 */
export interface UrlFilters {
  search: string
  status: string
  sort: string
  page: number
  /** Changing a filter resets to page 1 unless `page` itself is being set. */
  setFilters: (next: Partial<Record<'search' | 'status' | 'sort', string>>) => void
  setPage: (page: number) => void
  reset: () => void
  activeCount: number
}

export function useUrlFilters(defaultSort: string): UrlFilters {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const sort = searchParams.get('sort') ?? defaultSort
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1

  const setFilters = useCallback(
    (next: Partial<Record<'search' | 'status' | 'sort', string>>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)

          for (const [key, value] of Object.entries(next)) {
            if (value) params.set(key, value)
            else params.delete(key)
          }

          // A narrowed result set rarely has as many pages, so staying on the
          // old page would strand the user on an empty one.
          params.delete('page')
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current)
        if (nextPage <= 1) params.delete('page')
        else params.set('page', String(nextPage))
        return params
      })
    },
    [setSearchParams],
  )

  const reset = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams])

  const activeCount = useMemo(
    () => [search, status].filter(Boolean).length,
    [search, status],
  )

  return { search, status, sort, page, setFilters, setPage, reset, activeCount }
}
