import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export type DealView = 'board' | 'list'

export interface DealFilters {
  view: DealView
  stage: string
  search: string
  sort: string
  page: number
  setFilters: (next: Partial<Record<'stage' | 'search' | 'sort' | 'view', string>>) => void
  setPage: (page: number) => void
  reset: () => void
  activeCount: number
}

/**
 * Deal list state, held in the URL so a refresh or a shared link reproduces the
 * same view — including which of the two layouts is showing.
 */
export function useDealFilters(): DealFilters {
  const [searchParams, setSearchParams] = useSearchParams()

  // The design's Deals screen is a table, so that is the default. The pipeline
  // board is the assignment's stage-grouped view and is reached via ?view=board.
  const view: DealView = searchParams.get('view') === 'board' ? 'board' : 'list'
  const stage = searchParams.get('stage') ?? ''
  const search = searchParams.get('search') ?? ''
  const sort = searchParams.get('sort') ?? '-createdAt'
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1

  const setFilters = useCallback(
    (next: Partial<Record<'stage' | 'search' | 'sort' | 'view', string>>) => {
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)

          for (const [key, value] of Object.entries(next)) {
            if (value) params.set(key, value)
            else params.delete(key)
          }

          // A narrowed set rarely has as many pages as the previous one.
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

  return {
    view,
    stage,
    search,
    sort,
    page,
    setFilters,
    setPage,
    reset,
    activeCount: [stage, search].filter(Boolean).length,
  }
}
